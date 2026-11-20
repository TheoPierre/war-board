import { useState } from "react";
import { NATIONS_1936 } from "@war-board/sim";
import { hex } from "./TopBar.tsx";

export interface LobbyChoice {
  mode: "solo" | "multi";
  nation: string;
  name: string;
}

export function Lobby({ onStart, error }: { onStart(choice: LobbyChoice): void; error?: string }) {
  const [nation, setNation] = useState("FRA");
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem("warboard.name") ?? "";
    } catch {
      return "";
    }
  });
  const majors = NATIONS_1936.filter((n) => n.major);
  const minors = NATIONS_1936.filter((n) => !n.major).sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const start = (mode: "solo" | "multi") => {
    try {
      localStorage.setItem("warboard.name", name);
    } catch {
      /* stockage indisponible */
    }
    onStart({ mode, nation, name: name.trim() || "Joueur" });
  };

  return (
    <div className="lobby">
      <div className="lobby-card">
        <h1>War Board</h1>
        <p className="subtitle">Le monde au 1er janvier 1936 · prototype</p>
        {error && <p className="error">{error}</p>}
        <label className="field">
          Votre nom
          <input value={name} maxLength={32} placeholder="Joueur" onChange={(e) => setName(e.target.value)} />
        </label>
        <h3>Grandes puissances</h3>
        <div className="nations">
          {majors.map((n) => (
            <NationButton key={n.id} id={n.id} name={n.name} color={n.color} active={nation === n.id} onClick={setNation} />
          ))}
        </div>
        <h3>Autres nations</h3>
        <div className="nations small">
          {minors.map((n) => (
            <NationButton key={n.id} id={n.id} name={n.name} color={n.color} active={nation === n.id} onClick={setNation} />
          ))}
        </div>
        <div className="actions">
          <button className="primary" onClick={() => start("solo")}>
            Jouer en solo
          </button>
          <button onClick={() => start("multi")}>Rejoindre la partie multijoueur</button>
        </div>
        <p className="hint">
          Un jour de jeu dure 5 secondes. En multijoueur, le premier joueur arrivé règle la vitesse (8 joueurs au plus).
        </p>
      </div>
    </div>
  );
}

function NationButton(props: { id: string; name: string; color: number; active: boolean; onClick(id: string): void }) {
  return (
    <button className={`nation-btn ${props.active ? "active" : ""}`} onClick={() => props.onClick(props.id)}>
      <span className="swatch" style={{ background: hex(props.color) }} />
      {props.name}
    </button>
  );
}
