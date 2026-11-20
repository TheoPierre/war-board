import { NATIONS_1936 } from "./nations1936.ts";
import { MAX_HP, UNIT_TYPES, UNIT_TYPE_INDEX, type UnitTypeId } from "../units.ts";
import type { MapDef } from "../map.ts";
import type { Unit } from "../state.ts";

/**
 * Armées de terre au 1er janvier 1936, en divisions.
 *
 * Ordres de grandeur inspirés des effectifs de l'époque, arrondis et
 * réduits pour rester lisibles sur la carte. Les nations absentes de la table
 * reçoivent une division d'infanterie pour dix provinces (au moins une).
 */
export const ARMY_1936: Readonly<Record<string, Partial<Record<UnitTypeId, number>>>> = {
  GER: { infantry: 24, armor: 3, motorized: 2, cavalry: 1, artillery: 2 },
  FRA: { infantry: 30, cavalry: 4, motorized: 2, armor: 2, artillery: 4 },
  GBR: { infantry: 14, armor: 1, motorized: 1, cavalry: 2, artillery: 2 },
  ITA: { infantry: 28, cavalry: 3, motorized: 2, armor: 1, artillery: 2 },
  SOV: { infantry: 48, cavalry: 14, armor: 4, motorized: 2, artillery: 4 },
  POL: { infantry: 30, cavalry: 8, artillery: 2 },
  ESP: { infantry: 14, cavalry: 1, artillery: 1 },
  TUR: { infantry: 18, cavalry: 3, artillery: 1 },
  CZE: { infantry: 14, motorized: 1, artillery: 2 },
  ROM: { infantry: 18, cavalry: 3, artillery: 1 },
  YUG: { infantry: 16, cavalry: 2, artillery: 1 },
  HUN: { infantry: 7, cavalry: 1 },
  BUL: { infantry: 8, cavalry: 1 },
  GRE: { infantry: 10, cavalry: 1 },
  BEL: { infantry: 12, cavalry: 2, artillery: 1 },
  NED: { infantry: 8 },
  SUI: { infantry: 6 },
  AUT: { infantry: 6 },
  SWE: { infantry: 6, cavalry: 1 },
  NOR: { infantry: 4 },
  FIN: { infantry: 6 },
  DEN: { infantry: 2 },
  POR: { infantry: 6 },
  IRL: { infantry: 2 },
  EST: { infantry: 3 },
  LAT: { infantry: 3 },
  LIT: { infantry: 3 },
  ALB: { infantry: 2 },
  LUX: {},
  ISL: {},
  DAN: {},
  EGY: { infantry: 3 },
  IRQ: { infantry: 3 },
  IRN: { infantry: 6 },
  SAU: { infantry: 3, cavalry: 1 },
  USA: { infantry: 9, cavalry: 2, motorized: 1, artillery: 1 },
  JAP: { infantry: 17, cavalry: 2, motorized: 1, armor: 1, artillery: 2 },
  CHI: { infantry: 40, cavalry: 4, artillery: 1 },
  MAN: { infantry: 6, cavalry: 2 },
  ETH: { infantry: 10, cavalry: 2 },
  CAN: { infantry: 3 },
  AST: { infantry: 3 },
  NZL: { infantry: 1 },
  SAF: { infantry: 2, motorized: 1 },
  BRA: { infantry: 10, cavalry: 2 },
  ARG: { infantry: 6, cavalry: 2 },
  CHL: { infantry: 4, cavalry: 1 },
  MEX: { infantry: 8, cavalry: 2 },
  SIA: { infantry: 5 },
  MON: { cavalry: 3 },
  SIK: { infantry: 2, cavalry: 1 },
  TIB: { infantry: 1 },
  YEM: { infantry: 2 },
  AFG: { infantry: 4, cavalry: 1 },
};

/** Divisions par pile au déploiement. */
const STACK = 3;

/** Ordre de déploiement : les unités rapides près de la capitale. */
const DEPLOY_ORDER: readonly UnitTypeId[] = ["armor", "motorized", "artillery", "cavalry", "infantry"];

/**
 * Place les armées de départ. Déterministe : chaque nation répartit ses
 * divisions sur ses provinces, dans l'ordre d'éloignement de la capitale
 * (parcours en largeur sur les voisinages).
 */
export function deployArmies(map: MapDef, owners: readonly number[]): Unit[] {
  const units: Unit[] = [];
  NATIONS_1936.forEach((nation, n) => {
    const own: number[] = [];
    for (let i = 0; i < owners.length; i++) if (owners[i] === n) own.push(i);
    if (!own.length) return;
    const order = bfsOrder(map, owners, n, map.capitals[nation.id] ?? own[0]!);

    const table = ARMY_1936[nation.id] ?? { infantry: Math.max(1, Math.round(own.length / 10)) };
    const list: number[] = [];
    for (const t of DEPLOY_ORDER) for (let k = 0; k < (table[t] ?? 0); k++) list.push(UNIT_TYPE_INDEX.get(t)!);
    const counters = new Array(UNIT_TYPES.length).fill(0);
    // Piles de trois divisions environ, réparties sur tout le territoire.
    const slots = Math.max(1, Math.ceil(list.length / STACK));
    list.forEach((type, i) => {
      const slot = i % slots;
      const province = order[Math.floor((slot * order.length) / slots)]!;
      units.push({
        id: units.length + 1,
        nation: n,
        type,
        num: ++counters[type],
        hp: MAX_HP,
        level: 1,
        province,
        path: [],
        progress: 0,
        pace: 0,
      });
    });
  });
  return units;
}

/** Provinces de la nation, de la plus proche à la plus éloignée de `start`. */
function bfsOrder(map: MapDef, owners: readonly number[], nation: number, start: number): number[] {
  const seen = new Set<number>([start]);
  const order = [start];
  for (let i = 0; i < order.length; i++) {
    for (const nb of map.provinces[order[i]!]!.neighbors) {
      if (owners[nb] === nation && !seen.has(nb)) {
        seen.add(nb);
        order.push(nb);
      }
    }
  }
  // Territoires sans lien terrestre avec la capitale (îles, colonies).
  for (let i = 0; i < owners.length; i++) if (owners[i] === nation && !seen.has(i)) order.push(i);
  return order;
}
