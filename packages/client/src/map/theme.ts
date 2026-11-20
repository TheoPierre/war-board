/**
 * Couleurs et polices de la carte, d'après la maquette du HUD : carte d'état-major
 * sur papier mat, tons pastel, grands noms de pays espacés. Le code de dessin
 * (MapRenderer, UnitLayer) ne contient aucune couleur en dur.
 */
export const MAP_THEME = {
  sea: 0x9fb7c3,
  /** Quadrillage léger sur la mer (unités de la carte). */
  grid: { color: 0x8aa3b0, alpha: 0.3, step: 400 },
  /** Halo clair le long des côtes, sous les terres. */
  coastGlow: { color: 0xb3c7d0, alpha: 1, px: 6 },
  provinceBorder: { color: 0x6e6c62, alpha: 0.4 },
  nationBorder: { color: 0x4a4a44, alpha: 0.95, px: 1.5 },
  coast: { color: 0x5d6a6e, alpha: 0.7, px: 0.8 },
  select: 0xd4b26a,
  hover: 0xfaf6ea,
  capital: { fill: 0xece6d6, stroke: 0x2b2a25 },
  town: { color: 0x3a3830, alpha: 0.45 },
  nationLabel: {
    fontFamily: "Oswald, 'Arial Narrow', sans-serif",
    fontWeight: "500",
    fill: 0x3d3a32,
    alpha: 0.55,
    /** Espacement des lettres, en proportion de la taille : large pour les noms courts. */
    letterSpacing: [0.4, 0.8] as const,
  },
  provinceLabel: { fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif", fill: 0x3a3830 },
  /** Pions des divisions : ronds, taille fixe à l'écran, en pixels. */
  unit: {
    radius: 14,
    ring: 0x141412,
    innerRing: 0xffffff,
    symbol: 0xffffff,
    badge: 0x1b1d1f,
    badgeText: 0xffffff,
    selected: 0xd4b26a,
    orgBack: 0x2b2b27,
    hpGood: 0x7fb069,
    hpLow: 0xc8553d,
  },
  /** Flèches de déplacement : encre sombre, rouge pour la sélection (comme un crayon d'état-major). */
  path: { own: 0x3d3a32, selected: 0xc8553d },
  battle: { fill: 0xc8553d, stroke: 0x2a1410, icon: 0xffffff },
  boxSelect: { fill: 0xd4b26a, alpha: 0.15, stroke: 0xb8954a },
  /** Calque diplomatique. */
  diplomacy: { me: 0xd4b26a, enemy: 0xc8553d, other: 0xc7c2b4 },
} as const;

/** Couleurs pastel des grandes puissances, reprises de la maquette. */
const PASTEL: Record<string, number> = {
  GER: 0xa9ae98,
  FRA: 0x8c88b5,
  GBR: 0xb4a9a0,
  SOV: 0xd19a93,
  ITA: 0xd8cb93,
  USA: 0x9db3c9,
  JAP: 0xe3c7a5,
  POL: 0xe2bdb8,
  ESP: 0xd7b39a,
  CHI: 0xc9d29b,
};

/** Fond « papier » vers lequel on éclaircit les autres couleurs. */
const PAPER = 0xd3cdbc;

function mix(a: number, b: number, t: number): number {
  const ch = (c: number, s: number) => (c >> s) & 0xff;
  const m = (s: number) => Math.round(ch(a, s) * (1 - t) + ch(b, s) * t) << s;
  return m(16) | m(8) | m(0);
}

/**
 * Couleur de la nation sur la carte : la teinte pastel de la maquette pour les
 * grandes puissances, sinon sa couleur de la simulation adoucie vers le papier.
 */
export function mapColor(nationId: string, simColor: number): number {
  return PASTEL[nationId] ?? mix(simColor, PAPER, 0.55);
}
