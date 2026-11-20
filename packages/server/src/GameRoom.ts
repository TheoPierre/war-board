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
import { BattleState, GameRoomState, PlayerState, UnitState } from "./schema.ts";

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
  private pending: { issued: IssuedCommand; client: string }[] = [];
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
    this.syncMilitary();

    this.onMessage("speed", (client, speed: unknown) => {
      if (client.sessionId !== this.state.host) return;
      if (!isSpeed(speed)) return;
      this.gameClock.setSpeed(speed);
      this.state.speed = speed;
    });

    this.onMessage("command", (client, command: Command) => {
      const nation = this.state.players.get(client.sessionId)?.nation;
      if (!nation) return;
      this.pending.push({ issued: { nation, command }, client: client.sessionId });
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
      const batch = this.pending;
      this.pending = [];
      const result = step(
        this.sim,
        batch.map((b) => b.issued),
        { debug: this.debugEnabled, map: MAP_1936 },
      );
      this.sim = result.state;
      for (const id of result.changedProvinces) this.state.owners[id] = this.sim.owners[id]!;
      this.state.day = this.sim.day;
      for (const r of result.rejected) {
        const sender = batch.find((b) => b.issued === r.issued)?.client;
        const client = sender ? this.clients.getById(sender) : undefined;
        client?.send("rejected", { type: r.issued.command?.type, reason: r.reason });
      }
      if (result.events.length) this.broadcast("events", result.events);
    }
    if (days) this.syncMilitary();
  }

  /** Recopie divisions, guerres et batailles de la simulation vers l'état synchronisé. */
  private syncMilitary() {
    const units = this.state.units;
    const alive = new Set<string>();
    for (const u of this.sim.units) {
      const key = String(u.id);
      alive.add(key);
      let s = units.get(key);
      if (!s) {
        s = new UnitState();
        s.id = u.id;
        s.nation = u.nation;
        s.type = u.type;
        s.num = u.num;
        units.set(key, s);
      }
      if (s.hp !== u.hp) s.hp = u.hp;
      if (s.level !== u.level) s.level = u.level;
      if (s.province !== u.province) s.province = u.province;
      if (s.progress !== u.progress) s.progress = u.progress;
      if (s.pace !== u.pace) s.pace = u.pace;
      if (s.path.length !== u.path.length || u.path.some((p, i) => s!.path[i] !== p)) {
        s.path.clear();
        for (const p of u.path) s.path.push(p);
      }
    }
    for (const key of [...units.keys()]) if (!alive.has(key)) units.delete(key);

    const wars = this.sim.wars.map((w) => `${w[0]}:${w[1]}`);
    if (wars.length !== this.state.wars.length || wars.some((w, i) => this.state.wars[i] !== w)) {
      this.state.wars.clear();
      for (const w of wars) this.state.wars.push(w);
    }

    this.state.battles.clear();
    for (const b of this.sim.battles) {
      const s = new BattleState();
      s.province = b.province;
      for (const f of b.from) s.from.push(f);
      for (const a of b.attackers) s.attackers.push(a);
      s.defender = b.defender;
      s.days = b.days;
      this.state.battles.push(s);
    }
  }
}
