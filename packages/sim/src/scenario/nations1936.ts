/**
 * Nations présentes sur la carte au 1er janvier 1936.
 *
 * Les couleurs sont propres à War Board. Les colonies, protectorats et mandats
 * sont rattachés à la puissance qui les administre (Algérie à la France,
 * Libye à l'Italie, Palestine au Royaume-Uni, etc.).
 */
export interface NationDef {
  /** Code court et stable, utilisé partout dans la simulation. */
  id: string;
  /** Nom affiché en français. */
  name: string;
  /** Couleur de remplissage sur la carte (hexadécimal RGB). */
  color: number;
  /** Nom court pour la carte, si le nom complet est trop long. */
  short?: string;
  /** Grande puissance proposée en premier dans le salon. */
  major: boolean;
}

export const NATIONS_1936: readonly NationDef[] = [
  // Grandes puissances
  { id: "GER", name: "Allemagne", color: 0x6b6f5a, major: true },
  { id: "FRA", name: "France", color: 0x4f6fa8, major: true },
  { id: "GBR", name: "Royaume-Uni", color: 0xb5524a, major: true },
  { id: "ITA", name: "Italie", color: 0x5f9a5a, major: true },
  { id: "SOV", name: "URSS", color: 0x8e3b3b, major: true },
  { id: "POL", name: "Pologne", color: 0xc7849a, major: true },
  { id: "ESP", name: "Espagne", color: 0xd3b04a, major: true },
  { id: "TUR", name: "Turquie", color: 0x9aa36a, major: true },
  // Autres nations
  { id: "POR", name: "Portugal", color: 0x3f8f7a, major: false },
  { id: "IRL", name: "Irlande", color: 0x7fbf6a, major: false },
  { id: "BEL", name: "Belgique", color: 0xc9a35a, major: false },
  { id: "NED", name: "Pays-Bas", color: 0xd98a3a, major: false },
  { id: "LUX", name: "Luxembourg", color: 0x6fa0c8, major: false },
  { id: "SUI", name: "Suisse", color: 0xc25a5a, major: false },
  { id: "AUT", name: "Autriche", color: 0xd8d0c0, major: false },
  { id: "CZE", name: "Tchécoslovaquie", color: 0x5fa0a8, major: false },
  { id: "HUN", name: "Hongrie", color: 0xa86f4a, major: false },
  { id: "ROM", name: "Roumanie", color: 0xc8b86a, major: false },
  { id: "YUG", name: "Yougoslavie", color: 0x7f6fa8, major: false },
  { id: "BUL", name: "Bulgarie", color: 0x5a8a4a, major: false },
  { id: "GRE", name: "Grèce", color: 0x6aa8d0, major: false },
  { id: "ALB", name: "Albanie", color: 0x9a5a7a, major: false },
  { id: "DEN", name: "Danemark", color: 0xc8705a, major: false },
  { id: "NOR", name: "Norvège", color: 0xa86a6a, major: false },
  { id: "SWE", name: "Suède", color: 0x5a7fc8, major: false },
  { id: "FIN", name: "Finlande", color: 0xe0e0e8, major: false },
  { id: "ISL", name: "Islande", color: 0x8ab0d8, major: false },
  { id: "EST", name: "Estonie", color: 0x4a6a8a, major: false },
  { id: "LAT", name: "Lettonie", color: 0x9a4a5a, major: false },
  { id: "LIT", name: "Lituanie", color: 0xb8a04a, major: false },
  { id: "DAN", name: "Ville libre de Dantzig", short: "Dantzig", color: 0xd8b8a0, major: false },
  { id: "EGY", name: "Égypte", color: 0xd8c890, major: false },
  { id: "IRQ", name: "Irak", color: 0xa8986a, major: false },
  { id: "IRN", name: "Iran", color: 0x7a9a7a, major: false },
  { id: "SAU", name: "Arabie saoudite", color: 0x8aa86a, major: false },
];

export const NATION_INDEX: ReadonlyMap<string, number> = new Map(
  NATIONS_1936.map((n, i) => [n.id, i]),
);
