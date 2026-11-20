import type { Battle, Command, Speed, Unit } from "@war-board/sim";

export interface SessionMessage {
  id: number;
  text: string;
  /** Ordre refusé ou mauvaise nouvelle. */
  bad: boolean;
}

export interface PlayerView {
  id: string;
  name: string;
  nation: string;
}

/** Ce que l'interface affiche, que la partie tourne en local ou sur le serveur. */
export interface SessionView {
  day: number;
  speed: Speed;
  /** Index de nation par province. */
  owners: readonly number[];
  /** Incrémenté à chaque changement de propriétaire, pour redessiner les frontières. */
  ownersVersion: number;
  /** Divisions de toutes les nations. */
  units: readonly Unit[];
  /** Guerres en cours : paires d'index de nations [a, b], a < b. */
  wars: readonly (readonly [number, number])[];
  /** Batailles du dernier jour. */
  battles: readonly Battle[];
  /** Messages récents (ordres refusés, batailles...), du plus ancien au plus récent. */
  messages: readonly SessionMessage[];
  players: PlayerView[];
  /** Nation jouée sur ce poste (vide pour un observateur). */
  myNation: string;
  isHost: boolean;
  debug: boolean;
  status: "connecting" | "running" | "closed";
  error?: string;
}

export interface GameSession {
  readonly mode: "solo" | "multi";
  getView(): SessionView;
  subscribe(listener: () => void): () => void;
  setSpeed(speed: Speed): void;
  send(command: Command): void;
  dispose(): void;
}
