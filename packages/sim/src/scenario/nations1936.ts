/**
 * Nations présentes sur la carte du monde au 1er janvier 1936.
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
  { id: "USA", name: "États-Unis", color: 0x5f86b8, major: true },
  { id: "JAP", name: "Japon", color: 0xd6c08a, major: true },
  { id: "CHI", name: "Chine", color: 0x9cb58a, major: true },
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
  // Reste du monde (ajouté avec la carte mondiale)
  { id: "YEM", name: "Yémen", color: 0xb89a7a, major: false },
  { id: "AFG", name: "Afghanistan", color: 0x9a8a5a, major: false },
  { id: "ETH", name: "Éthiopie", color: 0x7aa05a, major: false },
  { id: "LIB", name: "Liberia", color: 0x8a7ab8, major: false },
  { id: "SAF", name: "Afrique du Sud", short: "Afr. du Sud", color: 0xc8a050, major: false },
  { id: "CAN", name: "Canada", color: 0xc06a6a, major: false },
  { id: "MEX", name: "Mexique", color: 0x6aa07a, major: false },
  { id: "GUA", name: "Guatemala", color: 0x7ab0c8, major: false },
  { id: "HON", name: "Honduras", color: 0xb0a0d0, major: false },
  { id: "ELS", name: "Salvador", color: 0x5a7ab0, major: false },
  { id: "NIC", name: "Nicaragua", color: 0xc8b070, major: false },
  { id: "COS", name: "Costa Rica", color: 0xa86a8a, major: false },
  { id: "PAN", name: "Panama", color: 0xd09a6a, major: false },
  { id: "CUB", name: "Cuba", color: 0x5aa0a0, major: false },
  { id: "HAI", name: "Haïti", color: 0x9a6aa0, major: false },
  { id: "DOM", name: "République dominicaine", short: "Rép. dominicaine", color: 0xc87a5a, major: false },
  { id: "COL", name: "Colombie", color: 0xd8c060, major: false },
  { id: "VEN", name: "Venezuela", color: 0xa85a5a, major: false },
  { id: "ECU", name: "Équateur", color: 0xc8c890, major: false },
  { id: "PER", name: "Pérou", color: 0xc07a7a, major: false },
  { id: "BOL", name: "Bolivie", color: 0x9ab06a, major: false },
  { id: "CHL", name: "Chili", color: 0x8a6a9a, major: false },
  { id: "ARG", name: "Argentine", color: 0x8ab8d8, major: false },
  { id: "URU", name: "Uruguay", color: 0x6a8ac8, major: false },
  { id: "PAR", name: "Paraguay", color: 0xb8805a, major: false },
  { id: "BRA", name: "Brésil", color: 0x5a9a6a, major: false },
  { id: "MON", name: "Mongolie", color: 0xb8706a, major: false },
  { id: "TAN", name: "Touva", color: 0xa07a6a, major: false },
  { id: "MAN", name: "Mandchoukouo", color: 0xb0a060, major: false },
  { id: "TIB", name: "Tibet", color: 0xd0b8a0, major: false },
  { id: "SIK", name: "Xinjiang", color: 0x7a9aa0, major: false },
  { id: "SIA", name: "Siam", color: 0x6a8aa8, major: false },
  { id: "NEP", name: "Népal", color: 0xa86a7a, major: false },
  { id: "BHU", name: "Bhoutan", color: 0xd8a070, major: false },
  { id: "AST", name: "Australie", color: 0x8aa0c0, major: false },
  { id: "NZL", name: "Nouvelle-Zélande", short: "N.-Zélande", color: 0x6a9a9a, major: false },
];

/**
 * Guerres en cours au 1er janvier 1936 : l'Italie envahit l'Éthiopie depuis
 * octobre 1935.
 */
export const WARS_1936: readonly (readonly [string, string])[] = [["ITA", "ETH"]];

export const NATION_INDEX: ReadonlyMap<string, number> = new Map(
  NATIONS_1936.map((n, i) => [n.id, i]),
);
