import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icons.tsx";
import { WikiImage } from "../WikiImage.tsx";

/** Panneaux ouverts par la colonne de gauche (et « province » au clic sur la carte). */
export type PanelId =
  | "province"
  | "journal"
  | "diplomatie"
  | "economie"
  | "armee"
  | "renseignement"
  | "recherche"
  | "production"
  | "objectifs";

export const MENU: { id: Exclude<PanelId, "province">; icon: IconName; label: string }[] = [
  { id: "journal", icon: "i-journal", label: "Journal" },
  { id: "diplomatie", icon: "i-diplomatie", label: "Diplomatie" },
  { id: "economie", icon: "i-economie", label: "Économie" },
  { id: "armee", icon: "i-armee", label: "Armée" },
  { id: "renseignement", icon: "i-renseignement", label: "Renseignement" },
  { id: "recherche", icon: "i-recherche", label: "Recherche" },
  { id: "production", icon: "i-production", label: "Production" },
  { id: "objectifs", icon: "i-objectifs", label: "Objectifs" },
];

/** Colonne de boutons ronds en métal, à gauche de la carte. */
export function LeftColumn({
  open,
  badges,
  onToggle,
}: {
  open: PanelId | null;
  badges: Partial<Record<PanelId, number>>;
  onToggle(id: PanelId): void;
}) {
  return (
    <nav className="leftcol" aria-label="Menus">
      {MENU.map((m) => (
        <button
          key={m.id}
          className={`rbtn ${open === m.id ? "on" : ""}`}
          aria-label={m.label}
          aria-pressed={open === m.id}
          onClick={() => onToggle(m.id)}
        >
          <Icon name={m.icon} />
          {badges[m.id] ? <span className="badge">{badges[m.id]}</span> : null}
          <span className="tip">{m.label}</span>
        </button>
      ))}
    </nav>
  );
}

/** Coque commune des panneaux latéraux : en-tête laiton, onglets éventuels, corps défilant. */
export function SidePanel({
  title,
  sub,
  flag,
  onClose,
  tabs,
  footer,
  children,
}: {
  title: string;
  sub?: ReactNode;
  /** Code de nation dont on montre le drapeau. */
  flag?: string;
  onClose(): void;
  tabs?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <aside className="sidepanel" aria-label={title}>
      <div className="panel">
        <div className="panel-h">
          {flag && (
            <span className="flag-s">
              <WikiImage id={`flag:${flag}`} alt="" />
            </span>
          )}
          <div className="ttl">
            <h3>{title}</h3>
            {sub && <div className="sub">{sub}</div>}
          </div>
          <button className="x" onClick={onClose} aria-label="Fermer">
            <Icon name="i-fermer" />
          </button>
        </div>
        {tabs}
        <div className="panel-b">{children}</div>
        {footer && <div className="panel-f">{footer}</div>}
      </div>
    </aside>
  );
}

/** Encart des fonctions qui arrivent plus tard, avec l'étape de la feuille de route. */
export function Soon({ step, children }: { step: string; children: ReactNode }) {
  return (
    <div className="soon card">
      <span className="stamp">À venir</span>
      <p>{children}</p>
      <p className="when">{step}</p>
    </div>
  );
}
