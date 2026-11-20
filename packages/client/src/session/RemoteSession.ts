import { Client, type Room } from "@colyseus/sdk";
import { isSpeed, type Command, type Speed } from "@war-board/sim";
import type { GameSession, PlayerView, SessionView } from "./types.ts";

export function defaultServerUrl(): string {
  const env = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (env) return env;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.hostname}:2567`;
}

/** Partie multijoueur : l'état vient du serveur Colyseus. */
export class RemoteSession implements GameSession {
  readonly mode = "multi" as const;
  private room?: Room<any, any>;
  private listeners = new Set<() => void>();
  private view: SessionView;
  private disposed = false;

  constructor(nation: string, name: string, url = defaultServerUrl()) {
    this.view = {
      day: 0,
      speed: 1,
      owners: [],
      ownersVersion: 0,
      players: [],
      myNation: nation,
      isHost: false,
      debug: false,
      status: "connecting",
    };
    const client = new Client(url);
    client
      .joinOrCreate("partie", { name, nation, debug: true })
      .then((room) => {
        if (this.disposed) {
          void room.leave();
          return;
        }
        this.room = room;
        room.onStateChange((state: any) => this.sync(state));
        room.onLeave(() => this.update({ status: "closed" }));
        room.onError((_code: number, message?: string) => this.update({ error: message ?? "Erreur du serveur" }));
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.update({ status: "closed", error: `Connexion impossible : ${message}` });
      });
  }

  private sync(state: any) {
    const owners: number[] = Array.from(state.owners ?? []);
    const prev = this.view.owners;
    let changed = owners.length !== prev.length;
    if (!changed) for (let i = 0; i < owners.length; i++) if (owners[i] !== prev[i]) { changed = true; break; }
    const players: PlayerView[] = [];
    state.players?.forEach((p: any, id: string) => players.push({ id, name: p.name, nation: p.nation }));
    this.update({
      day: state.day,
      speed: isSpeed(state.speed) ? state.speed : 1,
      owners: changed ? owners : prev,
      ownersVersion: this.view.ownersVersion + (changed ? 1 : 0),
      players,
      isHost: state.host === this.room?.sessionId,
      debug: !!state.debug,
      status: "running",
    });
  }

  private update(patch: Partial<SessionView>) {
    this.view = { ...this.view, ...patch };
    for (const l of this.listeners) l();
  }

  getView() {
    return this.view;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setSpeed(speed: Speed) {
    this.room?.send("speed", speed);
  }

  send(command: Command) {
    this.room?.send("command", command);
  }

  dispose() {
    this.disposed = true;
    void this.room?.leave();
    this.listeners.clear();
  }
}
