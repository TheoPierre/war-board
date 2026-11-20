import { useState } from "react";
import { NATIONS_1936 } from "@war-board/sim";
import { useImageLibrary } from "../../media/images.ts";
import type { PlayerView } from "../../session/types.ts";
import { WikiImage } from "../WikiImage.tsx";
import { Icon } from "./Icons.tsx";
import { hex } from "../TopBar.tsx";

const MAX_PORTRAITS = 4;

/**
 * Colonne de droite : l'état-major de la nation jouée (portraits tirés de la
 * bibliothèque Wikimedia) et l'accès à l'encyclopédie.
 */
export function RightColumn({ nation, onEncyclopedia }: { nation: string; onEncyclopedia(): void }) {
  const lib = useImageLibrary();
  const staff = lib.all.filter((r) => (r.kind === "general" || r.kind === "admiral") && r.nation === nation).slice(0, MAX_PORTRAITS);
  return (
    <aside className="rightcol" aria-label="État-major">
      {staff.length > 0 && <p className="eyebrow">État-major</p>}
      {staff.map((r) => (
        <a key={r.id} className="gen-portrait" href={r.wikipedia} target="_blank" rel="noreferrer" title={`${r.label} : article Wikipédia`}>
          <WikiImage id={r.id} alt={r.label} />
          <span className="nm">
            {lastName(r.label)}
            <small>{r.kind === "admiral" ? "Amiral" : "Général"}</small>
          </span>
        </a>
      ))}
      <button className="encyclo" onClick={onEncyclopedia}>
        <span className="r">
          <Icon name="i-livre" />
        </span>
        Encyclopédie
      </button>
    </aside>
  );
}

/** « Maurice Gamelin » → « Gamelin » ; garde les particules (« de Lattre »). */
function lastName(label: string): string {
  const parts = label.split(" ");
  if (parts.length <= 1) return label;
  const i = parts.findIndex((p, k) => k > 0 && /^(de|von|van|da|di)$/i.test(p));
  return i > 0 ? parts.slice(i).join(" ") : parts[parts.length - 1]!;
}

/**
 * Boîte en bas à gauche, en multijoueur : les joueurs de la partie.
 * Le chat lui-même arrivera avec le serveur de messages.
 */
export function PlayersBox({ players, me }: { players: readonly PlayerView[]; me: string }) {
  const [open, setOpen] = useState(true);
  return (
    <section className={`chat ${open ? "" : "closed"}`}>
      <button className="chat-h" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Icon name="i-chat" /> Salon de la partie
        <span className="online">{players.length} en ligne</span>
      </button>
      <div className="chat-b">
        {players.map((p) => {
          const n = NATIONS_1936.find((x) => x.id === p.nation);
          return (
            <p key={p.id}>
              <span className="a" style={{ color: n ? hex(n.color) : undefined }}>
                {p.name}
              </span>{" "}
              · {n?.name ?? "observateur"}
              {p.nation === me ? " (vous)" : ""}
            </p>
          );
        })}
        <div className="chat-in" aria-disabled="true">
          Le chat arrive bientôt
        </div>
      </div>
    </section>
  );
}
