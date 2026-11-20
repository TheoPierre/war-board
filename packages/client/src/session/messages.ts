import type { GameEvent } from "@war-board/sim";
import { describeEvent } from "../ui/events.ts";
import type { SessionMessage } from "./types.ts";

const MAX = 6;

/** Fil des derniers messages affichés au joueur. */
export class MessageLog {
  list: readonly SessionMessage[] = [];
  private next = 1;

  push(text: string, bad: boolean) {
    this.list = [...this.list, { id: this.next++, text, bad }].slice(-MAX);
  }

  /** Ajoute les événements qui concernent la nation `me`. Renvoie vrai si un message a été ajouté. */
  addEvents(events: readonly GameEvent[], me: number): boolean {
    let added = false;
    // Une seule ligne par jour pour les occupations, sinon le fil déborde.
    const captured = events.filter((e) => e.type === "captured" && (e.by === me || e.from === me));
    for (const e of events) {
      if (e.type === "captured" && captured.length > 1) continue;
      const text = describeEvent(e, me);
      if (!text) continue;
      const bad = (e.type === "captured" && e.from === me) || (e.type === "destroyed") || (e.type === "repulsed" && e.attackers.includes(me)) || (e.type === "war" && e.target === me);
      this.push(text, bad);
      added = true;
    }
    if (captured.length > 1) {
      const won = captured.filter((e) => e.type === "captured" && e.by === me).length;
      const lost = captured.length - won;
      if (won) this.push(`Vos troupes occupent ${won} province${won > 1 ? "s" : ""}.`, false);
      if (lost) this.push(`Vous perdez ${lost} province${lost > 1 ? "s" : ""}.`, true);
      added = true;
    }
    return added;
  }
}
