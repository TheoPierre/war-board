import type { Command, Speed } from "@war-board/sim";

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
