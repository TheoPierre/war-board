import { useEffect, useRef, useState } from "react";
import type { Topology } from "topojson-specification";
import { MAP_1936, type Battle, type Unit } from "@war-board/sim";
import { MapRenderer, layerColors, topoShapes, type MapLayer } from "./MapRenderer.ts";
import { Minimap } from "./Minimap.ts";
import { Icon, type IconName } from "../ui/hud/Icons.tsx";

const LAYERS: { id: MapLayer | null; icon: IconName; label: string }[] = [
  { id: "political", icon: "i-politique", label: "Politique" },
  { id: "diplomatic", icon: "i-diplo2", label: "Diplomatie : vous, vos ennemis, les autres" },
  { id: null, icon: "i-terrain", label: "Terrain (à venir)" },
  { id: null, icon: "i-ressources", label: "Ressources (à venir)" },
  { id: null, icon: "i-ravitaillement", label: "Ravitaillement (à venir)" },
];

/**
 * Les noms de pays sont dessinés par PixiJS avec la police Oswald : on attend
 * qu'elle soit chargée (au plus 3 secondes) pour ne pas figer une police de secours.
 */
function loadMapFonts(): Promise<unknown> {
  if (!document.fonts) return Promise.resolve();
  const fonts = Promise.all([document.fonts.load("500 40px Oswald"), document.fonts.load("400 12px 'Roboto Condensed'")]);
  return Promise.race([fonts, new Promise((r) => setTimeout(r, 3000))]).catch(() => undefined);
}

interface Props {
  owners: readonly number[];
  ownersVersion: number;
  selected: number | null;
  onSelect(id: number | null): void;
  onHover(id: number | null): void;
  units: readonly Unit[];
  battles: readonly Battle[];
  /** Index de la nation jouée, -1 pour un observateur. */
  myNation: number;
  selectedUnits: ReadonlySet<number>;
  /** Nations en guerre avec la nation jouée. */
  hostile: ReadonlySet<number>;
  onUnitsClick(ids: number[], additive: boolean): void;
  onBoxSelect(ids: number[]): void;
  onOrder(province: number): void;
}

let topoPromise: Promise<Topology> | null = null;
function loadTopo(): Promise<Topology> {
  topoPromise ??= fetch(`${import.meta.env.BASE_URL}map/world-1936.topo.json`).then((r) => {
    if (!r.ok) throw new Error(`carte introuvable (${r.status})`);
    return r.json() as Promise<Topology>;
  });
  return topoPromise;
}

export function MapView(props: Props) {
  const { owners, ownersVersion, selected, onSelect, onHover, units, battles, myNation, selectedUnits, hostile } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const miniHostRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<Minimap | null>(null);
  const [layer, setLayer] = useState<MapLayer>("political");
  const layerRef = useRef(layer);
  layerRef.current = layer;
  const callbacks = useRef(props);
  callbacks.current = props;
  const latest = useRef({ owners, ownersVersion, selected, units, battles, myNation, selectedUnits, hostile });
  latest.current = { owners, ownersVersion, selected, units, battles, myNation, selectedUnits, hostile };
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const host = hostRef.current!;
    let renderer: MapRenderer | null = null;
    let cancelled = false;
    let minimap: Minimap | null = null;
    Promise.all([loadTopo(), loadMapFonts()])
      .then(async ([topo]) => {
        if (cancelled) return;
        if (miniHostRef.current) {
          minimap = new Minimap(miniHostRef.current, topoShapes(topo), MAP_1936, (x, y) => rendererRef.current?.centerOn(x, y));
          minimapRef.current = minimap;
        }
        renderer = new MapRenderer(host, topo, MAP_1936, {
          onSelect: (id) => callbacks.current.onSelect(id),
          onHover: (id) => callbacks.current.onHover(id),
          onUnitsClick: (ids, additive) => callbacks.current.onUnitsClick(ids, additive),
          onBoxSelect: (ids) => callbacks.current.onBoxSelect(ids),
          onOrder: (p) => callbacks.current.onOrder(p),
          onView: (v) => minimapRef.current?.setView(v),
        });
        rendererRef.current = renderer;
        const l = latest.current;
        renderer.setOwners(l.owners, l.ownersVersion);
        renderer.setLayer(layerRef.current);
        renderer.setUnits(l.units, l.battles, l.myNation, l.selectedUnits, l.hostile);
        await renderer.init();
        renderer.setSelected(latest.current.selected);
        drawMinimap();
        if (!cancelled) setLoading(false);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
      renderer?.destroy();
      rendererRef.current = null;
      minimap?.destroy();
      minimapRef.current = null;
    };
  }, []);

  /** Mini-carte : redessinée quand les frontières, le calque ou les guerres changent. */
  const drawMinimap = () => {
    const l = latest.current;
    minimapRef.current?.draw(l.owners, layerColors(layerRef.current, l.myNation, l.hostile));
  };

  useEffect(() => {
    rendererRef.current?.setOwners(owners, ownersVersion);
  }, [owners, ownersVersion]);

  useEffect(() => {
    rendererRef.current?.setLayer(layer);
    drawMinimap();
  }, [layer, ownersVersion, hostile, myNation]);

  useEffect(() => {
    rendererRef.current?.setSelected(selected);
  }, [selected]);

  useEffect(() => {
    rendererRef.current?.setUnits(units, battles, myNation, selectedUnits, hostile);
  }, [units, battles, myNation, selectedUnits, hostile]);

  return (
    <div className="map-host" ref={hostRef}>
      {loading && !error && <div className="map-overlay">Chargement de la carte…</div>}
      {error && <div className="map-overlay error">Impossible d'afficher la carte : {error}</div>}
      <div className="map-controls">
        <div className="layers" role="group" aria-label="Calques de la carte">
          {LAYERS.map((l) => (
            <button
              key={l.icon}
              className={`lbtn ${l.id && l.id === layer ? "on" : ""}`}
              disabled={!l.id}
              aria-label={l.label}
              aria-pressed={l.id === layer}
              onClick={() => l.id && setLayer(l.id)}
            >
              <Icon name={l.icon} />
              <span className="tip">{l.label}</span>
            </button>
          ))}
        </div>
        <div className="mini-row">
          <div className="zoom-buttons">
            <button className="lbtn" onClick={() => rendererRef.current?.zoomBy(1.4)} aria-label="Zoomer">
              <Icon name="i-plus" />
            </button>
            <button className="lbtn" onClick={() => rendererRef.current?.zoomBy(1 / 1.4)} aria-label="Dézoomer">
              <span className="minus" />
            </button>
            <button className="lbtn" onClick={() => rendererRef.current?.fitToView()} aria-label="Recentrer sur la capitale">
              <Icon name="i-cible" />
            </button>
          </div>
          <div className="minimap" ref={miniHostRef} aria-label="Mini-carte : cliquez pour vous y rendre" />
        </div>
      </div>
    </div>
  );
}
