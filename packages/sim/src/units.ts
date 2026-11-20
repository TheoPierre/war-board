/**
 * Types de divisions terrestres. Les divisions sont « prêtes à l'emploi » :
 * pas de composition fine façon gabarit, seulement quelques chiffres clairs.
 *
 * - `attack` : dégâts infligés quand la division attaque une province.
 * - `defense` : dégâts infligés quand elle défend la province où elle se trouve.
 * - `speed` : kilomètres parcourus par jour sur la route vers sa destination.
 * - `hardness` : part blindée. Les dégâts reçus d'unités sans arme antichar
 *   (`piercing` faible) sont réduits d'autant.
 */
export interface UnitTypeDef {
  id: UnitTypeId;
  /** Nom du type, au singulier. */
  name: string;
  /** Forme courte pour nommer une division : « 12e division d'infanterie ». */
  divisionName: string;
  attack: number;
  defense: number;
  /** km par jour. */
  speed: number;
  /** 0 à 1. */
  hardness: number;
  /** 0 à 1 : capacité à percer un blindage. */
  piercing: number;
}

export const UNIT_TYPE_IDS = ["infantry", "cavalry", "motorized", "armor", "artillery"] as const;
export type UnitTypeId = (typeof UNIT_TYPE_IDS)[number];

export const UNIT_TYPES: readonly UnitTypeDef[] = [
  {
    id: "infantry",
    name: "Infanterie",
    divisionName: "division d'infanterie",
    attack: 2,
    defense: 4,
    speed: 24,
    hardness: 0,
    piercing: 0.3,
  },
  {
    id: "cavalry",
    name: "Cavalerie",
    divisionName: "division de cavalerie",
    attack: 2,
    defense: 3,
    speed: 36,
    hardness: 0,
    piercing: 0.1,
  },
  {
    id: "motorized",
    name: "Infanterie motorisée",
    divisionName: "division motorisée",
    attack: 3,
    defense: 4.5,
    speed: 45,
    hardness: 0.15,
    piercing: 0.4,
  },
  {
    id: "armor",
    name: "Blindés",
    divisionName: "division blindée",
    attack: 6,
    defense: 3,
    speed: 40,
    hardness: 0.7,
    piercing: 0.8,
  },
  {
    id: "artillery",
    name: "Artillerie",
    divisionName: "division d'artillerie",
    attack: 4,
    defense: 2.5,
    speed: 20,
    hardness: 0,
    piercing: 0.6,
  },
];

export const UNIT_TYPE_INDEX: ReadonlyMap<string, number> = new Map(UNIT_TYPES.map((t, i) => [t.id, i]));

/** Points de vie d'une division au complet. */
export const MAX_HP = 100;
/** Sous ce seuil, une division arrête d'attaquer, ou se replie si elle défend. */
export const RETREAT_HP = 25;
/** Points de vie regagnés par jour hors combat. */
export const HEAL_PER_DAY = 4;
/** Dégâts par point d'attaque ou de défense et par jour. */
export const DAMAGE_PER_POINT = 2.5;
/** Bonus de défense dans une capitale. */
export const CAPITAL_DEFENSE_BONUS = 0.25;
/** Bonus d'attaque par direction d'attaque supplémentaire (encerclement). */
export const FLANK_BONUS = 0.15;
/** Bonus par niveau d'amélioration au-delà du premier. */
export const LEVEL_BONUS = 0.1;

/** « 1re », « 2e », « 12e ». */
export function ordinalFr(n: number): string {
  return n === 1 ? "1re" : `${n}e`;
}

export function divisionLabel(type: number, num: number): string {
  const t = UNIT_TYPES[type];
  return t ? `${ordinalFr(num)} ${t.divisionName}` : `Division ${num}`;
}
