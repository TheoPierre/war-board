import { MAP_1936, NATIONS_1936 } from "@war-board/sim";
import { hex } from "./TopBar.tsx";

interface Props {
  province: number;
  owners: readonly number[];
  myNation: string;
  debug: boolean;
  onClose(): void;
  onTransfer(province: number, to: string): void;
}

export function ProvincePanel({ province, owners, myNation, debug, onClose, onTransfer }: Props) {
  const p = MAP_1936.provinces[province];
  if (!p) return null;
  const owner = NATIONS_1936[owners[province] ?? -1];
  const original = NATIONS_1936.find((n) => n.id === p.owner);
  const capitalOf = Object.entries(MAP_1936.capitals).find(([, id]) => id === province)?.[0];
  const capitalNation = NATIONS_1936.find((n) => n.id === capitalOf);
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
        {original && owner && original.id !== owner.id && (
          <>
            <dt>En 1936</dt>
            <dd>{original.name}</dd>
          </>
        )}
      </dl>
      {debug && myNation && owner?.id !== myNation && (
        <button className="debug" onClick={() => onTransfer(province, myNation)} title="Outil de test du prototype">
          Annexer (test)
        </button>
      )}
    </aside>
  );
}
