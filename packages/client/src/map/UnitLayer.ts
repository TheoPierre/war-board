import { Container, Graphics, GraphicsContext, Text } from "pixi.js";
import { MAX_HP, NATIONS_1936, UNIT_TYPES, edgeKm, type Battle, type MapDef, type Unit } from "@war-board/sim";
import { MAP_THEME } from "./theme.ts";
import { UNIT_SYMBOLS as SYMBOLS } from "./unitSymbols.ts";

const T = MAP_THEME.unit;
/** En dessous de ce zoom, les pions des nations neutres sont masqués. */
const OVERVIEW_SCALE = 1.3;

const symbolCache = new Map<string, GraphicsContext>();
function symbolContext(type: string): GraphicsContext {
  let ctx = symbolCache.get(type);
  if (!ctx) {
    const body = (SYMBOLS[type] ?? SYMBOLS.infantry!).replace(/\/>/g, ` fill="#ffffff"/>`);
    ctx = new GraphicsContext().svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`);
    symbolCache.set(type, ctx);
  }
  return ctx;
}

/** Un pion sur la carte : les divisions d'une nation au même endroit. */
export interface Stack {
  x: number;
  y: number;
  nation: number;
  units: Unit[];
}

/**
 * Pions des divisions, trajets et batailles. Les pions gardent une taille
 * fixe à l'écran quel que soit le zoom.
 */
export class UnitLayer {
  readonly paths = new Graphics();
  readonly battles = new Container();
  readonly counters = new Container();
  private stacks: Stack[] = [];
  private cache = new Map<string, { sig: string; view: Container }>();
  private units: readonly Unit[] = [];
  private battleData: readonly Battle[] = [];
  private myNation = -1;
  private selected: ReadonlySet<number> = new Set();
  private scale = 1;
  private size = 1;
  /** Nations en guerre avec la nation jouée. */
  private hostile: ReadonlySet<number> = new Set();
  /** Anneaux de sélection qui tournent, et halos des batailles qui pulsent. */
  private rings: Graphics[] = [];
  private pulses: Graphics[] = [];
  private clock = 0;

  constructor(private map: MapDef) {}

  setData(
    units: readonly Unit[],
    battles: readonly Battle[],
    myNation: number,
    selected: ReadonlySet<number>,
    hostile: ReadonlySet<number>,
  ) {
    this.hostile = hostile;
    this.units = units;
    this.battleData = battles;
    this.myNation = myNation;
    this.selected = selected;
    this.rebuild();
  }

  setScale(scale: number) {
    this.scale = scale;
    // Pions un peu plus petits en vue d'ensemble.
    this.size = Math.max(0.8, Math.min(1, scale / 1.6));
    const k = this.size / scale;
    const overview = scale < OVERVIEW_SCALE;
    this.stacks.forEach((s, i) => {
      const c = this.counters.children[i]!;
      c.scale.set(k);
      // En vue d'ensemble, seuls vos pions et ceux de vos ennemis restent visibles.
      c.visible = !overview || s.nation === this.myNation || this.hostile.has(s.nation);
    });
    for (const c of this.battles.children) c.scale.set(k);
    this.drawPaths();
  }

  /** Anime les anneaux de sélection (un tour en 6 s) et les batailles (pulsation de 1,4 s). */
  tick(ms: number) {
    this.clock += ms;
    const turn = (ms / 6000) * Math.PI * 2;
    for (const r of this.rings) if (!r.destroyed) r.rotation += turn;
    const f = (this.clock % 1400) / 1400;
    for (const p of this.pulses) {
      if (p.destroyed) continue;
      p.scale.set(1 + f * 0.8);
      p.alpha = 0.7 * (1 - f);
    }
  }

  /** Pion sous un point (coordonnées de monde). */
  hit(wx: number, wy: number): Stack | null {
    // Le pion rond, plus une petite marge pour le badge d'effectif.
    const r = (T.radius + 3) * (this.size / this.scale);
    for (let i = this.stacks.length - 1; i >= 0; i--) {
      const s = this.stacks[i]!;
      if (!this.counters.children[i]?.visible) continue;
      if ((wx - s.x) ** 2 + (wy - s.y) ** 2 <= r * r) return s;
    }
    return null;
  }

  /** Divisions de la nation jouée dans un rectangle (coordonnées de monde). */
  ownUnitsIn(x0: number, y0: number, x1: number, y1: number): number[] {
    const out: number[] = [];
    for (const s of this.stacks)
      if (s.nation === this.myNation && s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1) out.push(...s.units.map((u) => u.id));
    return out;
  }

  // -------------------------------------------------------------------------

  private position(u: Unit): [number, number] {
    const a = this.map.provinces[u.province]!.center;
    const next = u.path[0];
    if (next === undefined || u.progress <= 0) return [a[0], a[1]];
    const b = this.map.provinces[next]!.center;
    const f = Math.min(1, u.progress / edgeKm(this.map, u.province, next)) * 0.5;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }

  private rebuild() {
    // Regroupement : même province, même nation, même direction.
    const groups = new Map<string, Unit[]>();
    for (const u of this.units) {
      const moving = u.path.length > 0 && u.progress > 0;
      const key = `${u.province}:${u.nation}:${moving ? u.path[0] : -1}`;
      let g = groups.get(key);
      if (!g) groups.set(key, (g = []));
      g.push(u);
    }
    // Plusieurs pions au même endroit : on les décale un peu.
    const used = new Map<string, number>();
    this.stacks = [];
    for (const units of groups.values()) {
      let x = 0,
        y = 0;
      for (const u of units) {
        const p = this.position(u);
        x += p[0];
        y += p[1];
      }
      x /= units.length;
      y /= units.length;
      const spot = `${Math.round(x)}:${Math.round(y)}`;
      const k = used.get(spot) ?? 0;
      used.set(spot, k + 1);
      // Décalage en pixels de carte : assez pour voir deux pions ronds superposés.
      this.stacks.push({ x: x + k * 4, y: y + k * 4, nation: units[0]!.nation, units });
    }
    // Les pions du joueur au-dessus.
    this.stacks.sort((a, b) => Number(a.nation === this.myNation) - Number(b.nation === this.myNation) || a.y - b.y);

    // Les pions inchangés sont réutilisés : redessiner du texte coûte cher.
    const next = new Map<string, { sig: string; view: Container }>();
    this.counters.removeChildren();
    for (const s of this.stacks) {
      const sig = this.signature(s);
      let entry = this.cache.get(sig);
      if (entry) this.cache.delete(sig);
      else entry = { sig, view: this.drawCounter(s) };
      entry.view.position.set(s.x, s.y);
      next.set(sig, entry);
      entry.view.cullable = true;
      this.counters.addChild(entry.view);
    }
    for (const old of this.cache.values()) old.view.destroy({ children: true });
    this.cache = next;

    this.battles.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.pulses = [];
    const B = MAP_THEME.battle;
    for (const b of this.battleData) {
      const to = this.map.provinces[b.province]!.center;
      for (const f of b.from) {
        const from = this.map.provinces[f]!.center;
        const m = new Container();
        // Halo qui pulse, puis le disque rouge et les deux épées croisées.
        const pulse = new Graphics().circle(0, 0, 15).fill(B.fill);
        const g = new Graphics();
        g.circle(0, 0, 15).fill(B.fill).stroke({ width: 2, color: B.stroke });
        g.moveTo(-7, -7).lineTo(4, 4).moveTo(4, 4).lineTo(2, 6).moveTo(4, 4).lineTo(6, 2).moveTo(5, 5).lineTo(8, 8);
        g.moveTo(7, -7).lineTo(-4, 4).moveTo(-4, 4).lineTo(-2, 6).moveTo(-4, 4).lineTo(-6, 2).moveTo(-5, 5).lineTo(-8, 8);
        g.stroke({ width: 1.8, color: B.icon, cap: "round" });
        m.addChild(pulse, g);
        m.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2);
        this.pulses.push(pulse);
        this.battles.addChild(m);
      }
    }
    this.rings = [];
    for (const c of this.counters.children) {
      const ring = c.getChildByLabel("ring");
      if (ring instanceof Graphics) this.rings.push(ring);
    }
    this.setScale(this.scale);
  }

  /** Tout ce qui change l'apparence d'un pion, sauf sa position. */
  private signature(s: Stack): string {
    const selected = s.units.some((u) => this.selected.has(u.id));
    const counts = new Map<number, number>();
    for (const u of s.units) counts.set(u.type, (counts.get(u.type) ?? 0) + 1);
    const main = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
    const hp = Math.round((s.units.reduce((a, u) => a + u.hp, 0) / s.units.length / MAX_HP) * 20);
    return `${s.units[0]!.id}:${s.nation}:${s.units.length}:${main}:${hp}:${selected ? 1 : 0}`;
  }

  /** Pion rond : couleur de la nation, silhouette du type dominant, effectif et santé. */
  private drawCounter(s: Stack): Container {
    const c = new Container();
    c.position.set(s.x, s.y);
    const r = T.radius;
    const nation = NATIONS_1936[s.nation];
    const selected = s.units.some((u) => this.selected.has(u.id));

    if (selected) {
      // Anneau en pointillés couleur laiton, qui tourne (voir tick).
      const ring = new Graphics();
      ring.label = "ring";
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        ring.arc(0, 0, r + 5, a, a + (Math.PI / n) * 1.1).stroke({ width: 2, color: T.selected });
      }
      ring.circle(0, 0, r + 5).stroke({ width: 6, color: T.selected, alpha: 0.18 });
      c.addChild(ring);
    }

    const g = new Graphics();
    g.circle(0, 1.5, r + 1).fill({ color: 0x000000, alpha: 0.3 });
    g.circle(0, 0, r).fill(nation?.color ?? 0x888888).stroke({ width: 1.5, color: T.ring, alpha: 0.85 });
    g.circle(0, 0, r - 2.5).stroke({ width: 1, color: T.innerRing, alpha: 0.55 });
    c.addChild(g);

    // Silhouette du type dominant.
    const counts = new Map<number, number>();
    for (const u of s.units) counts.set(u.type, (counts.get(u.type) ?? 0) + 1);
    const main = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
    const sym = new Graphics(symbolContext(UNIT_TYPES[main]!.id));
    const k = 17 / 24;
    sym.scale.set(k);
    sym.position.set(-12 * k, -12 * k);
    c.addChild(sym);

    // Organisation (santé moyenne) sous le pion.
    const hp = s.units.reduce((a, u) => a + u.hp, 0) / s.units.length / MAX_HP;
    const bar = new Graphics();
    const bw = r * 2 - 6;
    bar.roundRect(-bw / 2, r + 2, bw, 3, 1.5).fill(T.orgBack);
    bar.roundRect(-bw / 2, r + 2, bw * hp, 3, 1.5).fill(hp > 0.5 ? T.hpGood : T.hpLow);
    c.addChild(bar);

    // Effectif : nombre de divisions du pion.
    if (s.units.length > 1) {
      const label = new Text({
        text: String(s.units.length),
        style: { fontFamily: "'Roboto Condensed', system-ui, sans-serif", fontSize: 10, fontWeight: "700", fill: T.badgeText },
        resolution: 3,
      });
      const w = Math.max(16, label.width + 6);
      const badge = new Graphics()
        .roundRect(r - 9, r - 10, w, 14, 3)
        .fill(T.badge)
        .stroke({ width: 1, color: 0xffffff, alpha: 0.25 });
      label.anchor.set(0.5);
      label.position.set(r - 9 + w / 2, r - 3);
      c.addChild(badge, label);
    }
    return c;
  }

  private drawPaths() {
    const g = this.paths;
    g.clear();
    const px = 1 / this.scale;
    for (const pass of [false, true]) {
      for (const u of this.units) {
        if (u.nation !== this.myNation || !u.path.length) continue;
        const sel = this.selected.has(u.id);
        if (sel !== pass) continue;
        const pts: [number, number][] = [this.position(u)];
        for (const p of u.path) pts.push(this.map.provinces[p]!.center);
        g.moveTo(pts[0]![0], pts[0]![1]);
        for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
        g.stroke({ width: (sel ? 2.2 : 1.4) * px, color: sel ? MAP_THEME.path.selected : MAP_THEME.path.own, alpha: sel ? 0.95 : 0.45 });
        // Pointe de flèche à l'arrivée.
        const [a, b] = [pts[pts.length - 2]!, pts[pts.length - 1]!];
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const len = 9 * px;
        g.poly([
          b[0], b[1],
          b[0] - len * Math.cos(ang - 0.45), b[1] - len * Math.sin(ang - 0.45),
          b[0] - len * Math.cos(ang + 0.45), b[1] - len * Math.sin(ang + 0.45),
        ]).fill({ color: sel ? MAP_THEME.path.selected : MAP_THEME.path.own, alpha: sel ? 0.95 : 0.6 });
      }
    }
  }
}
