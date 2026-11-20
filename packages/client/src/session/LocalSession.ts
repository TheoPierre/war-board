import {
  GameClock,
  createInitialState,
  step,
  type Command,
  type GameState,
  type IssuedCommand,
  type Speed,
} from "@war-board/sim";
import type { GameSession, SessionView } from "./types.ts";
import { MessageLog } from "./messages.ts";

/**
 * Partie solo : la simulation tourne dans le navigateur, avec la même
 * fonction `step` que le serveur.
 */
export class LocalSession implements GameSession {
  readonly mode = "solo" as const;
  private sim: GameState = createInitialState();
  private clock = new GameClock(1);
  private pending: IssuedCommand[] = [];
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval>;
  private last = performance.now();
  private view!: SessionView;
  private log = new MessageLog();
  private me: number;

  constructor(
    private nation: string,
    private playerName: string,
  ) {
    this.me = this.sim.nations.findIndex((n) => n.id === nation);
    this.view = this.buildView(0);
    this.timer = setInterval(() => this.tick(), 100);
  }

  private buildView(ownersVersion: number): SessionView {
    return {
      day: this.sim.day,
      speed: this.clock.speed,
      owners: this.sim.owners,
      ownersVersion,
      units: this.sim.units,
      wars: this.sim.wars,
      battles: this.sim.battles,
      messages: this.log.list,
      players: [{ id: "local", name: this.playerName, nation: this.nation }],
      myNation: this.nation,
      isHost: true,
      debug: true,
      status: "running",
    };
  }

  private tick() {
    const now = performance.now();
    const days = this.clock.advance(now - this.last);
    this.last = now;
    if (!days) return;
    let changed = false;
    for (let i = 0; i < days; i++) {
      const r = step(this.sim, this.pending, { debug: true });
      this.pending = [];
      this.sim = r.state;
      if (r.changedProvinces.length) changed = true;
      for (const x of r.rejected) this.log.push(`Ordre refusé : ${x.reason}`, true);
      this.log.addEvents(r.events, this.me);
    }
    this.view = this.buildView(this.view.ownersVersion + (changed ? 1 : 0));
    this.emit();
  }

  private emit() {
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
    this.clock.setSpeed(speed);
    this.last = performance.now();
    this.view = { ...this.view, speed };
    this.emit();
  }

  send(command: Command) {
    this.pending.push({ nation: this.nation, command });
  }

  dispose() {
    clearInterval(this.timer);
    this.listeners.clear();
  }
}
