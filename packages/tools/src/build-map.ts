/**
 * Prépare la carte des provinces de l'Europe en 1936 à partir de Natural Earth
 * (domaine public).
 *
 *   pnpm map:build
 *
 * Étapes :
 *  1. Télécharge (une fois) les régions de niveau 1 et les villes de Natural Earth.
 *  2. Projette en conique conforme centrée sur l'Europe et découpe le cadre.
 *  3. Simplifie en gardant les frontières communes (topologie).
 *  4. Applique les frontières de 1936 (voir borders1936.ts).
 *  5. Découpe les régions trop grandes autour de leurs villes principales,
 *     fusionne les régions trop petites avec un voisin du même pays.
 *  6. Écrit la géométrie (TopoJSON, pour le client) et les données des
 *     provinces (JSON, pour la simulation).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as turf from "@turf/turf";
import { geoConicConformal } from "d3-geo";
import { geoProject } from "d3-geo-projection";
import { Delaunay } from "d3-delaunay";
import { topology } from "topojson-server";
import { feature, merge, neighbors } from "topojson-client";
import { presimplify, simplify, filter, filterWeight } from "topojson-simplify";
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import type { Topology, GeometryCollection, GeometryObject } from "topojson-specification";
import { NATIONS_1936, NATION_INDEX } from "@war-board/sim";
import {
  ADM0_OWNER,
  CAPITALS_1936,
  CLIP_OVERRIDES,
  HISTORICAL_CITY_NAMES,
  REGION_OWNER,
  STAT_REGION_OWNER,
} from "./borders1936.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const CACHE = join(HERE, "..", ".cache");
const OUT_TOPO = join(ROOT, "packages/client/public/map/europe-1936.topo.json");
const OUT_SIM = join(ROOT, "packages/sim/src/scenario/provinces1936.json");

const NE_BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";
const NE_ADMIN1 = "ne_10m_admin_1_states_provinces.geojson";
const NE_PLACES = "ne_10m_populated_places.geojson";

/** Largeur de la carte en unités de monde (pixels au zoom 1). */
const WIDTH = 4000;
/** Cadre géographique : [ouest, sud, est, nord] en degrés. */
const FRAME: [number, number, number, number] = [-24, 29.5, 50, 71.5];
/** Surface visée d'une province, en km², en Europe et ailleurs. */
const TARGET_KM2 = { europe: 15000, far: 70000 };
/** En dessous, on fusionne avec un voisin du même propriétaire. */
const MIN_KM2 = { europe: 8000, far: 25000 };
/** Seuil de simplification (aire de triangle, en pixels carrés). */
const SIMPLIFY_WEIGHT = 0.35;
/** Les îlots plus petits que ça (pixels carrés) sont retirés. */
const MIN_RING_AREA = 2;

type Ring = Position[];
type Geom = Polygon | MultiPolygon;

interface Props {
  adm0: string;
  region: string;
  statRegion: string | null;
  label: string;
  owner: string;
  /** Surface approximative en km². */
  km2: number;
  /** Lon/lat du centre de la région source, pour choisir les seuils. */
  lon: number;
  lat: number;
}

type F = Feature<Geom, Props>;

// ---------------------------------------------------------------------------
// 1. Données sources

async function loadNE(file: string): Promise<FeatureCollection> {
  mkdirSync(CACHE, { recursive: true });
  const path = join(CACHE, file);
  if (!existsSync(path)) {
    console.log(`Téléchargement de ${file}...`);
    const res = await fetch(NE_BASE + file);
    if (!res.ok) throw new Error(`Échec du téléchargement de ${file} : ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(readFileSync(path, "utf8")) as FeatureCollection;
}

// ---------------------------------------------------------------------------
// 2. Projection

const frameRing: [number, number][] = [];
{
  const [w, s, e, n] = FRAME;
  for (let x = w; x <= e; x += 1) frameRing.push([x, s]);
  for (let y = s; y <= n; y += 1) frameRing.push([e, y]);
  for (let x = e; x >= w; x -= 1) frameRing.push([x, n]);
  for (let y = n; y >= s; y -= 1) frameRing.push([w, y]);
}
const projection = geoConicConformal().parallels([40, 62]).rotate([-14, 0]);
projection.fitWidth(WIDTH, { type: "MultiPoint", coordinates: frameRing });
// fitWidth place le haut du cadre à y = 0 ; la hauteur est le bas du cadre projeté.
const HEIGHT = Math.round(Math.max(...frameRing.map((p) => projection(p)![1])));
projection.clipExtent([
  [0, 0],
  [WIDTH, HEIGHT],
]);

const round3 = (v: number) => Math.round(v * 1000) / 1000;

function projectPoint(lon: number, lat: number): [number, number] {
  const p = projection([lon, lat])!;
  return [round3(p[0]), round3(p[1])];
}

/** Projette un anneau lon/lat en densifiant ses côtés (sans sémantique sphérique). */
function projectRing(ring: [number, number][]): Ring {
  const out: Ring = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const steps = 12;
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      out.push(projectPoint(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t));
    }
  }
  out.push(out[0]!);
  return out;
}

/** km² par pixel carré autour d'un point. */
function km2PerPx2(lon: number, lat: number): number {
  const d = 0.1;
  const sq = turf.polygon([
    [
      [lon - d, lat - d],
      [lon + d, lat - d],
      [lon + d, lat + d],
      [lon - d, lat + d],
      [lon - d, lat - d],
    ],
  ]);
  const km2 = turf.area(sq) / 1e6;
  const a = projectPoint(lon - d, lat - d);
  const b = projectPoint(lon + d, lat - d);
  const c = projectPoint(lon + d, lat + d);
  const e = projectPoint(lon - d, lat + d);
  const px = Math.abs(ringArea([a, b, c, e, a]));
  return km2 / px;
}

function ringArea(ring: Ring): number {
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    s += a[0]! * b[1]! - b[0]! * a[1]!;
  }
  return s / 2;
}

function geomArea(g: Geom): number {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  let s = 0;
  for (const p of polys) {
    p.forEach((r, i) => {
      const a = Math.abs(ringArea(r));
      s += i === 0 ? a : -a;
    });
  }
  return s;
}

function isFar(p: { lon: number; lat: number }): boolean {
  return p.lat < 36.5 || p.lon > 41;
}

// ---------------------------------------------------------------------------

function roundGeom(g: Geom): Geom {
  const r = (ring: Ring) => ring.map((p) => [round3(p[0]!), round3(p[1]!)]);
  if (g.type === "Polygon") return { type: "Polygon", coordinates: g.coordinates.map(r) };
  return { type: "MultiPolygon", coordinates: g.coordinates.map((p) => p.map(r)) };
}

function polygonsOf(g: Geom): Ring[][] {
  return g.type === "Polygon" ? [g.coordinates] : g.coordinates;
}

/**
 * Insère dans chaque anneau les sommets des autres anneaux qui tombent sur ses
 * côtés, pour que les frontières communes soient reconnues par la topologie
 * après les découpes.
 */
function nodeFeatures(features: F[]): void {
  const CELL = 4;
  const grid = new Map<string, [number, number][]>();
  const seen = new Set<string>();
  for (const f of features) {
    for (const poly of polygonsOf(f.geometry)) {
      for (const ring of poly) {
        for (const p of ring) {
          const key = `${p[0]},${p[1]}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const ck = `${Math.floor(p[0]! / CELL)},${Math.floor(p[1]! / CELL)}`;
          let cell = grid.get(ck);
          if (!cell) grid.set(ck, (cell = []));
          cell.push([p[0]!, p[1]!]);
        }
      }
    }
  }
  const EPS = 2e-3;
  let inserted = 0;
  for (const f of features) {
    for (const poly of polygonsOf(f.geometry)) {
      for (let ri = 0; ri < poly.length; ri++) {
        const ring = poly[ri]!;
        const out: Ring = [];
        for (let i = 0; i < ring.length - 1; i++) {
          const a = ring[i]!;
          const b = ring[i + 1]!;
          out.push(a);
          const ax = a[0]!,
            ay = a[1]!,
            bx = b[0]!,
            by = b[1]!;
          const dx = bx - ax,
            dy = by - ay;
          const len2 = dx * dx + dy * dy;
          if (len2 === 0) continue;
          const minCx = Math.floor((Math.min(ax, bx) - EPS) / CELL);
          const maxCx = Math.floor((Math.max(ax, bx) + EPS) / CELL);
          const minCy = Math.floor((Math.min(ay, by) - EPS) / CELL);
          const maxCy = Math.floor((Math.max(ay, by) + EPS) / CELL);
          const hits: [number, number, number][] = [];
          for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
              const cell = grid.get(`${cx},${cy}`);
              if (!cell) continue;
              for (const v of cell) {
                const t = ((v[0] - ax) * dx + (v[1] - ay) * dy) / len2;
                if (t <= 1e-9 || t >= 1 - 1e-9) continue;
                const px = ax + t * dx - v[0];
                const py = ay + t * dy - v[1];
                if (px * px + py * py > EPS * EPS) continue;
                hits.push([t, v[0], v[1]]);
              }
            }
          }
          if (hits.length) {
            hits.sort((p, q) => p[0] - q[0]);
            for (const h of hits) out.push([h[1], h[2]]);
            inserted += hits.length;
          }
        }
        out.push(ring[ring.length - 1]!);
        poly[ri] = out;
      }
    }
  }
  console.log(`  ${inserted} sommets insérés pour raccorder les frontières`);
}

function toFeature(g: Geom, props: Props): F {
  return { type: "Feature", geometry: g, properties: props };
}

function clipFeature(f: F, clip: Feature<Polygon>): { inside: F | null; outside: F | null } {
  const fc = turf.featureCollection([f as Feature<Geom>, clip as Feature<Geom>]);
  const inter = turf.intersect(fc);
  if (!inter) return { inside: null, outside: f };
  const diff = turf.difference(fc);
  const total = geomArea(f.geometry) || 1;
  const ia = geomArea(inter.geometry as Geom);
  const inside = ia > 0.5 ? toFeature(roundGeom(inter.geometry as Geom), { ...f.properties, km2: (f.properties.km2 * ia) / total }) : null;
  const outside = diff ? toFeature(roundGeom(diff.geometry as Geom), { ...f.properties, km2: (f.properties.km2 * geomArea(diff.geometry as Geom)) / total }) : null;
  return { inside, outside };
}

// ---------------------------------------------------------------------------

interface City {
  name: string;
  pop: number;
  x: number;
  y: number;
}

function cityName(p: Record<string, unknown>): string {
  const ne = String(p.NAME ?? "");
  const hist = HISTORICAL_CITY_NAMES[ne] ?? HISTORICAL_CITY_NAMES[String(p.NAMEASCII ?? "")];
  if (hist) return hist;
  const fr = p.NAME_FR ? String(p.NAME_FR) : "";
  return fr || ne;
}

function pointInGeom(x: number, y: number, g: Geom): boolean {
  for (const poly of polygonsOf(g)) {
    let inside = false;
    poly.forEach((ring, ri) => {
      let c = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i]![0]!,
          yi = ring[i]![1]!,
          xj = ring[j]![0]!,
          yj = ring[j]![1]!;
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      if (ri === 0) inside = c;
      else if (c) inside = false;
    });
    if (inside) return true;
  }
  return false;
}

function bboxOf(g: Geom): [number, number, number, number] {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const poly of polygonsOf(g))
    for (const p of poly[0]!) {
      if (p[0]! < x0) x0 = p[0]!;
      if (p[1]! < y0) y0 = p[1]!;
      if (p[0]! > x1) x1 = p[0]!;
      if (p[1]! > y1) y1 = p[1]!;
    }
  return [x0, y0, x1, y1];
}

/** Découpe une région trop grande en `n` morceaux autour de ses villes. */
function splitFeature(f: F, n: number, cities: City[]): F[] {
  const g = f.geometry;
  const [x0, y0, x1, y1] = bboxOf(g);
  const area = geomArea(g);
  const step = Math.sqrt(area / (n * 80));
  const samples: [number, number][] = [];
  for (let x = x0 + step / 2; x < x1; x += step)
    for (let y = y0 + step / 2; y < y1; y += step) if (pointInGeom(x, y, g)) samples.push([x, y]);
  if (samples.length < n * 4) return [f];

  const minSpacing = Math.sqrt(area / n) * 0.6;
  const centers: [number, number][] = [];
  for (const c of cities) {
    if (centers.length >= n) break;
    if (!pointInGeom(c.x, c.y, g)) continue;
    if (centers.every((p) => Math.hypot(p[0] - c.x, p[1] - c.y) > minSpacing)) centers.push([c.x, c.y]);
  }
  while (centers.length < n) {
    let best = samples[0]!;
    let bestD = -1;
    for (const s of samples) {
      const d = centers.length ? Math.min(...centers.map((c) => Math.hypot(c[0] - s[0], c[1] - s[1]))) : Math.hypot(s[0] - x0, s[1] - y0);
      if (d > bestD) {
        bestD = d;
        best = s;
      }
    }
    centers.push([best[0], best[1]]);
  }
  // Quelques itérations de k-moyennes pour équilibrer les surfaces.
  for (let it = 0; it < 12; it++) {
    const sx = new Array(n).fill(0),
      sy = new Array(n).fill(0),
      cnt = new Array(n).fill(0);
    for (const s of samples) {
      let bi = 0,
        bd = Infinity;
      centers.forEach((c, i) => {
        const d = (c[0] - s[0]) ** 2 + (c[1] - s[1]) ** 2;
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      sx[bi] += s[0];
      sy[bi] += s[1];
      cnt[bi]++;
    }
    centers.forEach((c, i) => {
      if (cnt[i]) {
        c[0] = sx[i] / cnt[i];
        c[1] = sy[i] / cnt[i];
      }
    });
  }
  const pad = 10;
  const vor = Delaunay.from(centers).voronoi([x0 - pad, y0 - pad, x1 + pad, y1 + pad]);
  const out: F[] = [];
  for (let i = 0; i < n; i++) {
    const cell = vor.cellPolygon(i);
    if (!cell) continue;
    const ring = cell.map((p) => [round3(p[0]!), round3(p[1]!)]);
    const clip = turf.polygon([ring]);
    const inter = turf.intersect(turf.featureCollection([f as Feature<Geom>, clip as Feature<Geom>]));
    if (!inter) continue;
    const a = geomArea(inter.geometry as Geom);
    if (a < 1) continue;
    out.push(toFeature(roundGeom(inter.geometry as Geom), { ...f.properties, km2: (f.properties.km2 * a) / area }));
  }
  return out.length ? out : [f];
}

// ---------------------------------------------------------------------------

async function main() {
  const admin1 = await loadNE(NE_ADMIN1);
  const placesFc = await loadNE(NE_PLACES);
  console.log(`Carte ${WIDTH} × ${HEIGHT}`);

  // --- Régions sources, propriétaire de base
  const [fw, fs, fe, fn] = FRAME;
  const unknown = new Map<string, number>();
  const sources: Feature<Geom, Props>[] = [];
  for (const f of admin1.features) {
    const p = f.properties as Record<string, any>;
    const g = f.geometry as Geom;
    if (!g) continue;
    const bb = turf.bbox(f);
    if (bb[2] < fw - 12 || bb[0] > fe + 20 || bb[3] < fs - 14 || bb[1] > fn + 6) continue;
    const adm0 = String(p.adm0_a3);
    const region = String(p.name ?? "");
    const statRegion = p.region ? String(p.region) : null;
    let owner = ADM0_OWNER[adm0];
    if (!owner) {
      unknown.set(adm0, (unknown.get(adm0) ?? 0) + 1);
      continue;
    }
    owner = REGION_OWNER[adm0]?.[region] ?? owner;
    if (statRegion) owner = STAT_REGION_OWNER[adm0]?.[statRegion] ?? owner;
    const km2 = turf.area(f) / 1e6;
    const label = cleanLabel(String(p.name_fr || p.name || adm0));
    const rewound = turf.rewind(f as Feature<Geom>, { reverse: true }) as Feature<Geom>;
    sources.push({
      type: "Feature",
      geometry: rewound.geometry,
      properties: { adm0, region, statRegion, label, owner, km2, lon: Number(p.longitude), lat: Number(p.latitude) },
    });
  }
  if (unknown.size) console.log("  Pays hors scénario ignorés :", [...unknown.keys()].join(", "));

  // --- Projection + découpe du cadre
  const projected: F[] = [];
  for (const f of sources) {
    const pf = geoProject(f, projection) as Feature<Geom | null, Props>;
    if (!pf.geometry) continue;
    const g = roundGeom(pf.geometry);
    const a = geomArea(g);
    if (a < MIN_RING_AREA) continue;
    projected.push(toFeature(g, { ...f.properties, km2: a * km2PerPx2(f.properties.lon, f.properties.lat) }));
  }
  console.log(`  ${projected.length} régions sources dans le cadre`);

  // --- Simplification topologique
  let topo = topology({ a: turf.featureCollection(projected) as any }) as unknown as Topology;
  topo = presimplify(topo as any) as any;
  topo = simplify(topo as any, SIMPLIFY_WEIGHT) as any;
  topo = filter(topo as any, filterWeight(topo as any, MIN_RING_AREA)) as any;
  let features: F[] = (feature(topo, topo.objects.a as GeometryCollection) as FeatureCollection<Geom | null, Props>).features
    .filter((f): f is F => !!f.geometry && geomArea(f.geometry as Geom) > 0)
    .map((f) => toFeature(roundGeom(f.geometry), f.properties));
  console.log(`  ${features.length} régions après simplification`);

  // --- Frontières de 1936 qui coupent des régions actuelles
  for (const o of CLIP_OVERRIDES) {
    const clip = turf.polygon([projectRing(o.ring)]);
    const next: F[] = [];
    let hits = 0;
    for (const f of features) {
      if (!o.adm0.includes(f.properties.adm0) || (o.regions && !o.regions.includes(f.properties.region))) {
        next.push(f);
        continue;
      }
      const { inside, outside } = clipFeature(f, clip);
      if (inside) {
        hits++;
        next.push({ ...inside, properties: { ...inside.properties, owner: o.owner, label: o.name ?? inside.properties.label } });
      }
      if (outside) next.push(outside);
    }
    if (!hits) console.warn(`  ⚠ découpe sans effet : ${o.note}`);
    features = next;
  }

  // --- Villes
  const cities: City[] = [];
  for (const f of placesFc.features) {
    const p = f.properties as Record<string, any>;
    const [lon, lat] = (f.geometry as any).coordinates as [number, number];
    if (lon < fw - 5 || lon > fe + 5 || lat < fs - 3 || lat > fn + 3) continue;
    const [x, y] = projectPoint(lon, lat);
    if (x < 0 || y < 0 || x > WIDTH || y > HEIGHT) continue;
    cities.push({ name: cityName(p), pop: Number(p.POP_MAX) || 0, x, y });
  }
  cities.sort((a, b) => b.pop - a.pop || a.name.localeCompare(b.name));

  // --- Découpe des grandes régions
  const split: F[] = [];
  for (const f of features) {
    const target = isFar(f.properties) ? TARGET_KM2.far : TARGET_KM2.europe;
    const n = Math.round(f.properties.km2 / target);
    if (n >= 2) split.push(...splitFeature(f, Math.min(n, 12), cities));
    else split.push(f);
  }
  features = split;
  console.log(`  ${features.length} morceaux après découpe`);

  // --- Raccord et fusion des petites régions
  nodeFeatures(features);
  const t2 = topology({ p: turf.featureCollection(features) as any }) as unknown as Topology;
  const geoms = (t2.objects.p as GeometryCollection<Props>).geometries;
  const nb = neighbors(geoms as GeometryObject[]);
  const n0 = features.length;
  const parent = Array.from({ length: n0 }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const area = features.map((f) => f.properties.km2);
  const adj = nb.map((l) => new Set(l));
  const alive = new Set(parent.map((_, i) => i));
  for (;;) {
    let pick = -1;
    let pickArea = Infinity;
    for (const i of alive) {
      const p = features[i]!.properties;
      const min = isFar(p) ? MIN_KM2.far : MIN_KM2.europe;
      if (area[i]! >= min || area[i]! >= pickArea) continue;
      const ok = [...adj[i]!].some((j) => features[j]!.properties.owner === p.owner);
      if (!ok) continue;
      pick = i;
      pickArea = area[i]!;
    }
    if (pick < 0) break;
    const p = features[pick]!.properties;
    let best = -1;
    let bestScore = Infinity;
    for (const j of adj[pick]!) {
      const q = features[j]!.properties;
      if (q.owner !== p.owner) continue;
      const score = area[j]! + (q.adm0 === p.adm0 ? 0 : 1e6) + (q.region === p.region ? -1e5 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = j;
      }
    }
    // fusion de `pick` dans `best`
    parent[pick] = best;
    area[best]! += area[pick]!;
    for (const k of adj[pick]!) {
      if (k === best) continue;
      adj[k]!.delete(pick);
      adj[k]!.add(best);
      adj[best]!.add(k);
    }
    adj[best]!.delete(pick);
    alive.delete(pick);
  }
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n0; i++) {
    const r = find(i);
    let g = groups.get(r);
    if (!g) groups.set(r, (g = []));
    g.push(i);
  }
  console.log(`  ${groups.size} provinces après fusion`);

  // --- Provinces finales
  interface Prov {
    geom: Geom;
    owner: string;
    km2: number;
    label: string;
    adm0: string;
  }
  const provs: Prov[] = [];
  for (const [root, members] of groups) {
    const geom =
      members.length === 1 ? features[root]!.geometry : (merge(t2, members.map((i) => geoms[i]!) as any) as MultiPolygon);
    // l'étiquette de la plus grande partie, en cas d'absence de ville
    const biggest = members.reduce((a, b) => (features[a]!.properties.km2 >= features[b]!.properties.km2 ? a : b));
    const p = features[biggest]!.properties;
    provs.push({ geom: roundGeom(geom), owner: p.owner, km2: Math.round(area[root]!), label: p.label, adm0: p.adm0 });
  }
  provs.sort((a, b) => {
    const oa = NATION_INDEX.get(a.owner) ?? 999,
      ob = NATION_INDEX.get(b.owner) ?? 999;
    if (oa !== ob) return oa - ob;
    const ba = bboxOf(a.geom),
      bb = bboxOf(b.geom);
    return ba[1] + ba[3] - (bb[1] + bb[3]) || ba[0] + ba[2] - (bb[0] + bb[2]);
  });

  // Noms : la plus grande ville de la province, sinon le nom de la région.
  const names: string[] = [];
  const centers: [number, number][] = [];
  const bboxes = provs.map((p) => bboxOf(p.geom));
  const taken = new Set<string>();
  provs.forEach((p, i) => {
    const bb = bboxes[i]!;
    const city = cities.find(
      (c) => c.x >= bb[0] && c.x <= bb[2] && c.y >= bb[1] && c.y <= bb[3] && !taken.has(c.name) && pointInGeom(c.x, c.y, p.geom),
    );
    let name = city ? city.name : p.label;
    if (city) taken.add(city.name);
    names.push(name);
    if (city) centers.push([round1(city.x), round1(city.y)]);
    else {
      const pt = interiorPoint(p.geom);
      centers.push([round1(pt[0]), round1(pt[1])]);
    }
  });
  // Doublons de noms (régions sans ville découpées) : on précise la direction.
  const byName = new Map<string, number[]>();
  names.forEach((n, i) => {
    let l = byName.get(n);
    if (!l) byName.set(n, (l = []));
    l.push(i);
  });
  for (const [n, ids] of byName) {
    if (ids.length < 2) continue;
    const mx = ids.reduce((s, i) => s + centers[i]![0], 0) / ids.length;
    const my = ids.reduce((s, i) => s + centers[i]![1], 0) / ids.length;
    const used = new Map<string, number>();
    for (const i of ids) {
      const dir = direction(centers[i]![0] - mx, centers[i]![1] - my);
      const k = (used.get(dir) ?? 0) + 1;
      used.set(dir, k);
      names[i] = `${n} ${dir}${k > 1 ? ` ${k}` : ""}`;
    }
  }

  // --- Topologie finale
  const finalFc = {
    type: "FeatureCollection",
    features: provs.map((p, i) => ({ type: "Feature", id: i, geometry: p.geom, properties: {} })),
  };
  const t3 = topology({ provinces: finalFc as any }, 4e4) as unknown as Topology;
  const g3 = (t3.objects.provinces as GeometryCollection).geometries;
  for (const g of g3) delete (g as any).properties;
  const nb3 = neighbors(g3 as GeometryObject[]);

  // Province côtière : au moins un arc qui n'est partagé avec aucune autre province.
  const arcUse = new Map<number, number>();
  const arcsOf = (g: any): number[] => {
    const out: number[] = [];
    const walk = (a: any) => (typeof a === "number" ? out.push(a < 0 ? ~a : a) : a.forEach(walk));
    walk(g.arcs ?? []);
    return out;
  };
  const provArcs = g3.map(arcsOf);
  for (const arcs of provArcs) for (const a of new Set(arcs)) arcUse.set(a, (arcUse.get(a) ?? 0) + 1);

  const capitals: Record<string, number> = {};
  for (const [nation, [lon, lat]] of Object.entries(CAPITALS_1936)) {
    const [x, y] = projectPoint(lon, lat);
    const idx = provs.findIndex((p) => p.owner === nation && pointInGeom(x, y, p.geom));
    if (idx >= 0) capitals[nation] = idx;
    else {
      // la capitale peut tomber hors du cadre : on prend la plus grande province du pays
      const own = provs.map((p, i) => [p, i] as const).filter(([p]) => p.owner === nation);
      if (own.length) capitals[nation] = own.reduce((a, b) => (a[0].km2 >= b[0].km2 ? a : b))[1];
      console.warn(`  ⚠ capitale hors carte pour ${nation}`);
    }
  }

  const strays = [...new Set(provs.map((p) => p.owner))].filter((o) => !NATION_INDEX.has(o));
  if (strays.length) throw new Error(`Propriétaires inconnus de la simulation : ${strays.join(", ")}`);
  const missing = NATIONS_1936.filter((n) => !provs.some((p) => p.owner === n.id));
  if (missing.length) console.warn("  ⚠ nations sans province :", missing.map((n) => n.id).join(", "));

  const simData = {
    source: "Natural Earth 1:10m (domaine public), frontières de 1936 reconstituées par War Board",
    width: WIDTH,
    height: HEIGHT,
    provinces: provs.map((p, i) => ({
      id: i,
      name: names[i],
      owner: p.owner,
      km2: p.km2,
      center: centers[i],
      coastal: provArcs[i]!.some((a) => arcUse.get(a) === 1),
      neighbors: nb3[i]!.slice().sort((a, b) => a - b),
    })),
    capitals,
  };

  mkdirSync(dirname(OUT_TOPO), { recursive: true });
  writeFileSync(OUT_TOPO, JSON.stringify(t3));
  writeFileSync(OUT_SIM, JSON.stringify(simData, null, 0).replace(/\},\{"id"/g, '},\n{"id"'));
  const kb = (s: string) => Math.round(readFileSync(s).length / 1024);
  console.log(`Écrit ${OUT_TOPO} (${kb(OUT_TOPO)} Ko)`);
  console.log(`Écrit ${OUT_SIM} (${kb(OUT_SIM)} Ko)`);
  const perNation = new Map<string, number>();
  for (const p of provs) perNation.set(p.owner, (perNation.get(p.owner) ?? 0) + 1);
  console.log("Provinces par nation :", [...perNation].map(([k, v]) => `${k} ${v}`).join(", "));
}

/** Un point à l'intérieur de la géométrie : milieu du plus long segment horizontal. */
function interiorPoint(g: Geom): [number, number] {
  const poly = polygonsOf(g).reduce((a, b) => (Math.abs(ringArea(a[0]!)) >= Math.abs(ringArea(b[0]!)) ? a : b));
  const [, y0, , y1] = bboxOf({ type: "Polygon", coordinates: poly });
  let best: [number, number] = [poly[0]![0]![0]!, poly[0]![0]![1]!];
  let bestW = -1;
  for (let k = 1; k < 8; k++) {
    const y = y0 + ((y1 - y0) * k) / 8 + 1e-4;
    const xs: number[] = [];
    for (const ring of poly)
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i]!,
          b = ring[i + 1]!;
        if (a[1]! > y !== b[1]! > y) xs.push(a[0]! + ((y - a[1]!) * (b[0]! - a[0]!)) / (b[1]! - a[1]!));
      }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const w = xs[i + 1]! - xs[i]!;
      if (w > bestW) {
        bestW = w;
        best = [(xs[i]! + xs[i + 1]!) / 2, y];
      }
    }
  }
  return best;
}

const LABEL_PREFIXES = [
  "voïvodie de ", "oblast de ", "oblast d'", "province de ", "province d'", "province du ", "région de ",
  "région d'", "région du ", "comté de ", "comté d'", "district de ", "gouvernorat de ", "gouvernorat d'",
  "wilaya de ", "wilaya d'", "kraï de ", "kraï du ", "république de ", "république d'", "land de ", "canton de ",
  "république des ", "république du ", "canton d'", "département de ", "département d'", "préfecture de ", "municipalité de ", "fylke de ", "comté du ",
];

/** Retire les préfixes administratifs modernes (« voïvodie de », « oblast de »...). */
function cleanLabel(s: string): string {
  const low = s.toLowerCase();
  for (const p of LABEL_PREFIXES) if (low.startsWith(p)) return s.slice(p.length, p.length + 1).toUpperCase() + s.slice(p.length + 1);
  return s;
}

function direction(dx: number, dy: number): string {
  if (Math.hypot(dx, dy) < 1) return "centre";
  const a = (Math.atan2(-dy, dx) * 180) / Math.PI; // 0 = est, 90 = nord
  const dirs = ["est", "nord-est", "nord", "nord-ouest", "ouest", "sud-ouest", "sud", "sud-est"];
  return dirs[(Math.round(a / 45) + 8) % 8]!;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
