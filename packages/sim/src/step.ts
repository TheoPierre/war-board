import { NATION_INDEX } from "./scenario/nations1936.ts";
import { MAP_1936, type MapDef } from "./map.ts";
import { cloneState, type GameState } from "./state.ts";
import type { IssuedCommand } from "./commands.ts";
import { findPath, halt, runMilitaryDay, settleUnits, type GameEvent } from "./military.ts";
import { UNIT_TYPES } from "./units.ts";

export interface StepOptions {
  /** Autorise les commandes de debug. */
  debug?: boolean;
  map?: MapDef;
}

export interface StepResult {
  state: GameState;
  /** Provinces dont le propriétaire a changé pendant ce jour. */
  changedProvinces: number[];
  /** Commandes refusées, avec la raison. */
  rejected: { issued: IssuedCommand; reason: string }[];
  /** Faits marquants de la journée (guerres, occupations, batailles). */
  events: GameEvent[];
}

/**
 * Avance la partie d'un jour. Fonction pure : ne modifie pas `prev`.
 *
 * Ordre d'une journée : ordres des joueurs, déplacements, combats, soins,
 * occupation, économie, capitulations.
 */
export function step(prev: GameState, commands: readonly IssuedCommand[] = [], opts: StepOptions = {}): StepResult {
  const map = opts.map ?? MAP_1936;
  const state = cloneState(prev);
  state.day = prev.day + 1;
  const changed = new Set<number>();
  const rejected: StepResult["rejected"] = [];
  const events: GameEvent[] = [];

  for (const issued of commands) {
    const reason = applyCommand(state, issued, map, opts, changed, events);
    if (reason) rejected.push({ issued, reason });
  }

  const military = runMilitaryDay(state, map, prev.battles);
  for (const p of military.changed) changed.add(p);
  events.push(...military.events);

  // Économie provisoire : chaque province rapporte un point par jour.
  for (const owner of state.owners) state.nations[owner]!.production += 1;

  // Capitulation : une nation sans province est vaincue.
  const alive = new Set(state.owners);
  state.nations.forEach((n, i) => {
    if (!n.defeated && !alive.has(i)) n.defeated = true;
  });
  settleUnits(state, map, changed, events);

  return { state, changedProvinces: [...changed].sort((a, b) => a - b), rejected, events };
}

function applyCommand(
  state: GameState,
  issued: IssuedCommand,
  map: MapDef,
  opts: StepOptions,
  changed: Set<number>,
  events: GameEvent[],
): string | null {
  const c = issued.command;
  const me = NATION_INDEX.get(issued.nation);
  if (me === undefined) return "nation inconnue";
  if (state.nations[me]!.defeated) return "nation vaincue";
  switch (c?.type) {
    case "unit.move": {
      if (!validProvince(map, c.to)) return "province inconnue";
      const mine = selectUnits(state, me, c.units);
      if (!mine.length) return "aucune de vos divisions";
      let moved = 0;
      // Les divisions parties ensemble d'une même province avancent au pas de la plus lente.
      const slowest = new Map<number, number>();
      for (const u of mine) {
        const sp = UNIT_TYPES[u.type]!.speed;
        slowest.set(u.province, Math.min(slowest.get(u.province) ?? Infinity, sp));
      }
      const groupSize = new Map<number, number>();
      for (const u of mine) groupSize.set(u.province, (groupSize.get(u.province) ?? 0) + 1);
      for (const u of mine) {
        const path = findPath(map, state, me, u.province, c.to);
        if (!path) continue;
        if (!path.length) {
          halt(u);
        } else {
          if (path[0] !== u.path[0]) u.progress = 0;
          u.path = path;
          u.pace = groupSize.get(u.province)! > 1 ? slowest.get(u.province)! : 0;
        }
        moved++;
      }
      return moved ? null : "aucun chemin par voie de terre (territoire neutre ou mer)";
    }
    case "unit.stop": {
      const mine = selectUnits(state, me, c.units);
      if (!mine.length) return "aucune de vos divisions";
      for (const u of mine) halt(u);
      return null;
    }
    case "war.declare": {
      const target = NATION_INDEX.get(c.target);
      if (target === undefined) return "nation inconnue";
      if (target === me) return "impossible de se déclarer la guerre";
      if (state.nations[target]!.defeated) return "nation déjà vaincue";
      const pair: [number, number] = [Math.min(me, target), Math.max(me, target)];
      if (state.wars.some((w) => w[0] === pair[0] && w[1] === pair[1])) return "déjà en guerre";
      state.wars.push(pair);
      state.wars.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      events.push({ type: "war", attacker: me, target });
      return null;
    }
    case "debug.transferProvince": {
      if (!opts.debug) return "commandes de debug désactivées";
      if (!validProvince(map, c.province)) return "province inconnue";
      const to = NATION_INDEX.get(c.to);
      if (to === undefined) return "nation inconnue";
      state.owners[c.province] = to;
      changed.add(c.province);
      return null;
    }
    default:
      return "commande inconnue";
  }
}

function validProvince(map: MapDef, p: unknown): p is number {
  return Number.isInteger(p) && (p as number) >= 0 && (p as number) < map.provinces.length;
}

function selectUnits(state: GameState, nation: number, ids: unknown) {
  if (!Array.isArray(ids)) return [];
  const want = new Set(ids.filter((x) => Number.isInteger(x)));
  return state.units.filter((u) => u.nation === nation && want.has(u.id));
}
