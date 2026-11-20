import { Room, type Client } from "@colyseus/core";
import {
  GameClock,
  MAP_1936,
  NATION_INDEX,
  createInitialState,
  isSpeed,
  step,
  type Command,
  type GameState,
  type IssuedCommand,
} from "@war-board/sim";
import { GameRoomState, PlayerState } from "./schema.ts";

export interface CreateOptions {
  /** Active les commandes de debug (transfert de province...). */
  debug?: boolean;
  /** Vitesse de départ. */
  speed?: number;
}

export interface JoinOptions {
  name?: string;
  /** Code de nation voulu, ou vide pour observer. */
  nation?: string;
}

/** Pas de la boucle serveur, en millisecondes. */
const LOOP_MS = 100;

export class GameRoom extends Room<{ state: GameRoomState }> {
  override maxClients = 8;

  private sim: GameState = createInitialState();
  private gameClock = new GameClock(1);
  private pending: IssuedCommand[] = [];
  private debugEnabled = false;

  override onCreate(options: CreateOptions = {}) {
    this.debugEnabled = !!options.debug;
    if (isSpeed(options.speed)) this.gameClock.setSpeed(options.speed);

    const state = new GameRoomState();
    state.day = this.sim.day;
    state.speed = this.gameClock.speed;
    state.debug = this.debugEnabled;
    for (const o of this.sim.owners) state.owners.push(o);
    this.setState(state);

    this.onMessage("speed", (client, speed: unknown) => {
      if (client.sessionId !== this.state.host) return;
      if (!isSpeed(speed)) return;
      this.gameClock.setSpeed(speed);
      this.state.speed = speed;
    });

    this.onMessage("command", (client, command: Command) => {
      const nation = this.state.players.get(client.sessionId)?.nation;
      if (!nation) return;
      this.pending.push({ nation, command });
    });

    this.setSimulationInterval((dt) => this.tick(dt), LOOP_MS);
  }

  override onJoin(client: Client, options: JoinOptions = {}) {
    const nation = String(options.nation ?? "");
    if (nation) {
      if (!NATION_INDEX.has(nation)) throw new Error("Nation inconnue.");
      for (const p of this.state.players.values())
        if (p.nation === nation) throw new Error("Cette nation est déjà jouée par quelqu'un d'autre.");
    }
    const player = new PlayerState();
    player.name = String(options.name ?? "").slice(0, 32) || "Joueur";
    player.nation = nation;
    player.connected = true;
    this.state.players.set(client.sessionId, player);
    if (!this.state.host) this.state.host = client.sessionId;
  }

  override onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    if (this.state.host === client.sessionId) {
      const next = this.state.players.keys().next();
      this.state.host = next.done ? "" : next.value;
    }
  }

  private tick(dt: number) {
    const days = this.gameClock.advance(dt);
    for (let i = 0; i < days; i++) {
      const commands = this.pending;
      this.pending = [];
      const result = step(this.sim, commands, { debug: this.debugEnabled, map: MAP_1936 });
      this.sim = result.state;
      for (const id of result.changedProvinces) this.state.owners[id] = this.sim.owners[id]!;
      this.state.day = this.sim.day;
    }
  }
}
