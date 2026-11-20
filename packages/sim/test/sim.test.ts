import { describe, expect, it } from "vitest";
import {
  GameClock,
  MAP_1936,
  MS_PER_DAY,
  NATIONS_1936,
  createInitialState,
  dateFromDay,
  dayFromDate,
  formatDateFr,
  hashState,
  step,
  type IssuedCommand,
} from "../src/index.ts";

describe("calendrier", () => {
  it("commence le 1er janvier 1936", () => {
    expect(formatDateFr(0)).toBe("1er janvier 1936");
  });
  it("gère l'année bissextile 1936", () => {
    expect(dateFromDay(59)).toEqual({ year: 1936, month: 2, day: 29 });
    expect(dateFromDay(366)).toEqual({ year: 1937, month: 1, day: 1 });
  });
  it("aller-retour jour ↔ date", () => {
    for (const d of [0, 1, 58, 59, 60, 365, 366, 1340, 3652]) expect(dayFromDate(dateFromDay(d))).toBe(d);
    expect(formatDateFr(dayFromDate({ year: 1939, month: 9, day: 1 }))).toBe("1er septembre 1939");
  });
});

describe("horloge", () => {
  it("1 jour pour 5 secondes à vitesse normale", () => {
    const c = new GameClock(1);
    expect(c.advance(4999)).toBe(0);
    expect(c.advance(1)).toBe(1);
    expect(c.advance(MS_PER_DAY * 3)).toBe(3);
  });
  it("ne bouge pas en pause", () => {
    const c = new GameClock(0);
    expect(c.advance(60_000)).toBe(0);
  });
});

describe("carte de 1936", () => {
  it("contient toutes les nations du scénario", () => {
    const owners = new Set(MAP_1936.provinces.map((p) => p.owner));
    for (const n of NATIONS_1936) expect(owners.has(n.id), n.id).toBe(true);
  });
  it("a des voisinages symétriques", () => {
    for (const p of MAP_1936.provinces)
      for (const n of p.neighbors) expect(MAP_1936.provinces[n]!.neighbors).toContain(p.id);
  });
  it("place chaque capitale chez sa nation", () => {
    for (const [nation, id] of Object.entries(MAP_1936.capitals)) expect(MAP_1936.provinces[id]!.owner).toBe(nation);
  });
  it("respecte quelques frontières de 1936", () => {
    const ownerOf = (name: string) => MAP_1936.provinces.find((p) => p.name === name)?.owner;
    expect(ownerOf("Königsberg")).toBe("GER");
    expect(ownerOf("Breslau")).toBe("GER");
    expect(ownerOf("Dantzig")).toBe("DAN");
    expect(ownerOf("Wilno")).toBe("POL");
    expect(ownerOf("Lwów")).toBe("POL");
    expect(ownerOf("Chișinău")).toBe("ROM");
    expect(ownerOf("Vienne")).toBe("AUT");
    expect(ownerOf("Trieste")).toBe("ITA");
  });
  it("couvre le monde entier avec les frontières de 1936", () => {
    const where = (name: string) => MAP_1936.provinces.find((p) => p.name === name)?.owner;
    expect(MAP_1936.provinces.length).toBeGreaterThan(2000);
    expect(where("Washington")).toBe("USA");
    expect(where("Rio de Janeiro")).toBe("BRA");
    expect(where("Keijō")).toBe("JAP");
    expect(where("Taihoku")).toBe("JAP");
    expect(where("Hsinking")).toBe("MAN");
    expect(where("Moukden")).toBe("MAN");
    expect(where("Lhassa")).toBe("TIB");
    expect(where("Nankin")).toBe("CHI");
    expect(where("Batavia")).toBe("NED");
    expect(where("Bombay")).toBe("GBR");
    expect(where("Hanoï")).toBe("FRA");
    expect(where("Léopoldville")).toBe("BEL");
    expect(where("Addis-Abeba")).toBe("ETH");
    expect(where("Sydney")).toBe("AST");
  });
  it("commence avec la guerre d'Éthiopie", () => {
    const s = createInitialState();
    const ita = NATIONS_1936.findIndex((n) => n.id === "ITA"),
      eth = NATIONS_1936.findIndex((n) => n.id === "ETH");
    expect(s.wars).toContainEqual([Math.min(ita, eth), Math.max(ita, eth)]);
  });
});

describe("simulation", () => {
  it("avance d'un jour sans modifier l'état précédent", () => {
    const s0 = createInitialState();
    const h0 = hashState(s0);
    const { state } = step(s0);
    expect(state.day).toBe(1);
    expect(hashState(s0)).toBe(h0);
  });

  it("est déterministe : mêmes ordres, même résultat", () => {
    const orders: Record<number, IssuedCommand[]> = {
      3: [{ nation: "GER", command: { type: "debug.transferProvince", province: 100, to: "GER" } }],
      10: [{ nation: "FRA", command: { type: "debug.transferProvince", province: 5, to: "FRA" } }],
    };
    const run = () => {
      let s = createInitialState(42);
      for (let d = 0; d < 200; d++) s = step(s, orders[d] ?? [], { debug: true }).state;
      return hashState(s);
    };
    expect(run()).toBe(run());
  });

  it("refuse les commandes de debug hors mode debug", () => {
    const s0 = createInitialState();
    const r = step(s0, [{ nation: "GER", command: { type: "debug.transferProvince", province: 0, to: "FRA" } }]);
    expect(r.rejected).toHaveLength(1);
    expect(r.state.owners[0]).toBe(s0.owners[0]);
  });

  it("déclare vaincue une nation qui perd toutes ses provinces", () => {
    let s = createInitialState();
    const dan = MAP_1936.provinces.filter((p) => p.owner === "DAN").map((p) => p.id);
    const cmds: IssuedCommand[] = dan.map((province) => ({
      nation: "GER",
      command: { type: "debug.transferProvince", province, to: "GER" },
    }));
    s = step(s, cmds, { debug: true }).state;
    expect(s.nations.find((n) => n.id === "DAN")!.defeated).toBe(true);
  });
});
