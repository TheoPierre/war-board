import { NATIONS_1936, NATION_INDEX } from "./scenario/nations1936.ts";
import { MAP_1936, type MapDef } from "./map.ts";

export interface NationState {
  id: string;
  /** Points de production accumulés (entier). Économie provisoire du prototype. */
  production: number;
  /** Capitulée : n'a plus de province. */
  defeated: boolean;
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
}

export function createInitialState(seed = 1936, map: MapDef = MAP_1936): GameState {
  return {
    day: 0,
    rng: seed | 0,
    owners: map.provinces.map((p) => {
      const i = NATION_INDEX.get(p.owner);
      if (i === undefined) throw new Error(`Nation inconnue : ${p.owner}`);
      return i;
    }),
    nations: NATIONS_1936.map((n) => ({ id: n.id, production: 0, defeated: false })),
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
