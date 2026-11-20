import type { MapDef } from "@war-board/sim";
import type { MapViewport, Shape } from "./MapRenderer.ts";
import { MAP_THEME } from "./theme.ts";

const css = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

/**
 * Mini-carte du monde : un canvas 2D redessiné quand les frontières ou le calque
 * changent, et un cadre laiton pour la partie visible. Un clic recentre la carte.
 */
export class Minimap {
  private base = document.createElement("canvas");
  private frame = document.createElement("canvas");
  private view: MapViewport | null = null;
  private scale = 1;
  private offX = 0;
  private offY = 0;

  constructor(
    private host: HTMLElement,
    private shapes: readonly Shape[],
    private map: MapDef,
    onPick: (wx: number, wy: number) => void,
  ) {
    for (const c of [this.base, this.frame]) host.appendChild(c);
    this.resize();
    const pick = (ev: PointerEvent) => {
      const r = this.frame.getBoundingClientRect();
      onPick((ev.clientX - r.left - this.offX) / this.scale, (ev.clientY - r.top - this.offY) / this.scale);
    };
    this.frame.addEventListener("pointerdown", (ev) => {
      this.frame.setPointerCapture(ev.pointerId);
      pick(ev);
    });
    this.frame.addEventListener("pointermove", (ev) => {
      if (this.frame.hasPointerCapture(ev.pointerId)) pick(ev);
    });
  }

  private resize() {
    const w = this.host.clientWidth || 264,
      h = this.host.clientHeight || 120;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [this.base, this.frame]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    this.scale = Math.min(w / this.map.width, h / this.map.height) * dpr;
    this.offX = (w * dpr - this.map.width * this.scale) / 2;
    this.offY = (h * dpr - this.map.height * this.scale) / 2;
    // Les coordonnées de clic sont en pixels CSS.
    this.scale /= dpr;
    this.offX /= dpr;
    this.offY /= dpr;
  }

  /** Redessine les terres avec une couleur par province. */
  draw(owners: readonly number[], colors: readonly number[]) {
    const ctx = this.base.getContext("2d")!;
    const dpr = this.base.width / (this.host.clientWidth || 264);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = css(MAP_THEME.sea);
    ctx.fillRect(0, 0, this.base.width, this.base.height);
    ctx.setTransform(this.scale * dpr, 0, 0, this.scale * dpr, this.offX * dpr, this.offY * dpr);
    this.shapes.forEach((s, i) => {
      if (!s) return;
      ctx.fillStyle = css(colors[owners[i] ?? -1] ?? MAP_THEME.diplomacy.other);
      ctx.beginPath();
      for (const poly of s.polygons)
        for (const ring of poly) {
          ctx.moveTo(ring[0]!, ring[1]!);
          for (let k = 2; k < ring.length; k += 2) ctx.lineTo(ring[k]!, ring[k + 1]!);
          ctx.closePath();
        }
      ctx.fill("evenodd");
    });
    this.drawFrame();
  }

  setView(view: MapViewport) {
    this.view = view;
    this.drawFrame();
  }

  private drawFrame() {
    const ctx = this.frame.getContext("2d")!;
    const dpr = this.frame.width / (this.host.clientWidth || 264);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.frame.width, this.frame.height);
    const v = this.view;
    if (!v) return;
    const k = this.scale * dpr;
    const x = this.offX * dpr + Math.max(0, v.x0) * k,
      y = this.offY * dpr + Math.max(0, v.y0) * k;
    const w = (Math.min(this.map.width, v.x1) - Math.max(0, v.x0)) * k,
      h = (Math.min(this.map.height, v.y1) - Math.max(0, v.y0)) * k;
    ctx.fillStyle = "rgba(212,178,106,0.14)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = css(MAP_THEME.select);
    ctx.lineWidth = 1.5 * dpr;
    ctx.strokeRect(x, y, w, h);
  }

  destroy() {
    this.base.remove();
    this.frame.remove();
  }
}
