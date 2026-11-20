import { useMemo, useState } from "react";
import { KIND_LABELS, imageSrc, useImageLibrary, type ImageKind } from "../media/images.ts";

/** Crédits des illustrations : auteur, licence et lien vers Commons pour chaque image. */
export function Credits({ onClose }: { onClose(): void }) {
  const lib = useImageLibrary();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ImageKind | "all">("all");
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lib.all.filter(
      (r) => (kind === "all" || r.kind === kind) && (!q || `${r.label} ${r.author} ${r.license}`.toLowerCase().includes(q)),
    );
  }, [lib, query, kind]);
  const kinds = Object.keys(KIND_LABELS) as ImageKind[];

  return (
    <div className="credits-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="credits" role="dialog" aria-label="Crédits des images">
        <header>
          <h2>Crédits des images</h2>
          <button onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>
        <p className="hint">
          {lib.all.length} illustrations tirées de Wikimedia Commons et Wikidata, toutes dans le domaine public ou sous licence
          libre. Merci à leurs auteurs.
        </p>
        <div className="credits-filters">
          <input id="credits-search" value={query} placeholder="Rechercher" onChange={(e) => setQuery(e.target.value)} />
          <div className="chips">
            <button className={kind === "all" ? "active" : ""} onClick={() => setKind("all")}>
              Tout
            </button>
            {kinds.map((k) => (
              <button key={k} className={kind === k ? "active" : ""} onClick={() => setKind(k)}>
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
        <ul className="credits-list">
          {list.map((r) => (
            <li key={r.id}>
              <img className={`wiki-img ${r.kind} ${r.sensitive ? "sensitive" : ""}`} src={imageSrc(r)} alt="" loading="lazy" />
              <div>
                <b>{r.label}</b>
                <span>{r.author}</span>
                <span>
                  {r.licenseUrl ? (
                    <a href={r.licenseUrl} target="_blank" rel="noreferrer">
                      {r.license}
                    </a>
                  ) : (
                    r.license
                  )}{" "}
                  ·{" "}
                  <a href={r.source} target="_blank" rel="noreferrer">
                    Commons
                  </a>{" "}
                  ·{" "}
                  <a href={r.wikipedia} target="_blank" rel="noreferrer">
                    Wikipédia
                  </a>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
