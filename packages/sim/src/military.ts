import type { MapDef } from "./map.ts";
import { nextRandom } from "./rng.ts";
import { atWar, type Battle, type GameState, type Unit } from "./state.ts";
import {
  CAPITAL_DEFENSE_BONUS,
  DAMAGE_PER_POINT,
  FLANK_BONUS,
  HEAL_PER_DAY,
  LEVEL_BONUS,
  MAX_HP,
  RETREAT_HP,
  UNIT_TYPES,
} from "./units.ts";

// ---------------------------------------------------------------------------
// Géographie

const edgeCache = new WeakMap<MapDef, Map<number, number>>();

/**
 * Longueur en km du trajet entre deux provinces voisines : moyenne des
 * « diamètres » des deux provinces (racine de la surface). Indépendant de la
 * projection de la carte.
 */
export function edgeKm(map: MapDef, a: number, b: number): number {
  let cache = edgeCache.get(map);
  if (!cache) edgeCache.set(map, (cache = new Map()));
  const key = a < b ? a * 65536 + b : b * 65536 + a;
  let v = cache.get(key);
  if (v === undefined) {
    const ka = map.provinces[a]!.km2,
      kb = map.provinces[b]!.km2;
    v = Math.round((Math.sqrt(ka) + Math.sqrt(kb)) * 5) / 10;
    cache.set(key, v);
  }
  return v;
}

/** Une nation peut entrer chez elle et chez les nations avec qui elle est en guerre. */
export function canEnter(state: GameState, nation: number, province: number): boolean {
  const owner = state.owners[province];
  return owner === nation || (owner !== undefined && atWar(state, nation, owner));
}

/**
 * Chemin le plus court (en km) par voie de terre, sans la province de départ.
 * Renvoie [] si la division y est déjà, null s'il n'y a pas de chemin.
 */
export function findPath(map: MapDef, state: GameState, nation: number, from: number, to: number): number[] | null {
  if (from === to) return [];
  if (!canEnter(state, nation, to)) return null;
  const n = map.provinces.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const heap = new MinHeap();
  dist[from] = 0;
  heap.push(0, from);
  while (heap.size) {
    const [d, p] = heap.pop();
    if (d > dist[p]!) continue;
    if (p === to) break;
    for (const nb of map.provinces[p]!.neighbors) {
      if (!canEnter(state, nation, nb)) continue;
      const nd = d + edgeKm(map, p, nb);
      if (nd < dist[nb]! || (nd === dist[nb]! && p < prev[nb]!)) {
        dist[nb] = nd;
        prev[nb] = p;
        heap.push(nd, nb);
      }
    }
  }
  if (prev[to] === -1) return null;
  const path: number[] = [];
  for (let p = to; p !== from; p = prev[p]!) path.push(p);
  return path.reverse();
}

/** Kilomètres restant à parcourir et nombre de jours estimé. */
export function remainingTrip(map: MapDef, u: Unit): { km: number; days: number } {
  let km = 0;
  let at = u.province;
  for (const p of u.path) {
    km += edgeKm(map, at, p);
    at = p;
  }
  km = Math.max(0, km - u.progress);
  return { km, days: Math.max(1, Math.ceil(km / (u.pace || UNIT_TYPES[u.type]!.speed))) };
}

// ---------------------------------------------------------------------------
// Une journée militaire

/** Ce qui s'est passé dans la journée, pour informer les joueurs. */
export type GameEvent =
  | { type: "war"; attacker: number; target: number }
  | { type: "captured"; province: number; by: number; from: number }
  | { type: "repulsed"; province: number; attackers: number[]; defender: number }
  | { type: "destroyed"; nation: number; unitType: number; num: number; province: number }
  | { type: "retreat"; nation: number; from: number; to: number };

export interface MilitaryResult {
  changed: Set<number>;
  events: GameEvent[];
}

/**
 * Déplacements, combats, replis, soins et occupation pour une journée.
 * Modifie `state` (déjà copié par `step`).
 */
export function runMilitaryDay(state: GameState, map: MapDef, prevBattles: readonly Battle[]): MilitaryResult {
  const changed = new Set<number>();
  const events: GameEvent[] = [];
  const units = state.units;

  // Divisions présentes par province.
  const present = new Map<number, Unit[]>();
  const addTo = (u: Unit) => {
    let l = present.get(u.province);
    if (!l) present.set(u.province, (l = []));
    l.push(u);
  };
  for (const u of units) addTo(u);
  const removeFrom = (u: Unit) => {
    const l = present.get(u.province);
    if (!l) return;
    const i = l.indexOf(u);
    if (i >= 0) l.splice(i, 1);
  };
  const hostileIn = (province: number, nation: number) =>
    (present.get(province) ?? []).filter((v) => v.hp > 0 && atWar(state, nation, v.nation));

  // --- 1. Déplacements (par identifiant croissant).
  const attacks = new Map<number, Unit[]>();
  for (const u of units) {
    const next = u.path[0];
    if (next === undefined) continue;
    if (!canEnter(state, u.nation, next)) {
      halt(u);
      continue;
    }
    const len = edgeKm(map, u.province, next);
    u.progress += u.pace || UNIT_TYPES[u.type]!.speed;
    if (u.progress < len) continue;
    if (hostileIn(next, u.nation).length) {
      // Bloquée à la frontière : elle attaque.
      u.progress = len;
      let l = attacks.get(next);
      if (!l) attacks.set(next, (l = []));
      l.push(u);
      continue;
    }
    removeFrom(u);
    const leftover = u.progress - len;
    u.province = next;
    u.path.shift();
    const after = u.path[0];
    if (after === undefined) halt(u);
    else u.progress = Math.min(leftover, edgeKm(map, next, after) * 0.5);
    addTo(u);
    const owner = state.owners[next]!;
    if (owner !== u.nation && atWar(state, u.nation, owner)) {
      state.owners[next] = u.nation;
      changed.add(next);
      events.push({ type: "captured", province: next, by: u.nation, from: owner });
    }
  }

  // --- 2. Combats (par province croissante).
  const battles: Battle[] = [];
  const fought = new Set<Unit>();
  const targets = [...attacks.keys()].sort((a, b) => a - b);
  const capitals = new Set(Object.values(map.capitals));
  for (const province of targets) {
    const atk = attacks.get(province)!.filter((u) => u.hp > 0);
    if (!atk.length) continue;
    const atkNations = new Set(atk.map((u) => u.nation));
    const def = (present.get(province) ?? []).filter((v) => v.hp > 0 && [...atkNations].some((n) => atWar(state, n, v.nation)));
    if (!def.length) continue;
    for (const u of atk) fought.add(u);
    for (const u of def) fought.add(u);

    const origins = [...new Set(atk.map((u) => u.province))].sort((a, b) => a - b);
    let atkPower = 0,
      defPower = 0;
    for (const u of atk) atkPower += UNIT_TYPES[u.type]!.attack * effectiveness(u);
    for (const u of def) defPower += UNIT_TYPES[u.type]!.defense * effectiveness(u);
    atkPower *= 1 + FLANK_BONUS * (origins.length - 1);
    if (capitals.has(province)) defPower *= 1 + CAPITAL_DEFENSE_BONUS;

    let r = nextRandom(state.rng);
    const r1 = 0.85 + r.value * 0.3;
    r = nextRandom(r.state);
    const r2 = 0.85 + r.value * 0.3;
    state.rng = r.state;

    const toDef = DAMAGE_PER_POINT * atkPower * r1 * armorFactor(def, atk);
    const toAtk = DAMAGE_PER_POINT * defPower * r2 * armorFactor(atk, def);
    for (const u of def) u.hp = round2(u.hp - toDef / def.length);
    for (const u of atk) u.hp = round2(u.hp - toAtk / atk.length);

    // Attaquants épuisés : ils renoncent.
    for (const u of atk) if (u.hp > 0 && u.hp < RETREAT_HP) halt(u);
    if (atk.every((u) => u.hp < RETREAT_HP))
      events.push({ type: "repulsed", province, attackers: [...atkNations].sort((a, b) => a - b), defender: def[0]!.nation });
    // Défenseurs épuisés : repli vers une province amie libre, sinon destruction (encerclement).
    for (const u of def) {
      if (u.hp <= 0 || u.hp >= RETREAT_HP) continue;
      const dest = retreatTarget(state, map, u, province, origins, attacks, hostileIn);
      if (dest === null) u.hp = 0;
      else {
        removeFrom(u);
        u.province = dest;
        halt(u);
        addTo(u);
        events.push({ type: "retreat", nation: u.nation, from: province, to: dest });
      }
    }

    const prev = prevBattles.find((b) => b.province === province);
    battles.push({
      province,
      from: origins,
      attackers: [...atkNations].sort((a, b) => a - b),
      defender: def[0]!.nation,
      days: prev ? prev.days + 1 : 1,
    });
  }
  state.battles = battles;

  // --- 3. Pertes et soins.
  for (const u of units)
    if (u.hp <= 0) events.push({ type: "destroyed", nation: u.nation, unitType: u.type, num: u.num, province: u.province });
  state.units = units.filter((u) => u.hp > 0);
  for (const u of state.units) if (!fought.has(u)) u.hp = Math.min(MAX_HP, u.hp + HEAL_PER_DAY);

  return { changed, events };
}

/** Arrête une division (fin de trajet, ordre d'arrêt, repli). */
export function halt(u: Unit): void {
  u.path = [];
  u.progress = 0;
  u.pace = 0;
}

/**
 * Remet de l'ordre après des changements de propriétaires (outil de test,
 * capitulation) : divisions des nations vaincues retirées, divisions en
 * territoire neutre renvoyées chez elles, provinces tenues par une armée
 * ennemie sans défenseur occupées.
 */
export function settleUnits(state: GameState, map: MapDef, changed: Set<number>, events: GameEvent[] = []): void {
  state.units = state.units.filter((u) => !state.nations[u.nation]!.defeated);
  const byProvince = new Map<number, Set<number>>();
  for (const u of state.units) {
    if (!canEnter(state, u.nation, u.province)) {
      const home = nearestOwnProvince(state, map, u.nation, u.province);
      if (home === null) {
        u.hp = 0;
        continue;
      }
      u.province = home;
      halt(u);
    }
    let s = byProvince.get(u.province);
    if (!s) byProvince.set(u.province, (s = new Set()));
    s.add(u.nation);
  }
  state.units = state.units.filter((u) => u.hp > 0);
  for (const [p, nations] of [...byProvince].sort((a, b) => a[0] - b[0])) {
    if (nations.size !== 1) continue;
    const n = nations.values().next().value!;
    const owner = state.owners[p]!;
    if (owner !== n && atWar(state, n, owner)) {
      state.owners[p] = n;
      changed.add(p);
      events.push({ type: "captured", province: p, by: n, from: owner });
    }
  }
}

// ---------------------------------------------------------------------------

function effectiveness(u: Unit): number {
  return (u.hp / MAX_HP) * (1 + LEVEL_BONUS * (u.level - 1));
}

/** Réduction des dégâts reçus par `target` grâce à son blindage, selon la capacité antichar de `source`. */
function armorFactor(target: Unit[], source: Unit[]): number {
  let hard = 0,
    pierce = 0;
  for (const u of target) hard += UNIT_TYPES[u.type]!.hardness;
  for (const u of source) pierce += UNIT_TYPES[u.type]!.piercing;
  hard /= target.length;
  pierce /= source.length;
  return 1 - hard * (1 - pierce) * 0.6;
}

function retreatTarget(
  state: GameState,
  map: MapDef,
  u: Unit,
  from: number,
  origins: number[],
  attacks: Map<number, Unit[]>,
  hostileIn: (p: number, n: number) => Unit[],
): number | null {
  const options = map.provinces[from]!.neighbors.filter(
    (nb) => state.owners[nb] === u.nation && !origins.includes(nb) && hostileIn(nb, u.nation).length === 0,
  );
  if (!options.length) return null;
  // De préférence une province qui n'est pas elle-même attaquée.
  return options.find((nb) => !attacks.has(nb)) ?? options[0]!;
}

function nearestOwnProvince(state: GameState, map: MapDef, nation: number, start: number): number | null {
  const seen = new Set([start]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!;
    if (state.owners[p] === nation) return p;
    for (const nb of map.provinces[p]!.neighbors)
      if (!seen.has(nb)) {
        seen.add(nb);
        queue.push(nb);
      }
  }
  const any = state.owners.indexOf(nation);
  return any >= 0 ? any : null;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Tas binaire minimal pour Dijkstra ; à égalité, la plus petite province d'abord. */
class MinHeap {
  private d: number[] = [];
  private p: number[] = [];
  get size() {
    return this.d.length;
  }
  push(dist: number, prov: number) {
    this.d.push(dist);
    this.p.push(prov);
    let i = this.d.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(i, parent)) break;
      this.swap(i, parent);
      i = parent;
    }
  }
  pop(): [number, number] {
    const top: [number, number] = [this.d[0]!, this.p[0]!];
    const ld = this.d.pop()!,
      lp = this.p.pop()!;
    if (this.d.length) {
      this.d[0] = ld;
      this.p[0] = lp;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1,
          r = l + 1;
        let m = i;
        if (l < this.d.length && this.less(l, m)) m = l;
        if (r < this.d.length && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
  private less(a: number, b: number) {
    return this.d[a]! < this.d[b]! || (this.d[a] === this.d[b] && this.p[a]! < this.p[b]!);
  }
  private swap(a: number, b: number) {
    [this.d[a], this.d[b]] = [this.d[b]!, this.d[a]!];
    [this.p[a], this.p[b]] = [this.p[b]!, this.p[a]!];
  }
}
