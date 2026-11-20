/**
 * Silhouettes des types de divisions (cadre 24 × 24), reprises de la maquette du HUD.
 * Chaque silhouette est construite une fois puis partagée par tous les pions.
 */
export const UNIT_SYMBOLS: Record<string, string> = {
  infantry: `<path d="M3 16.5C3 10 7 6 12 6s9 4 9 10.5zM1.5 17h21v1.8c0 .7-.6 1.2-1.3 1.2H2.8c-.7 0-1.3-.5-1.3-1.2zM11 3.5h2V6h-2z"/>`,
  armor: `<path d="M9 7h6l1.5 3H22v1.5h-5.5V12h3l2 2.5-1 3.5h-17l-1.5-3.5L4 12h3.5v-2z"/><circle cx="5.5" cy="18.5" r="1.4"/><circle cx="9.5" cy="18.5" r="1.4"/><circle cx="13.5" cy="18.5" r="1.4"/><circle cx="17.5" cy="18.5" r="1.4"/>`,
  artillery: `<path d="M3 13.5l15-8 1 1.8-12 7.2 1 2.5H5zM9.5 13h6.5v2h-5.5zM14 15l6 5h-2l-5-4z"/><circle cx="9" cy="17.5" r="3.2"/>`,
  motorized: `<path d="M1.5 7h12v9.5h-12zM14.5 9.5h4.3l3.7 4v3h-8z"/><circle cx="5.5" cy="18" r="2.2"/><circle cx="17.5" cy="18" r="2.2"/>`,
  cavalry: `<path d="M6 21l1.2-5.5L4 13.2l2-5.4L10.5 3l1.2 2.2 4.3 1.4 3.4 4.4-2 2.4-3.1-1-1.1 3 2.2 5.6z"/>`,
};
