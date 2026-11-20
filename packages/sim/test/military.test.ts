import { describe, expect, it } from "vitest";
import {
  ARMY_1936,
  MAP_1936,
  MAX_HP,
  NATIONS_1936,
  NATION_INDEX,
  UNIT_TYPE_INDEX,
  createInitialState,
  edgeKm,
  findPath,
  hashState,
  step,
  type GameState,
  type IssuedCommand,
  type Unit,
  type UnitTypeId,
} from "../src/index.ts";

const N = (id: string) => NATION_INDEX.get(id)!;
const GER = N("GER"),
  FRA = N("FRA");

/** Une province allemande voisine d'une province française. */
function borderPair(a = GER, b = FRA): [number, number] {
  for (const p of MAP_1936.provinces) {
    if (p.owner !== NATIONS_1936[a]!.id) continue;
    const nb = p.neighbors.find((n) => MAP_1936.provinces[n]!.owner === NATIONS_1936[b]!.id);
    if (nb !== undefined) return [p.id, nb];
  }
  throw new Error("pas de frontière");
}

function emptyState(): GameState {
  const s = createInitialState();
  s.units = [];
  s.nextUnitId = 1;
  return s;
}

function addUnit(s: GameState, nation: number, province: number, type: UnitTypeId = "infantry", hp = MAX_HP): Unit {
  const u: Unit = {
    id: s.nextUnitId++,
    nation,
    type: UNIT_TYPE_INDEX.get(type)!,
    num: s.nextUnitId,
    hp,
    level: 1,
    province,
    path: [],
    progress: 0,
    pace: 0,
  };
  s.units.push(u);
  return u;
}

function run(s: GameState, days: number, first: IssuedCommand[] = []): GameState {
  for (let d = 0; d < days; d++) s = step(s, d === 0 ? first : []).state;
  return s;
}

const move = (nation: string, units: number[], to: number): IssuedCommand => ({ nation, command: { type: "unit.move", units, to } });
const war = (nation: string, target: string): IssuedCommand => ({ nation, command: { type: "war.declare", target } });

describe("armées de départ", () => {
  const s = createInitialState();
  it("donne des divisions aux nations de la table, chez elles", () => {
    for (const [id, table] of Object.entries(ARMY_1936)) {
      const expected = Object.values(table).reduce((a, b) => a + (b ?? 0), 0);
      expect(s.units.filter((u) => u.nation === N(id)).length, id).toBe(expected);
    }
    for (const u of s.units) expect(s.owners[u.province]).toBe(u.nation);
  });
  it("numérote les divisions sans doublon", () => {
    expect(new Set(s.units.map((u) => u.id)).size).toBe(s.units.length);
    const keys = s.units.map((u) => `${u.nation}:${u.type}:${u.num}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("déplacements", () => {
  it("rejoint une province voisine au bout du temps de trajet", () => {
    let s = emptyState();
    const from = MAP_1936.capitals.GER!;
    const to = MAP_1936.provinces[from]!.neighbors.find((n) => MAP_1936.provinces[n]!.owner === "GER")!;
    const u = addUnit(s, GER, from);
    const days = Math.ceil(edgeKm(MAP_1936, from, to) / 24);
    s = run(s, days - 1, [move("GER", [u.id], to)]);
    expect(s.units[0]!.province).toBe(from);
    expect(s.units[0]!.progress).toBeGreaterThan(0);
    s = run(s, 1);
    expect(s.units[0]!.province).toBe(to);
    expect(s.units[0]!.path).toEqual([]);
  });

  it("traverse plusieurs provinces jusqu'à la destination", () => {
    let s = emptyState();
    const u = addUnit(s, GER, MAP_1936.capitals.GER!, "armor");
    const target = borderPair()[0];
    s = run(s, 60, [move("GER", [u.id], target)]);
    expect(s.units[0]!.province).toBe(target);
  });

  it("fait avancer un groupe au pas de la plus lente", () => {
    let s = emptyState();
    const from = MAP_1936.capitals.GER!;
    const a = addUnit(s, GER, from, "armor");
    const b = addUnit(s, GER, from, "infantry");
    const target = borderPair()[0];
    s = run(s, 3, [move("GER", [a.id, b.id], target)]);
    const [ua, ub] = [s.units.find((u) => u.id === a.id)!, s.units.find((u) => u.id === b.id)!];
    expect(ua.province).toBe(ub.province);
    expect(ua.progress).toBe(ub.progress);
    expect(ua.pace).toBe(24);
  });

  it("refuse d'entrer en territoire neutre", () => {
    const s = emptyState();
    const [ger, fra] = borderPair();
    const u = addUnit(s, GER, ger);
    expect(findPath(MAP_1936, s, GER, ger, fra)).toBeNull();
    const r = step(s, [move("GER", [u.id], fra)]);
    expect(r.rejected).toHaveLength(1);
  });

  it("refuse les ordres donnés aux divisions d'une autre nation", () => {
    const s = emptyState();
    const u = addUnit(s, FRA, MAP_1936.capitals.FRA!);
    const r = step(s, [move("GER", [u.id], MAP_1936.capitals.GER!)]);
    expect(r.rejected).toHaveLength(1);
  });
});

describe("guerre et combats", () => {
  it("occupe une province ennemie sans défenseur", () => {
    let s = emptyState();
    const [ger, fra] = borderPair();
    const u = addUnit(s, GER, ger, "armor");
    s = step(s, [war("GER", "FRA")]).state;
    expect(s.wars).toEqual([[Math.min(GER, FRA), Math.max(GER, FRA)]]);
    s = run(s, 10, [move("GER", [u.id], fra)]);
    expect(s.owners[fra]).toBe(GER);
  });

  it("une attaque à un contre un échoue, à quatre contre un elle passe", () => {
    const [ger, fra] = borderPair();
    // un contre un
    let s = emptyState();
    const a = addUnit(s, GER, ger);
    addUnit(s, FRA, fra);
    s = run(s, 25, [war("GER", "FRA"), move("GER", [a.id], fra)]);
    expect(s.owners[fra]).toBe(FRA);
    expect(s.units.find((u) => u.id === a.id)!.province).toBe(ger);

    // quatre contre un
    s = emptyState();
    const ids = [1, 2, 3, 4].map(() => addUnit(s, GER, ger).id);
    addUnit(s, FRA, fra);
    let sawBattle = false;
    s = step(s, [war("GER", "FRA"), move("GER", ids, fra)]).state;
    for (let d = 0; d < 30; d++) {
      s = step(s).state;
      if (s.battles.some((b) => b.province === fra)) sawBattle = true;
    }
    expect(sawBattle).toBe(true);
    expect(s.owners[fra]).toBe(GER);
  });

  it("signale la guerre, une attaque repoussée et une province occupée", () => {
    const [ger, fra] = borderPair();
    let s = emptyState();
    const a = addUnit(s, GER, ger);
    addUnit(s, FRA, fra);
    const events: string[] = [];
    let r = step(s, [war("GER", "FRA"), move("GER", [a.id], fra)]);
    events.push(...r.events.map((e) => e.type));
    for (let d = 0; d < 25; d++) {
      r = step(r.state);
      events.push(...r.events.map((e) => e.type));
    }
    expect(events).toContain("war");
    expect(events).toContain("repulsed");

    s = emptyState();
    const b = addUnit(s, GER, ger, "armor");
    r = step(s, [war("GER", "FRA"), move("GER", [b.id], fra)]);
    const all = [...r.events];
    for (let d = 0; d < 10; d++) {
      r = step(r.state);
      all.push(...r.events);
    }
    expect(all).toContainEqual({ type: "captured", province: fra, by: GER, from: FRA });
  });

  it("détruit une division encerclée au lieu de la replier", () => {
    let s = emptyState();
    // Une province française dont tous les voisins sont tenus par l'Allemagne.
    const [, fra] = borderPair();
    for (const nb of MAP_1936.provinces[fra]!.neighbors) s.owners[nb] = GER;
    const def = addUnit(s, FRA, fra, "infantry", 30);
    const atk = MAP_1936.provinces[fra]!.neighbors.slice(0, 2).flatMap((nb) => [addUnit(s, GER, nb, "armor"), addUnit(s, GER, nb)]);
    s = run(s, 20, [war("GER", "FRA"), move("GER", atk.map((u) => u.id), fra)]);
    expect(s.units.some((u) => u.id === def.id)).toBe(false);
    expect(s.owners[fra]).toBe(GER);
  });

  it("retire les divisions d'une nation vaincue", () => {
    let s = createInitialState();
    const dan = MAP_1936.provinces.filter((p) => p.owner === "DAN").map((p) => p.id);
    s.units.push({ id: s.nextUnitId++, nation: N("DAN"), type: 0, num: 1, hp: 100, level: 1, province: dan[0]!, path: [], progress: 0, pace: 0 });
    const cmds: IssuedCommand[] = dan.map((province) => ({
      nation: "GER",
      command: { type: "debug.transferProvince", province, to: "GER" },
    }));
    s = step(s, cmds, { debug: true }).state;
    expect(s.nations[N("DAN")]!.defeated).toBe(true);
    expect(s.units.some((u) => u.nation === N("DAN"))).toBe(false);
  });

  it("reste déterministe avec des batailles", () => {
    const go = () => {
      let s = createInitialState(7);
      const ger = s.units.filter((u) => u.nation === GER).map((u) => u.id);
      const target = borderPair()[1];
      s = step(s, [war("GER", "FRA"), move("GER", ger, target)]).state;
      for (let d = 0; d < 120; d++) s = step(s).state;
      return { hash: hashState(s), battles: s.battles.length, owner: s.owners[target] };
    };
    const a = go();
    expect(go()).toEqual(a);
  });
});
