/**
 * Ordres envoyés par les joueurs. Ils sont appliqués au début du jour suivant,
 * dans l'ordre reçu par le serveur, ce qui garde la simulation déterministe.
 */
export type Command =
  /** Envoie des divisions vers une province (chemin le plus court par voie de terre). */
  | { type: "unit.move"; units: number[]; to: number }
  /** Arrête des divisions là où elles sont. */
  | { type: "unit.stop"; units: number[] }
  /**
   * Déclare la guerre à une nation. Version minimale pour tester les combats :
   * les règles de guerre (buts, paix, alliances) viendront à l'étape « Guerre et capitulation ».
   */
  | { type: "war.declare"; target: string }
  /** Outil de test : donne une province à une nation. Désactivé hors mode debug. */
  | { type: "debug.transferProvince"; province: number; to: string };

export interface IssuedCommand {
  /** Nation qui donne l'ordre. */
  nation: string;
  command: Command;
}
