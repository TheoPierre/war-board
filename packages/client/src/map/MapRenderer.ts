import { Application, Container, CullerPlugin, Graphics, Text, extensions, type FederatedPointerEvent } from "pixi.js";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { MultiLineString, MultiPolygon, Polygon } from "geojson";
import { NATIONS_1936, type Battle, type MapDef, type Unit } from "@war-board/sim";
import { MAP_THEME as TH } from "./theme.ts";
import { UnitLayer } from "./UnitLayer.ts";

const SELECT = TH.select;

// Ne dessine que ce qui est à l'écran : indispensable avec la carte du monde.
extensions.add(CullerPlugin);

interface Shape {
  /** Anneaux aplatis [x0, y0, x1, y1, ...] ; le premier de chaque polygone est l'extérieur. */
  polygons: number[][][];
  bbox: [number, number, number, number];
}

export interface MapCallbacks {
  /** Clic gauche sur une province (hors pion du joueur). */
  onSelect(province: number | null): void;
  onHover(province: number | null): void;
  /** Clic sur un pion du joueur ; `additive` avec Maj. */
  onUnitsClick(ids: number[], additive: boolean): void;
  /** Sélection au rectangle (Maj + glisser). */
  onBoxSelect(ids: number[]): void;
  /** Clic droit sur une province : ordre de déplacement. */
  onOrder(province: number): void;
}

/**
 * Dessine la carte des provinces avec PixiJS : remplissage par propriétaire,
 * frontières de provinces et de nations, noms, sélection, déplacement et zoom.
 */
export class MapRenderer {
  private app = new Application();
  // Groupe de rendu : la géométrie fixe reste sur la carte graphique, seul le déplacement change.
  private world = new Container({ isRenderGroup: true });
  private fills: Graphics[] = [];
  private provinceBorders = new Graphics();
  private nationBorders = new Graphics();
  private highlight = new Graphics();
  private hoverOutline = new Graphics();
  private capitalsLayer = new Graphics();
  private nationLabels = new Container();
  private provinceLabels = new Container();
  private shapes: Shape[] = [];
  private owners: readonly number[] = [];
  private ownersVersion = -1;
  private selected: number | null = null;
  private hovered: number | null = null;
  private borderScale = 0;
  private destroyed = false;
  private ready = false;
  private resizeObserver?: ResizeObserver;
  private unitLayer: UnitLayer;
  private boxGraphics = new Graphics();
  private unitData: {
    units: readonly Unit[];
    battles: readonly Battle[];
    myNation: number;
    selected: ReadonlySet<number>;
    hostile: ReadonlySet<number>;
  } = { units: [], battles: [], myNation: -1, selected: new Set(), hostile: new Set() };

  constructor(
    private host: HTMLElement,
    private topo: Topology,
    private map: MapDef,
    private callbacks: MapCallbacks,
  ) {
    this.unitLayer = new UnitLayer(map);
  }

  async init(): Promise<void> {
    await this.app.init({
      resizeTo: this.host,
      background: TH.sea,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);

    this.buildShapes();
    for (const [i, s] of this.shapes.entries()) {
      const g = new Graphics();
      for (const poly of s.polygons) {
        g.poly(poly[0]!, true).fill(0xffffff);
        for (const hole of poly.slice(1)) g.poly(hole, true).cut();
      }
      g.tint = 0x888888;
      g.cullable = true;
      this.fills[i] = g;
      this.world.addChild(g);
    }

    // Frontières entre provinces : fixes, une seule fois.
    const all = mesh(this.topo, this.topo.objects.provinces as GeometryCollection, (a, b) => a !== b);
    drawLines(this.provinceBorders, all);
    this.provinceBorders.stroke({ width: 1, color: TH.provinceBorder.color, alpha: TH.provinceBorder.alpha, pixelLine: true });

    this.world.addChild(this.provinceBorders, this.nationBorders, this.capitalsLayer, this.hoverOutline, this.highlight);
    this.world.addChild(this.nationLabels, this.provinceLabels);
    this.world.addChild(this.unitLayer.paths, this.unitLayer.battles, this.unitLayer.counters);
    this.app.stage.addChild(this.boxGraphics);
    this.buildProvinceLabels();
    this.drawCapitals();
    this.setupInteraction();
    this.fitToView();
    this.ready = true;
    if (this.owners.length) this.applyOwners();
    this.applyUnits();
  }

  /** Divisions, batailles, nation jouée et divisions sélectionnées. */
  setUnits(
    units: readonly Unit[],
    battles: readonly Battle[],
    myNation: number,
    selected: ReadonlySet<number>,
    hostile: ReadonlySet<number>,
  ): void {
    this.unitData = { units, battles, myNation, selected, hostile };
    if (this.ready) this.applyUnits();
  }

  private applyUnits() {
    const d = this.unitData;
    this.unitLayer.setData(d.units, d.battles, d.myNation, d.selected, d.hostile);
    this.unitLayer.setScale(this.world.scale.x);
  }

  /** Met à jour les couleurs et les frontières de nations si les propriétaires ont changé. */
  setOwners(owners: readonly number[], version: number): void {
    // L'état est recopié chaque jour : seule la version dit si les frontières ont bougé.
    if (version === this.ownersVersion) {
      this.owners = owners;
      return;
    }
    this.owners = owners;
    this.ownersVersion = version;
    if (this.ready) this.applyOwners();
  }

  setSelected(id: number | null): void {
    this.selected = id;
    if (this.ready) this.drawOutline(this.highlight, id, SELECT, 2.5);
  }

  destroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    if (this.ready) this.app.destroy(true, { children: true });
  }

  // -------------------------------------------------------------------------

  private buildShapes() {
    const fc = feature(this.topo, this.topo.objects.provinces as GeometryCollection);
    for (const f of fc.features) {
      const id = Number(f.id);
      const g = f.geometry as Polygon | MultiPolygon;
      const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
      const polygons = polys.map((rings) =>
        rings.map((ring) => {
          const flat: number[] = [];
          for (const [x, y] of ring as [number, number][]) {
            flat.push(x, y);
            if (x < x0) x0 = x;
            if (y < y0) y0 = y;
            if (x > x1) x1 = x;
            if (y > y1) y1 = y;
          }
          return flat;
        }),
      );
      this.shapes[id] = { polygons, bbox: [x0, y0, x1, y1] };
    }
  }

  private applyOwners() {
    const colors = NATIONS_1936.map((n) => n.color);
    this.owners.forEach((o, i) => {
      const g = this.fills[i];
      if (g) g.tint = colors[o] ?? 0x888888;
    });
    this.drawNationBorders();
    this.buildNationLabels();
  }

  private drawNationBorders() {
    const scale = this.world.scale.x;
    this.borderScale = scale;
    const owners = this.owners;
    const lines = mesh(
      this.topo,
      this.topo.objects.provinces as GeometryCollection,
      (a, b) => a !== b && owners[Number(a.id)] !== owners[Number(b.id)],
    );
    this.nationBorders.clear();
    drawLines(this.nationBorders, lines);
    this.nationBorders.stroke({ width: TH.nationBorder.px / scale, color: TH.nationBorder.color, alpha: TH.nationBorder.alpha, join: "round", cap: "round" });
    // Liseré clair autour des côtes pour détacher les terres de la mer.
    const coast = mesh(this.topo, this.topo.objects.provinces as GeometryCollection, (a, b) => a === b);
    drawLines(this.nationBorders, coast);
    this.nationBorders.stroke({ width: TH.coast.px / scale, color: TH.coast.color, alpha: TH.coast.alpha });
  }

  /** Nom de chaque nation au centre de son territoire principal (autour de la capitale). */
  private buildNationLabels() {
    this.nationLabels.removeChildren().forEach((c) => c.destroy());
    const provinces = this.map.provinces;
    NATIONS_1936.forEach((nation, idx) => {
      let start = this.map.capitals[nation.id];
      if (start === undefined || this.owners[start] !== idx) start = this.owners.findIndex((o) => o === idx);
      if (start < 0) return;
      // Territoire relié à la capitale par voie de terre.
      const seen = new Set([start]);
      const queue = [start];
      while (queue.length) {
        const p = queue.pop()!;
        for (const n of provinces[p]!.neighbors)
          if (!seen.has(n) && this.owners[n] === idx) {
            seen.add(n);
            queue.push(n);
          }
      }
      let sx = 0,
        sy = 0,
        sw = 0;
      for (const p of seen) {
        const w = provinces[p]!.km2;
        sx += provinces[p]!.center[0] * w;
        sy += provinces[p]!.center[1] * w;
        sw += w;
      }
      const size = Math.max(11, Math.min(150, Math.sqrt(sw) / 28));
      const t = new Text({
        text: (nation.short ?? nation.name).toUpperCase(),
        style: {
          fontFamily: TH.nationLabel.fontFamily,
          fontSize: size,
          fontWeight: "bold",
          letterSpacing: size * TH.nationLabel.letterSpacing,
          fill: TH.nationLabel.fill,
          stroke: { color: TH.nationLabel.stroke, width: Math.max(1.2, size * 0.12), join: "round" },
          align: "center",
        },
        resolution: 4,
      });
      t.alpha = TH.nationLabel.alpha;
      t.anchor.set(0.5);
      t.position.set(sx / sw, sy / sw);
      t.cullable = true;
      this.nationLabels.addChild(t);
    });
  }

  private buildProvinceLabels() {
    for (const p of this.map.provinces) {
      const t = new Text({
        text: p.name,
        style: { fontFamily: TH.provinceLabel.fontFamily, fontSize: 4.2, fill: TH.provinceLabel.fill },
        resolution: 8,
      });
      t.anchor.set(0.5, -0.4);
      t.position.set(p.center[0], p.center[1]);
      t.cullable = true;
      this.provinceLabels.addChild(t);
    }
    this.provinceLabels.visible = false;
  }

  private drawCapitals() {
    const g = this.capitalsLayer;
    g.clear();
    for (const id of Object.values(this.map.capitals)) {
      const [x, y] = this.map.provinces[id]!.center;
      g.star(x, y, 5, 4, 1.8).fill(TH.capital.fill).stroke({ width: 0.6, color: TH.capital.stroke });
    }
    for (const p of this.map.provinces) {
      if (Object.values(this.map.capitals).includes(p.id)) continue;
      g.circle(p.center[0], p.center[1], 0.9).fill({ color: TH.town.color, alpha: TH.town.alpha });
    }
  }

  private drawOutline(g: Graphics, id: number | null, color: number, px: number) {
    g.clear();
    if (id === null) return;
    const s = this.shapes[id];
    if (!s) return;
    for (const poly of s.polygons) for (const ring of poly) g.poly(ring, true);
    g.stroke({ width: px / this.world.scale.x, color, alpha: 1 });
  }

  // -------------------------------------------------------------------------
  // Interaction

  private setupInteraction() {
    const stage = this.app.stage;
    stage.eventMode = "static";
    stage.hitArea = this.app.screen;
    let dragging = false;
    let boxing = false;
    let moved = 0;
    let lastX = 0,
      lastY = 0,
      startX = 0,
      startY = 0;
    this.app.canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());

    stage.on("pointerdown", (e: FederatedPointerEvent) => {
      if (e.button === 2) {
        const id = this.pick(e.global.x, e.global.y);
        if (id !== null) this.callbacks.onOrder(id);
        return;
      }
      if (e.button !== 0) return;
      boxing = e.shiftKey;
      dragging = !boxing;
      moved = 0;
      lastX = startX = e.global.x;
      lastY = startY = e.global.y;
    });
    stage.on("pointermove", (e: FederatedPointerEvent) => {
      if (boxing) {
        moved = Math.abs(e.global.x - startX) + Math.abs(e.global.y - startY);
        const b = this.boxGraphics;
        b.clear();
        b.rect(Math.min(startX, e.global.x), Math.min(startY, e.global.y), Math.abs(e.global.x - startX), Math.abs(e.global.y - startY))
          .fill({ color: TH.boxSelect.fill, alpha: TH.boxSelect.alpha })
          .stroke({ width: 1, color: TH.boxSelect.stroke });
      } else if (dragging) {
        const dx = e.global.x - lastX,
          dy = e.global.y - lastY;
        moved += Math.abs(dx) + Math.abs(dy);
        this.world.position.x += dx;
        this.world.position.y += dy;
        lastX = e.global.x;
        lastY = e.global.y;
        this.clampWorld();
      }
      const id = this.pick(e.global.x, e.global.y);
      if (id !== this.hovered) {
        this.hovered = id;
        this.drawOutline(this.hoverOutline, id, TH.hover, 1.2);
        this.callbacks.onHover(id);
      }
    });
    const end = (e: FederatedPointerEvent) => {
      if (boxing && moved >= 5) {
        const [ax, ay] = this.toWorld(Math.min(startX, e.global.x), Math.min(startY, e.global.y));
        const [bx, by] = this.toWorld(Math.max(startX, e.global.x), Math.max(startY, e.global.y));
        this.callbacks.onBoxSelect(this.unitLayer.ownUnitsIn(ax, ay, bx, by));
      } else if ((dragging || boxing) && moved < 5) this.click(e.global.x, e.global.y, e.shiftKey);
      this.boxGraphics.clear();
      dragging = boxing = false;
    };
    stage.on("pointerup", end);
    stage.on("pointerupoutside", () => {
      this.boxGraphics.clear();
      dragging = boxing = false;
    });
    stage.on("pointerleave", () => {
      this.hovered = null;
      this.hoverOutline.clear();
      this.callbacks.onHover(null);
    });

    this.app.canvas.addEventListener(
      "wheel",
      (ev) => {
        ev.preventDefault();
        const rect = this.app.canvas.getBoundingClientRect();
        this.zoomAt(ev.clientX - rect.left, ev.clientY - rect.top, Math.exp(-ev.deltaY * 0.0015));
      },
      { passive: false },
    );
    this.resizeObserver = new ResizeObserver(() => this.clampWorld());
    this.resizeObserver.observe(this.host);
  }

  private toWorld(sx: number, sy: number): [number, number] {
    const s = this.world.scale.x;
    return [(sx - this.world.position.x) / s, (sy - this.world.position.y) / s];
  }

  private click(sx: number, sy: number, additive: boolean) {
    const [wx, wy] = this.toWorld(sx, sy);
    const stack = this.unitLayer.hit(wx, wy);
    if (stack && stack.nation === this.unitData.myNation) {
      this.callbacks.onUnitsClick(
        stack.units.map((u) => u.id),
        additive,
      );
      return;
    }
    this.callbacks.onSelect(this.pick(sx, sy));
  }

  zoomBy(factor: number) {
    this.zoomAt(this.app.screen.width / 2, this.app.screen.height / 2, factor);
  }

  private zoomAt(sx: number, sy: number, factor: number) {
    const old = this.world.scale.x;
    const next = Math.max(this.minScale() * 0.9, Math.min(8, old * factor));
    const wx = (sx - this.world.position.x) / old;
    const wy = (sy - this.world.position.y) / old;
    this.world.scale.set(next);
    this.world.position.set(sx - wx * next, sy - wy * next);
    this.clampWorld();
    this.onZoomChanged();
  }

  private onZoomChanged() {
    const s = this.world.scale.x;
    this.provinceLabels.visible = s > 2.4;
    this.nationLabels.visible = s < 3.2;
    if (Math.abs(s / this.borderScale - 1) > 0.15 && this.owners.length) this.drawNationBorders();
    this.drawOutline(this.highlight, this.selected, SELECT, 2.5);
    this.drawOutline(this.hoverOutline, this.hovered, TH.hover, 1.2);
    this.unitLayer.setScale(s);
  }

  private minScale() {
    return Math.max(this.app.screen.width / this.map.width, this.app.screen.height / this.map.height);
  }

  /** Recentre sur la capitale de la nation jouée (sur l'Europe pour un observateur). */
  fitToView() {
    const nation = NATIONS_1936[this.unitData.myNation];
    const capital = nation ? this.map.capitals[nation.id] : undefined;
    const [cx, cy] = capital !== undefined ? this.map.provinces[capital]!.center : this.lonLatGuessEurope();
    // Environ 2 500 unités de large : un grand pays et ses voisins.
    const s = Math.max(this.minScale(), this.app.screen.width / 2500);
    this.world.scale.set(s);
    this.world.position.set(this.app.screen.width / 2 - cx * s, this.app.screen.height / 2 - cy * s);
    this.clampWorld();
    this.onZoomChanged();
  }

  /** Centre de l'Europe : la capitale allemande, à défaut le milieu de la carte. */
  private lonLatGuessEurope(): [number, number] {
    const berlin = this.map.capitals.GER;
    return berlin !== undefined ? this.map.provinces[berlin]!.center : [this.map.width / 2, this.map.height / 2];
  }

  private clampWorld() {
    const s = this.world.scale.x;
    const w = this.map.width * s,
      h = this.map.height * s;
    const sw = this.app.screen.width,
      sh = this.app.screen.height;
    const p = this.world.position;
    p.x = w <= sw ? (sw - w) / 2 : Math.min(0, Math.max(sw - w, p.x));
    p.y = h <= sh ? (sh - h) / 2 : Math.min(0, Math.max(sh - h, p.y));
  }

  /** Province sous un point de l'écran. */
  private pick(sx: number, sy: number): number | null {
    const s = this.world.scale.x;
    const x = (sx - this.world.position.x) / s;
    const y = (sy - this.world.position.y) / s;
    for (let i = 0; i < this.shapes.length; i++) {
      const sh = this.shapes[i];
      if (!sh) continue;
      const b = sh.bbox;
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      for (const poly of sh.polygons) {
        let inside = false;
        for (const ring of poly) if (pointInRing(x, y, ring)) inside = !inside;
        if (inside) return i;
      }
    }
    return null;
  }
}

function pointInRing(x: number, y: number, r: number[]): boolean {
  let c = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i]!,
      yi = r[i + 1]!,
      xj = r[j]!,
      yj = r[j + 1]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function drawLines(g: Graphics, m: MultiLineString) {
  for (const line of m.coordinates) {
    const first = line[0];
    if (!first) continue;
    g.moveTo(first[0]!, first[1]!);
    for (let i = 1; i < line.length; i++) g.lineTo(line[i]![0]!, line[i]![1]!);
  }
}
