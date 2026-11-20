/**
 * Couleurs et polices de la carte, regroupées ici pour que la future refonte
 * graphique (carte façon papier mat, tons pastel, grands noms de pays espacés)
 * se fasse en changeant ce fichier plutôt que le code de dessin.
 */
export const MAP_THEME = {
  sea: 0x1b2a38,
  provinceBorder: { color: 0x000000, alpha: 0.22 },
  nationBorder: { color: 0x15130f, alpha: 0.9, px: 2.2 },
  coast: { color: 0x0b141c, alpha: 0.8, px: 1.2 },
  select: 0xffd75e,
  hover: 0xffffff,
  capital: { fill: 0xf4e4b0, stroke: 0x222222 },
  town: { color: 0x222222, alpha: 0.5 },
  nationLabel: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fill: 0xf6f0e0,
    stroke: 0x14110c,
    alpha: 0.85,
    /** Espacement des lettres, en proportion de la taille. */
    letterSpacing: 0.12,
  },
  provinceLabel: { fontFamily: "Georgia, serif", fill: 0x111111 },
  /** Pions des divisions : taille fixe à l'écran, en pixels. */
  unit: {
    width: 30,
    height: 18,
    border: 0x15130f,
    symbolFill: 0xf3eedf,
    symbolStroke: 0x15130f,
    text: 0xf8f4ea,
    selected: 0xffd75e,
    hpGood: 0x7cc46a,
    hpLow: 0xd9705a,
  },
  path: { own: 0xffffff, selected: 0xffd75e },
  battle: { fill: 0xb33a2e, stroke: 0xfff3dc },
  boxSelect: { fill: 0xffd75e, alpha: 0.12, stroke: 0xffd75e },
} as const;
