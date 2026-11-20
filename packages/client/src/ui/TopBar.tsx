import { NATIONS_1936, SPEEDS, formatDateFr, type Speed } from "@war-board/sim";
import type { SessionView } from "../session/types.ts";

const SPEED_LABELS: Record<Speed, string> = { 0: "❚❚", 1: "▶", 2: "▶▶", 5: "×5", 20: "×20" };
const SPEED_TITLES: Record<Speed, string> = {
  0: "Pause",
  1: "Vitesse normale : 1 jour pour 5 secondes",
  2: "Vitesse ×2",
  5: "Vitesse ×5 (test)",
  20: "Vitesse ×20 (test)",
};

interface Props {
  view: SessionView;
  mode: "solo" | "multi";
  onSpeed(speed: Speed): void;
  onQuit(): void;
}

export function TopBar({ view, mode, onSpeed, onQuit }: Props) {
  const nation = NATIONS_1936.find((n) => n.id === view.myNation);
  const me = NATIONS_1936.findIndex((n) => n.id === view.myNation);
  const enemies = view.wars
    .filter((w) => w[0] === me || w[1] === me)
    .map((w) => NATIONS_1936[w[0] === me ? w[1] : w[0]]!);
  const myUnits = view.units.filter((u) => u.nation === me).length;
  return (
    <header className="topbar">
      <div className="brand">War Board</div>
      <div className="nation">
        {nation ? (
          <>
            <span className="swatch" style={{ background: hex(nation.color) }} />
            {nation.name}
          </>
        ) : (
          "Observateur"
        )}
      </div>
      {nation && (
        <div className="army" title="Divisions terrestres">
          {myUnits} division{myUnits > 1 ? "s" : ""}
        </div>
      )}
      {enemies.length > 0 && (
        <div className="wars" title="Nations en guerre contre vous">
          En guerre :{" "}
          {enemies.map((e) => (
            <span key={e.id} className="enemy">
              <span className="swatch" style={{ background: hex(e.color) }} />
              {e.short ?? e.name}
            </span>
          ))}
        </div>
      )}
      <div className="date" aria-live="polite">
        {formatDateFr(view.day)}
      </div>
      <div className="speeds" role="group" aria-label="Vitesse de jeu">
        {SPEEDS.map((s) => (
          <button
            key={s}
            className={view.speed === s ? "active" : ""}
            disabled={!view.isHost}
            title={view.isHost ? SPEED_TITLES[s] : "Seul l'hôte règle la vitesse"}
            onClick={() => onSpeed(s)}
          >
            {SPEED_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="mode">
        {mode === "solo" ? "Solo" : `Multijoueur · ${view.players.length} joueur${view.players.length > 1 ? "s" : ""}`}
        {view.status === "connecting" && " · connexion…"}
        {view.status === "closed" && " · déconnecté"}
      </div>
      <button className="quit" onClick={onQuit}>
        Quitter
      </button>
    </header>
  );
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}
