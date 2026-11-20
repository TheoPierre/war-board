import { useEffect, useRef, useState } from "react";
import type { Topology } from "topojson-specification";
import { MAP_1936, type Battle, type Unit } from "@war-board/sim";
import { MapRenderer } from "./MapRenderer.ts";

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
    loadTopo()
      .then(async (topo) => {
        if (cancelled) return;
        renderer = new MapRenderer(host, topo, MAP_1936, {
          onSelect: (id) => callbacks.current.onSelect(id),
          onHover: (id) => callbacks.current.onHover(id),
          onUnitsClick: (ids, additive) => callbacks.current.onUnitsClick(ids, additive),
          onBoxSelect: (ids) => callbacks.current.onBoxSelect(ids),
          onOrder: (p) => callbacks.current.onOrder(p),
        });
        rendererRef.current = renderer;
        const l = latest.current;
        renderer.setOwners(l.owners, l.ownersVersion);
        renderer.setUnits(l.units, l.battles, l.myNation, l.selectedUnits, l.hostile);
        await renderer.init();
        renderer.setSelected(latest.current.selected);
        if (!cancelled) setLoading(false);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
      renderer?.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setOwners(owners, ownersVersion);
  }, [owners, ownersVersion]);

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
      <div className="zoom-buttons">
        <button onClick={() => rendererRef.current?.zoomBy(1.4)} aria-label="Zoomer">+</button>
        <button onClick={() => rendererRef.current?.zoomBy(1 / 1.4)} aria-label="Dézoomer">−</button>
        <button onClick={() => rendererRef.current?.fitToView()} aria-label="Recentrer">⌂</button>
      </div>
    </div>
  );
}
