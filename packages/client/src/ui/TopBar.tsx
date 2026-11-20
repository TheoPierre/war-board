import { NATIONS_1936, SPEEDS, formatDateFr, type Speed } from "@war-board/sim";
import type { SessionView } from "../session/types.ts";
import { leaderOf, useImageLibrary } from "../media/images.ts";
import { WikiImage } from "./WikiImage.tsx";
import { Icon, type IconName } from "./hud/Icons.tsx";

const SPEED_LABELS: Record<Speed, string> = { 0: "", 1: "▶", 2: "▶▶", 5: "×5", 20: "×20" };
const SPEED_TITLES: Record<Speed, string> = {
  0: "Pause",
  1: "Vitesse normale : 1 jour pour 5 secondes",
  2: "Vitesse ×2",
  5: "Vitesse ×5 (test)",
  20: "Vitesse ×20 (test)",
};

/** Les sept ressources de la maquette. L'économie arrive à l'étape 2 de la feuille de route. */
const RESOURCES: { icon: IconName; name: string }[] = [
  { icon: "i-argent", name: "Argent" },
  { icon: "i-nourriture", name: "Nourriture" },
  { icon: "i-acier", name: "Acier" },
  { icon: "i-petrole", name: "Pétrole" },
  { icon: "i-caoutchouc", name: "Caoutchouc" },
  { icon: "i-maindoeuvre", name: "Main-d'œuvre" },
  { icon: "i-munitions", name: "Munitions" },
];

interface Props {
  view: SessionView;
  mode: "solo" | "multi";
  onSpeed(speed: Speed): void;
  onQuit(): void;
}

export function TopBar({ view, mode, onSpeed, onQuit }: Props) {
  const lib = useImageLibrary();
  const nation = NATIONS_1936.find((n) => n.id === view.myNation);
  const leader = nation ? leaderOf(lib, nation.id) : undefined;
  const status =
    view.status === "connecting" ? " · connexion…" : view.status === "closed" ? " · déconnecté" : "";
  return (
    <header className="topbar">
      <div className="nation">
        <div className="flag-frame">{nation ? <WikiImage id={`flag:${nation.id}`} alt={`Drapeau : ${nation.name}`} /> : null}</div>
        <div className="who">
          <span className="leader">{nation ? (leader?.label ?? nation.name) : "Observateur"}</span>
          <span className="pays">{nation ? nation.name : "Sans nation"}</span>
          <span className="mode">
            {mode === "solo" ? "Partie solo" : `Multijoueur · ${view.players.length} joueur${view.players.length > 1 ? "s" : ""}`}
            {status}
          </span>
        </div>
      </div>

      <div className="resources" title="Les ressources arrivent avec l'économie (étape 2 de la feuille de route).">
        {RESOURCES.map((r) => (
          <div key={r.name} className="res" aria-label={`${r.name} : à venir`}>
            <Icon name={r.icon} />
            <span className="v">—</span>
            <span className="d">{r.name}</span>
          </div>
        ))}
      </div>

      <div className="clock">
        <div className="date" aria-live="polite">
          {formatDateFr(view.day)}
        </div>
        <div className="speeds" role="group" aria-label="Vitesse de jeu">
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={view.speed === s ? "on" : ""}
              disabled={!view.isHost}
              title={view.isHost ? SPEED_TITLES[s] : "Seul l'hôte règle la vitesse"}
              aria-label={SPEED_TITLES[s]}
              aria-pressed={view.speed === s}
              onClick={() => onSpeed(s)}
            >
              {s === 0 ? <Icon name="i-pause" /> : SPEED_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="sysbtns">
        <button title="Plein écran" aria-label="Plein écran" onClick={toggleFullscreen}>
          <Icon name="i-plein" />
        </button>
        <button title="Quitter la partie" aria-label="Quitter la partie" onClick={onQuit}>
          <Icon name="i-quitter" />
        </button>
      </div>
    </header>
  );
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => undefined);
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}
