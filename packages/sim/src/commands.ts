/**
 * Ordres envoyés par les joueurs. Ils sont appliqués au début du jour suivant,
 * dans l'ordre reçu par le serveur, ce qui garde la simulation déterministe.
 */
export type Command =
  /** Outil de test : donne une province à une nation. Désactivé hors mode debug. */
  { type: "debug.transferProvince"; province: number; to: string };

export interface IssuedCommand {
  /** Nation qui donne l'ordre. */
  nation: string;
  command: Command;
}
