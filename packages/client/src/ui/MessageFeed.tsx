import { useEffect, useRef, useState } from "react";
import type { SessionMessage } from "../session/types.ts";

const SHOW_MS = 6000;

/** Messages récents en bas de la carte ; chacun disparaît au bout de quelques secondes. */
export function MessageFeed({ messages }: { messages: readonly SessionMessage[] }) {
  const arrival = useRef(new Map<number, number>());
  const [now, setNow] = useState(() => Date.now());
  for (const m of messages) if (!arrival.current.has(m.id)) arrival.current.set(m.id, Date.now());
  const visible = messages.filter((m) => now - (arrival.current.get(m.id) ?? now) < SHOW_MS);

  useEffect(() => {
    if (!visible.length) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [visible.length, messages]);

  if (!visible.length) return null;
  return (
    <div className="feed" aria-live="polite">
      {visible.slice(-4).map((m) => (
        <div key={m.id} className={`feed-item ${m.bad ? "bad" : ""}`}>
          {m.text}
        </div>
      ))}
    </div>
  );
}
