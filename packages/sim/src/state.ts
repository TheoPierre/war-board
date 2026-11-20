import { NATIONS_1936, NATION_INDEX } from "./scenario/nations1936.ts";
import { MAP_1936, type MapDef } from "./map.ts";
import { deployArmies } from "./scenario/army1936.ts";

export interface NationState {
  id: string;
  /** Points de production accumulés (entier). Économie provisoire du prototype. */
  production: number;
  /** Capitulée : n'a plus de province. */
  defeated: boolean;
}

/** Une division terrestre. */
export interface Unit {
  /** Identifiant unique et stable dans la partie. */
  id: number;
  /** Index de nation (ordre de NATIONS_1936). */
  nation: number;
  /** Index de type (ordre de UNIT_TYPES). */
  type: number;
  /** Numéro de la division dans sa nation et son type : « 12e division d'infanterie ». */
  num: number;
  /** Points de vie, de 0 à MAX_HP. */
  hp: number;
  /** Niveau d'amélioration, 1 au départ. */
  level: number;
  /** Province où se trouve la division. */
  province: number;
  /** Provinces restant à traverser, la prochaine en premier. Vide = à l'arrêt. */
  path: number[];
  /** Kilomètres déjà parcourus vers `path[0]`. */
  progress: number;
  /**
   * Vitesse imposée (km/jour) quand la division se déplace avec d'autres :
   * le groupe avance au pas de la plus lente. 0 = sa propre vitesse.
   */
  pace: number;
}

/** Une bataille en cours dans une province, telle qu'au dernier jour simulé. */
export interface Battle {
  /** Province attaquée. */
  province: number;
  /** Provinces d'où partent les attaques, triées. */
  from: number[];
  /** Nations qui attaquent, triées. */
  attackers: number[];
  /** Nation qui défend (propriétaire des divisions présentes). */
  defender: number;
  /** Jours de combat consécutifs. */
  days: number;
}

/**
 * État complet d'une partie. Uniquement des nombres, chaînes et tableaux :
 * sérialisable en JSON et identique sur toutes les machines.
 */
export interface GameState {
  /** Jours écoulés depuis le 1er janvier 1936. */
  day: number;
  /** Graine courante du générateur aléatoire. */
  rng: number;
  /** Index de la nation propriétaire de chaque province (ordre de NATIONS_1936). */
  owners: number[];
  nations: NationState[];
  /** Divisions terrestres, triées par identifiant. */
  units: Unit[];
  nextUnitId: number;
  /** Paires de nations en guerre [a, b] avec a < b, triées. */
  wars: [number, number][];
  /** Batailles du dernier jour simulé. */
  battles: Battle[];
}

export function createInitialState(seed = 1936, map: MapDef = MAP_1936): GameState {
  const owners = map.provinces.map((p) => {
    const i = NATION_INDEX.get(p.owner);
    if (i === undefined) throw new Error(`Nation inconnue : ${p.owner}`);
    return i;
  });
  const units = deployArmies(map, owners);
  return {
    day: 0,
    rng: seed | 0,
    owners,
    nations: NATIONS_1936.map((n) => ({ id: n.id, production: 0, defeated: false })),
    units,
    nextUnitId: units.length + 1,
    wars: [],
    battles: [],
  };
}

export function atWar(state: Pick<GameState, "wars">, a: number, b: number): boolean {
  if (a === b) return false;
  const lo = Math.min(a, b),
    hi = Math.max(a, b);
  return state.wars.some((w) => w[0] === lo && w[1] === hi);
}

/** Copie profonde, pour que `step` ne modifie jamais l'état reçu. */
export function cloneState(s: GameState): GameState {
  return {
    day: s.day,
    rng: s.rng,
    owners: s.owners.slice(),
    nations: s.nations.map((n) => ({ ...n })),
    units: s.units.map((u) => ({ ...u, path: u.path.slice() })),
    nextUnitId: s.nextUnitId,
    wars: s.wars.map((w) => [w[0], w[1]]),
    battles: s.battles.map((b) => ({ ...b, from: b.from.slice(), attackers: b.attackers.slice() })),
  };
}

/** Empreinte FNV-1a de l'état, pour vérifier que deux simulations sont identiques. */
export function hashState(state: GameState): string {
  const text = JSON.stringify(state);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
