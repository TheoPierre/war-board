import data from "./scenario/provinces1936.json" with { type: "json" };

/** Données fixes d'une province (géographie). Ce qui change en jeu est dans GameState. */
export interface ProvinceDef {
  id: number;
  name: string;
  /** Propriétaire au 1er janvier 1936. */
  owner: string;
  /** Surface approximative en km². */
  km2: number;
  /** Point d'ancrage (ville principale) en coordonnées de carte. */
  center: [number, number];
  /** Touche la mer (ou le bord de la carte). */
  coastal: boolean;
  /** Provinces voisines par voie de terre. */
  neighbors: number[];
}

export interface MapDef {
  width: number;
  height: number;
  provinces: readonly ProvinceDef[];
  /** Province de la capitale de chaque nation. */
  capitals: Readonly<Record<string, number>>;
}

export const MAP_1936: MapDef = data as unknown as MapDef;
