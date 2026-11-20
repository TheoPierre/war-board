import { useState } from "react";
import { MAP_1936, NATIONS_1936, UNIT_TYPES, atWar, type Unit } from "@war-board/sim";
import { hex } from "./TopBar.tsx";
import { SidePanel } from "./hud/Panel.tsx";
import { Icon } from "./hud/Icons.tsx";
import { WikiImage } from "./WikiImage.tsx";
import { useImageLibrary } from "../media/images.ts";

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

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Fiche de la province sélectionnée, dans le panneau latéral. */
export function ProvincePanel({ province, owners, myNation, debug, units, wars, onClose, onTransfer, onDeclareWar }: Props) {
  const [confirmWar, setConfirmWar] = useState<number | null>(null);
  const lib = useImageLibrary();
  const p = MAP_1936.provinces[province];
  if (!p) return null;
  const owner = NATIONS_1936[owners[province] ?? -1];
  const original = NATIONS_1936.find((n) => n.id === p.owner);
  const capitalOf = Object.entries(MAP_1936.capitals).find(([, id]) => id === province)?.[0];
  const capitalNation = NATIONS_1936.find((n) => n.id === capitalOf);
  const me = NATIONS_1936.findIndex((n) => n.id === myNation);
  const ownerIdx = owners[province] ?? -1;
  const enemy = me >= 0 && ownerIdx >= 0 && ownerIdx !== me && atWar({ wars: wars as [number, number][] }, me, ownerIdx);
  const here = new Map<number, Unit[]>();
  for (const u of units) if (u.province === province) here.set(u.nation, [...(here.get(u.nation) ?? []), u]);
  // Une photo de la ville, si la bibliothèque en a une du même nom.
  const city = lib.all.find((r) => r.kind === "city" && fold(r.label) === fold(p.name));

  return (
    <SidePanel
      title={p.name}
      sub={owner ? `${owner.name}${capitalNation ? " · capitale" : ""}` : "Territoire sans maître"}
      flag={owner?.id}
      onClose={onClose}
    >
      {city && (
        <figure className="city-photo">
          <WikiImage id={city.id} />
          <figcaption>
            <a href={city.wikipedia} target="_blank" rel="noreferrer">
              {city.label} sur Wikipédia
            </a>
          </figcaption>
        </figure>
      )}
      <dl className="kv">
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

      <div>
        <p className="eyebrow">Divisions présentes</p>
        {here.size === 0 ? (
          <p className="muted">Aucune division dans cette province.</p>
        ) : (
          <div className="tags">
            {[...here].map(([n, list]) => (
              <span key={n} className="tag" title={summary(list)}>
                <span className="dot" style={{ background: hex(NATIONS_1936[n]!.color) }} />
                {NATIONS_1936[n]!.short ?? NATIONS_1936[n]!.name} · {list.length}
              </span>
            ))}
          </div>
        )}
      </div>

      {enemy && (
        <p className="tag war">
          <Icon name="i-epees" /> En guerre avec vous
        </p>
      )}
      {me >= 0 && owner && ownerIdx !== me && !enemy &&
        (confirmWar === ownerIdx ? (
          <div className="confirm">
            <p>
              Déclarer la guerre à <b>{owner.name}</b> ? Vos divisions pourront entrer sur son territoire.
            </p>
            <div className="row">
              <button
                className="btn btn-rouge"
                onClick={() => {
                  onDeclareWar(owner.id);
                  setConfirmWar(null);
                }}
              >
                Confirmer
              </button>
              <button className="btn btn-acier" onClick={() => setConfirmWar(null)}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-rouge wide" onClick={() => setConfirmWar(ownerIdx)}>
            <Icon name="i-epees" /> Déclarer la guerre
          </button>
        ))}
      {debug && myNation && owner?.id !== myNation && (
        <button className="btn btn-ghost wide" onClick={() => onTransfer(province, myNation)} title="Outil de test du prototype">
          Annexer (test)
        </button>
      )}
    </SidePanel>
  );
}

function summary(list: Unit[]): string {
  const byType = new Map<number, number>();
  for (const u of list) byType.set(u.type, (byType.get(u.type) ?? 0) + 1);
  return [...byType].map(([t, n]) => `${n} ${UNIT_TYPES[t]!.name.toLowerCase()}`).join(", ");
}
