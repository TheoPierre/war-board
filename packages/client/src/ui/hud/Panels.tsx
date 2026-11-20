import { useMemo, useState } from "react";
import { MAX_HP, NATIONS_1936, UNIT_TYPES, divisionLabel, formatDateFr, type Unit } from "@war-board/sim";
import { leaderOf, useImageLibrary } from "../../media/images.ts";
import { WikiImage } from "../WikiImage.tsx";
import { Icon } from "./Icons.tsx";
import { SidePanel, Soon } from "./Panel.tsx";
import { UnitSymbol } from "./UnitSymbol.tsx";

export interface JournalEntry {
  id: number;
  text: string;
  bad: boolean;
  /** Jour de jeu où le message est arrivé. */
  day: number;
}

/** Journal : tous les télégrammes de la partie, du plus récent au plus ancien. */
export function JournalPanel({ entries, onClose }: { entries: readonly JournalEntry[]; onClose(): void }) {
  return (
    <SidePanel title="Journal" sub={`${entries.length} télégramme${entries.length > 1 ? "s" : ""}`} onClose={onClose}>
      {entries.length === 0 && <p className="muted">Aucun télégramme pour l'instant. Les batailles et les ordres refusés s'afficheront ici.</p>}
      <ol className="journal">
        {[...entries].reverse().map((e) => (
          <li key={e.id} className={e.bad ? "alerte" : ""}>
            <span className="when">{formatDateFr(e.day)}</span>
            {e.text}
          </li>
        ))}
      </ol>
    </SidePanel>
  );
}

/** Diplomatie : nations en guerre, grandes puissances, puis les autres ; déclaration de guerre. */
export function DiplomacyPanel({
  myNation,
  wars,
  onDeclareWar,
  onClose,
}: {
  myNation: number;
  wars: readonly (readonly [number, number])[];
  onDeclareWar(target: string): void;
  onClose(): void;
}) {
  const lib = useImageLibrary();
  const [picked, setPicked] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [query, setQuery] = useState("");
  const enemies = new Set(wars.filter((w) => w.includes(myNation)).map((w) => (w[0] === myNation ? w[1] : w[0])));
  const all = NATIONS_1936.map((n, i) => ({ n, i })).filter((x) => x.i !== myNation);
  const q = query.trim().toLowerCase();
  const match = (x: { n: { name: string } }) => !q || x.n.name.toLowerCase().includes(q);
  const groups = [
    { title: "En guerre", list: all.filter((x) => enemies.has(x.i)) },
    { title: "Grandes puissances", list: all.filter((x) => !enemies.has(x.i) && x.n.major) },
    { title: "Autres nations", list: all.filter((x) => !enemies.has(x.i) && !x.n.major) },
  ];
  const sel = picked !== null ? NATIONS_1936[picked] : undefined;
  const selLeader = sel ? leaderOf(lib, sel.id) : undefined;

  const footer = sel ? (
    <div className="dip-actions">
      <div className="dip-who">
        {selLeader && <WikiImage id={selLeader.id} className="mini-portrait" />}
        <div>
          <b>{sel.name}</b>
          <small>{selLeader ? selLeader.label : "Dirigeant inconnu"}</small>
        </div>
      </div>
      {enemies.has(picked!) ? (
        <span className="tag war">
          <Icon name="i-epees" /> En guerre
        </span>
      ) : myNation < 0 ? null : confirm ? (
        <div className="confirm">
          <p>
            Déclarer la guerre à <b>{sel.name}</b> ?
          </p>
          <div className="row">
            <button
              className="btn btn-rouge"
              onClick={() => {
                onDeclareWar(sel.id);
                setConfirm(false);
              }}
            >
              Confirmer
            </button>
            <button className="btn btn-acier" onClick={() => setConfirm(false)}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="row">
          <button className="btn btn-rouge" onClick={() => setConfirm(true)}>
            <Icon name="i-epees" /> Déclarer la guerre
          </button>
          <button className="btn btn-acier" disabled title="Alliances et pactes : plus tard dans la feuille de route">
            Proposer un pacte
          </button>
        </div>
      )}
    </div>
  ) : null;

  return (
    <SidePanel
      title="Diplomatie"
      sub={enemies.size ? `En guerre contre ${enemies.size} nation${enemies.size > 1 ? "s" : ""}` : "En paix avec le monde"}
      flag={NATIONS_1936[myNation]?.id}
      onClose={onClose}
      footer={footer}
    >
      <input className="search" value={query} placeholder="Chercher une nation" onChange={(e) => setQuery(e.target.value)} />
      {groups.map(
        (g) =>
          g.list.filter(match).length > 0 && (
            <section key={g.title}>
              <p className="eyebrow">{g.title}</p>
              {g.list.filter(match).map(({ n, i }) => (
                <button
                  key={n.id}
                  className={`dip-row ${picked === i ? "on" : ""}`}
                  onClick={() => {
                    setPicked(i);
                    setConfirm(false);
                  }}
                >
                  <span className="fl">
                    <WikiImage id={`flag:${n.id}`} alt="" />
                  </span>
                  <span className="nm">{n.name}</span>
                  <span className={`tag ${enemies.has(i) ? "war" : "peace"}`}>{enemies.has(i) ? "Guerre" : "Paix"}</span>
                </button>
              ))}
            </section>
          ),
      )}
    </SidePanel>
  );
}

/** Armée : divisions de la nation jouée, par type. Un clic sélectionne sur la carte. */
export function ArmyPanel({
  units,
  myNation,
  onSelect,
  onClose,
}: {
  units: readonly Unit[];
  myNation: number;
  onSelect(ids: number[]): void;
  onClose(): void;
}) {
  const mine = useMemo(() => units.filter((u) => u.nation === myNation), [units, myNation]);
  const byType = UNIT_TYPES.map((t, i) => ({ t, list: mine.filter((u) => u.type === i).sort((a, b) => a.num - b.num) })).filter(
    (g) => g.list.length,
  );
  return (
    <SidePanel
      title="Armée"
      sub={`${mine.length} division${mine.length > 1 ? "s" : ""} terrestre${mine.length > 1 ? "s" : ""}`}
      flag={NATIONS_1936[myNation]?.id}
      onClose={onClose}
    >
      {mine.length === 0 && <p className="muted">Aucune division.</p>}
      {byType.map(({ t, list }) => {
        const hp = list.reduce((a, u) => a + u.hp, 0) / list.length / MAX_HP;
        return (
          <section key={t.id} className="card army-group">
            <header onClick={() => onSelect(list.map((u) => u.id))} title="Sélectionner toutes ces divisions">
              <span className="token" style={{ background: nationColor(myNation) }}>
                <UnitSymbol type={t.id} />
              </span>
              <div>
                <b>{t.name}</b>
                <small>
                  {list.length} division{list.length > 1 ? "s" : ""} · attaque {t.attack} · défense {t.defense} · {t.speed} km/j
                </small>
              </div>
              <span className="pct">{Math.round(hp * 100)} %</span>
            </header>
            <ul>
              {list.slice(0, 60).map((u) => (
                <li key={u.id}>
                  <button onClick={() => onSelect([u.id])}>
                    <span>{divisionLabel(u.type, u.num)}</span>
                    <span className="bar g small">
                      <i style={{ width: `${(u.hp / MAX_HP) * 100}%` }} className={u.hp < MAX_HP / 2 ? "low" : ""} />
                    </span>
                  </button>
                </li>
              ))}
              {list.length > 60 && <li className="muted">… et {list.length - 60} autres</li>}
            </ul>
          </section>
        );
      })}
    </SidePanel>
  );
}

/** Production : le catalogue des divisions est réel, la file de production arrive avec l'économie. */
export function ProductionPanel({ myNation, onClose }: { myNation: number; onClose(): void }) {
  return (
    <SidePanel title="Production" sub="Usines et file de construction" flag={NATIONS_1936[myNation]?.id} onClose={onClose}>
      <Soon step="Étape 2 de la feuille de route : économie et production.">
        La file de production (glisser-déposer, coûts en acier, pétrole et main-d'œuvre) arrive avec l'économie.
      </Soon>
      <p className="eyebrow">Catalogue des divisions</p>
      <div className="catalog">
        {UNIT_TYPES.map((t) => (
          <div key={t.id} className="cat-item card">
            <UnitSymbol type={t.id} />
            <b>{t.name}</b>
            <small>
              Att. {t.attack} · Déf. {t.defense}
            </small>
            <small>{t.speed} km/j</small>
          </div>
        ))}
      </div>
    </SidePanel>
  );
}

const SOON: Record<string, { title: string; sub: string; step: string; text: string }> = {
  economie: {
    title: "Économie",
    sub: "Ressources, commerce, usines",
    step: "Étape 2 de la feuille de route : économie et production.",
    text: "Les sept ressources de la barre du haut, les bâtiments des provinces et le commerce arrivent avec l'économie.",
  },
  renseignement: {
    title: "Renseignement",
    sub: "Espions et reconnaissance",
    step: "Après la marine (étape 5).",
    text: "Réseaux d'espions, brouillard de guerre et rapports sur les armées adverses.",
  },
  recherche: {
    title: "Recherche",
    sub: "Doctrines et matériels",
    step: "Après la marine (étape 5).",
    text: "Améliorer les divisions (chars, artillerie, aviation) au fil des années 1936 à 1945.",
  },
  objectifs: {
    title: "Objectifs",
    sub: "Focus nationaux",
    step: "Après la diplomatie : les focus.",
    text: "Arbre de focus léger, façon Hearts of Iron IV, avec les grands choix historiques de chaque nation.",
  },
};

export function SoonPanel({ id, myNation, onClose }: { id: keyof typeof SOON; myNation: number; onClose(): void }) {
  const s = SOON[id]!;
  return (
    <SidePanel title={s.title} sub={s.sub} flag={NATIONS_1936[myNation]?.id} onClose={onClose}>
      <Soon step={s.step}>{s.text}</Soon>
    </SidePanel>
  );
}

export function nationColor(i: number): string {
  return `#${(NATIONS_1936[i]?.color ?? 0x888888).toString(16).padStart(6, "0")}`;
}
