import { useEffect, useState } from "react";
import { formatDateFr } from "@war-board/sim";
import type { JournalEntry } from "./hud/Panels.tsx";

const SHOW_MS = 5000;
const MAX_VISIBLE = 3;

/**
 * Télégrammes en haut à droite : chaque message arrive sur papier jauni,
 * reste 5 secondes, puis rejoint le journal.
 */
export function Telegrams({ entries }: { entries: readonly (JournalEntry & { at: number })[] }) {
  const [now, setNow] = useState(() => Date.now());
  const visible = entries.filter((m) => now - m.at < SHOW_MS).slice(-MAX_VISIBLE);

  useEffect(() => {
    if (!visible.length) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [visible.length, entries]);

  if (!visible.length) return null;
  return (
    <div className="toasts" aria-live="polite">
      {visible.map((m) => (
        <div key={m.id} className={`toast ${m.bad ? "alerte" : ""} ${now - m.at > SHOW_MS - 300 ? "out" : ""}`}>
          <div className="h">
            <span>{m.bad ? "TÉLÉGRAMME · URGENT" : "TÉLÉGRAMME"}</span>
            <span>{formatDateFr(m.day).toUpperCase()}</span>
          </div>
          {m.text}
          <span className="life" />
        </div>
      ))}
    </div>
  );
}
