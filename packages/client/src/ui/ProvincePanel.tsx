import { useState } from "react";
import { MAP_1936, NATIONS_1936, atWar, type Unit } from "@war-board/sim";
import { hex } from "./TopBar.tsx";

interface Props {
  province: number;
  owners: readonly number[];
  myNation: string;
  debug: boolean;
  units: readonly Unit[];
  wars: readonly (readonly [number, number])[];
  onClose(): void;
  onTransfer(province: number, to: string): void;
  onDeclareWar(target: string): void;
}

export function ProvincePanel({ province, owners, myNation, debug, units, wars, onClose, onTransfer, onDeclareWar }: Props) {
  const [confirmWar, setConfirmWar] = useState<number | null>(null);
  const p = MAP_1936.provinces[province];
  if (!p) return null;
  const owner = NATIONS_1936[owners[province] ?? -1];
  const original = NATIONS_1936.find((n) => n.id === p.owner);
  const capitalOf = Object.entries(MAP_1936.capitals).find(([, id]) => id === province)?.[0];
  const capitalNation = NATIONS_1936.find((n) => n.id === capitalOf);
  const me = NATIONS_1936.findIndex((n) => n.id === myNation);
  const ownerIdx = owners[province] ?? -1;
  const enemy = me >= 0 && ownerIdx >= 0 && ownerIdx !== me && atWar({ wars: wars as [number, number][] }, me, ownerIdx);
  const here = new Map<number, number>();
  for (const u of units) if (u.province === province) here.set(u.nation, (here.get(u.nation) ?? 0) + 1);
  return (
    <aside className="panel">
      <button className="close" onClick={onClose} aria-label="Fermer">
        ×
      </button>
      <h2>{p.name}</h2>
      {owner && (
        <p className="owner">
          <span className="swatch" style={{ background: hex(owner.color) }} />
          {owner.name}
        </p>
      )}
      <dl>
        {capitalNation && (
          <>
            <dt>Capitale</dt>
            <dd>{capitalNation.name}</dd>
          </>
        )}
        <dt>Surface</dt>
        <dd>{p.km2.toLocaleString("fr-FR")} km²</dd>
        <dt>Accès à la mer</dt>
        <dd>{p.coastal ? "Oui" : "Non"}</dd>
        <dt>Provinces voisines</dt>
        <dd>{p.neighbors.length}</dd>
        <dt>Divisions</dt>
        <dd>
          {here.size === 0
            ? "Aucune"
            : [...here].map(([n, c]) => (
                <span key={n} className="unit-count">
                  <span className="swatch" style={{ background: hex(NATIONS_1936[n]!.color) }} />
                  {c}
                </span>
              ))}
        </dd>
        {original && owner && original.id !== owner.id && (
          <>
            <dt>En 1936</dt>
            <dd>{original.name}</dd>
          </>
        )}
      </dl>
      {enemy && <p className="at-war">En guerre avec vous</p>}
      {me >= 0 && owner && ownerIdx !== me && !enemy && (
        confirmWar === ownerIdx ? (
          <div className="confirm">
            <p>Déclarer la guerre à {owner.name} ?</p>
            <button
              className="danger"
              onClick={() => {
                onDeclareWar(owner.id);
                setConfirmWar(null);
              }}
            >
              Confirmer
            </button>
            <button onClick={() => setConfirmWar(null)}>Annuler</button>
          </div>
        ) : (
          <button className="war" onClick={() => setConfirmWar(ownerIdx)}>
            Déclarer la guerre
          </button>
        )
      )}
      {debug && myNation && owner?.id !== myNation && (
        <button className="debug" onClick={() => onTransfer(province, myNation)} title="Outil de test du prototype">
          Annexer (test)
        </button>
      )}
    </aside>
  );
}
