import { MS_PER_DAY } from "./calendar.ts";

/** Vitesses proposées : 0 = pause, 1 = 1 jour pour 5 s. Les autres servent à tester. */
export const SPEEDS = [0, 1, 2, 5, 20] as const;
export type Speed = (typeof SPEEDS)[number];

/**
 * Convertit le temps réel écoulé en jours de jeu. Le serveur et le mode solo
 * l'utilisent de la même façon ; la simulation elle-même ne connaît que des jours.
 */
export class GameClock {
  private acc = 0;
  constructor(public speed: Speed = 1) {}

  /** Ajoute `ms` de temps réel et renvoie le nombre de jours à simuler. */
  advance(ms: number): number {
    if (this.speed === 0 || ms <= 0) return 0;
    this.acc += ms * this.speed;
    const days = Math.floor(this.acc / MS_PER_DAY);
    this.acc -= days * MS_PER_DAY;
    return days;
  }

  /** Avancement du jour en cours, entre 0 et 1 (pour une barre de progression). */
  get progress(): number {
    return this.acc / MS_PER_DAY;
  }

  setSpeed(speed: Speed): void {
    this.speed = speed;
  }
}

export function isSpeed(v: unknown): v is Speed {
  return typeof v === "number" && (SPEEDS as readonly number[]).includes(v);
}
