import { Container, Graphics, Text } from "pixi.js";
import { MAX_HP, NATIONS_1936, UNIT_TYPES, edgeKm, type Battle, type MapDef, type Unit } from "@war-board/sim";
import { MAP_THEME } from "./theme.ts";

const T = MAP_THEME.unit;
/** En dessous de ce zoom, les pions des nations neutres sont masqués. */
const OVERVIEW_SCALE = 1.3;

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
    this.size = Math.max(0.65, Math.min(1, scale / 1.6));
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

  /** Pion sous un point (coordonnées de monde). */
  hit(wx: number, wy: number): Stack | null {
    const hw = (T.width / 2) * (this.size / this.scale),
      hh = (T.height / 2) * (this.size / this.scale);
    for (let i = this.stacks.length - 1; i >= 0; i--) {
      const s = this.stacks[i]!;
      if (!this.counters.children[i]?.visible) continue;
      if (Math.abs(wx - s.x) <= hw && Math.abs(wy - s.y) <= hh) return s;
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
      this.stacks.push({ x: x + k * 3, y: y + k * 3, nation: units[0]!.nation, units });
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
    for (const b of this.battleData) {
      const to = this.map.provinces[b.province]!.center;
      for (const f of b.from) {
        const from = this.map.provinces[f]!.center;
        const m = new Container();
        const g = new Graphics();
        g.circle(0, 0, 9).fill(MAP_THEME.battle.fill).stroke({ width: 1.5, color: MAP_THEME.battle.stroke });
        const icon = new Text({ text: "⚔", style: { fontSize: 12, fill: 0xffffff }, resolution: 3 });
        icon.anchor.set(0.5);
        m.addChild(g, icon);
        m.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2);
        this.battles.addChild(m);
      }
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

  private drawCounter(s: Stack): Container {
    const c = new Container();
    c.position.set(s.x, s.y);
    const w = T.width,
      h = T.height;
    const nation = NATIONS_1936[s.nation];
    const selected = s.units.some((u) => this.selected.has(u.id));
    const g = new Graphics();
    g.roundRect(-w / 2, -h / 2, w, h, 3)
      .fill(nation?.color ?? 0x888888)
      .stroke({ width: selected ? 2.5 : 1, color: selected ? T.selected : T.border });

    // Symbole du type dominant, façon carte d'état-major.
    const counts = new Map<number, number>();
    for (const u of s.units) counts.set(u.type, (counts.get(u.type) ?? 0) + 1);
    const main = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
    const sx = -w / 2 + 3,
      sy = -h / 2 + 3,
      sw = 13,
      sh = h - 8;
    g.rect(sx, sy, sw, sh).fill(T.symbolFill).stroke({ width: 1, color: T.symbolStroke });
    drawSymbol(g, UNIT_TYPES[main]!.id, sx, sy, sw, sh);

    // Santé moyenne.
    const hp = s.units.reduce((a, u) => a + u.hp, 0) / s.units.length / MAX_HP;
    g.rect(-w / 2 + 2, h / 2 - 3.5, (w - 4) * hp, 2).fill(hp > 0.5 ? T.hpGood : T.hpLow);

    const label = new Text({
      text: String(s.units.length),
      style: { fontFamily: "system-ui, sans-serif", fontSize: 11, fontWeight: "bold", fill: T.text, stroke: { color: 0x000000, width: 2 } },
      resolution: 3,
    });
    label.anchor.set(0.5);
    label.position.set(w / 2 - 7.5, -1);
    c.addChild(g, label);
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

/** Symboles inspirés des cartes d'état-major. */
function drawSymbol(g: Graphics, type: string, x: number, y: number, w: number, h: number) {
  const stroke = { width: 1, color: T.symbolStroke };
  const cx = x + w / 2,
    cy = y + h / 2;
  switch (type) {
    case "infantry":
      g.moveTo(x, y).lineTo(x + w, y + h).moveTo(x + w, y).lineTo(x, y + h).stroke(stroke);
      break;
    case "cavalry":
      g.moveTo(x, y + h).lineTo(x + w, y).stroke(stroke);
      break;
    case "motorized":
      g.moveTo(x, y).lineTo(x + w, y + h).moveTo(x + w, y).lineTo(x, y + h).stroke(stroke);
      g.moveTo(cx, y).lineTo(cx, y + h).stroke(stroke);
      break;
    case "armor":
      g.roundRect(x + 2, y + 2, w - 4, h - 4, (h - 4) / 2).stroke(stroke);
      break;
    case "artillery":
      g.circle(cx, cy, 1.8).fill(T.symbolStroke);
      break;
  }
}
