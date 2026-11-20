/**
 * Icônes du HUD (traits fins, cadre 24 × 24), reprises de la maquette.
 * Le sprite est inséré une fois dans la page ; <Icon> y fait référence.
 */
const SPRITE = `
  <symbol id="i-argent" viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 10v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-4M5 14v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-4"/></symbol>
  <symbol id="i-nourriture" viewBox="0 0 24 24"><path d="M12 22V8M12 8c-2-1-3-3-3-5 2 .5 3 2 3 5zm0 0c2-1 3-3 3-5-2 .5-3 2-3 5zM12 13c-2.5-.6-4-2.4-4.3-4.6 2.3.3 3.8 2 4.3 4.6zm0 0c2.5-.6 4-2.4 4.3-4.6-2.3.3-3.8 2-4.3 4.6zM12 18c-2.5-.6-4-2.4-4.3-4.6 2.3.3 3.8 2 4.3 4.6zm0 0c2.5-.6 4-2.4 4.3-4.6-2.3.3-3.8 2-4.3 4.6z"/></symbol>
  <symbol id="i-acier" viewBox="0 0 24 24"><path d="M4 5h16M4 19h16M12 5v14M8 5v1.5M16 5v1.5M8 19v-1.5M16 19v-1.5"/></symbol>
  <symbol id="i-petrole" viewBox="0 0 24 24"><path d="M12 3c3 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-6.5 6-11z"/><path d="M9.5 15a2.6 2.6 0 0 0 2.5 2.5"/></symbol>
  <symbol id="i-caoutchouc" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3.5v2.3M12 18.2v2.3M3.5 12h2.3M18.2 12h2.3M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/></symbol>
  <symbol id="i-maindoeuvre" viewBox="0 0 24 24"><circle cx="9" cy="7.5" r="3"/><path d="M3.5 20c.4-4 2.6-6.5 5.5-6.5s5.1 2.5 5.5 6.5"/><circle cx="17" cy="8.5" r="2.4"/><path d="M15.5 13.6c.5-.2 1-.3 1.5-.3 2.3 0 4 2 4.3 5.2"/></symbol>
  <symbol id="i-munitions" viewBox="0 0 24 24"><path d="M7 21V10c0-3 1-5.5 2-7 1 1.5 2 4 2 7v11zM13 21V10c0-3 1-5.5 2-7 1 1.5 2 4 2 7v11zM6 21h12M7 17h4M13 17h4"/></symbol>
  <symbol id="i-journal" viewBox="0 0 24 24"><path d="M4 5h13v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM17 9h3v10a2 2 0 0 1-2 2M7 8.5h7M7 12h7M7 15.5h4"/></symbol>
  <symbol id="i-diplomatie" viewBox="0 0 24 24"><path d="M6 4h10a2 2 0 0 1 2 2v9M6 4a2 2 0 0 0-2 2v1h4M6 4a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1h-9M11 8h4M11 11h4"/><circle cx="15.5" cy="15" r="0.1"/></symbol>
  <symbol id="i-economie" viewBox="0 0 24 24"><path d="M3 21V11l5 3V11l5 3V11l5 3V4h3v17zM3 21h18M7 18h2M12 18h2M17 18h2"/></symbol>
  <symbol id="i-armee" viewBox="0 0 24 24"><path d="M3.5 15.5c0-5 3.8-9 8.5-9s8.5 4 8.5 9M2 15.5h20c0 1.3-1 2-2.3 2H4.3C3 17.5 2 16.8 2 15.5zM12 6.5V4.5M8 10.5c1-.8 2.4-1.3 4-1.3"/></symbol>
  <symbol id="i-renseignement" viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3.2"/></symbol>
  <symbol id="i-recherche" viewBox="0 0 24 24"><path d="M9.5 3h5M10 3v6.2L4.6 18.3A1.8 1.8 0 0 0 6.2 21h11.6a1.8 1.8 0 0 0 1.6-2.7L14 9.2V3M7.3 14.5h9.4"/></symbol>
  <symbol id="i-production" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/><circle cx="12" cy="12" r="6.5"/></symbol>
  <symbol id="i-objectifs" viewBox="0 0 24 24"><path d="M5 21V3.5M5 4h12l-2.5 4L17 12H5"/></symbol>
  <symbol id="i-pause" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" stroke-width="3"/></symbol>
  <symbol id="i-reglages" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></symbol>
  <symbol id="i-plein" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></symbol>
  <symbol id="i-quitter" viewBox="0 0 24 24"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/></symbol>
  <symbol id="i-chat" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></symbol>
  <symbol id="i-livre" viewBox="0 0 24 24"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"/></symbol>
  <symbol id="i-temps" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></symbol>
  <symbol id="i-fermer" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="i-epees" viewBox="0 0 24 24"><path d="M4 4l11 11M15 15l-2 2M15 15l2-2M16 16l4 4M20 4L9 15M9 15l2 2M9 15l-2-2M8 16l-4 4"/></symbol>
  <symbol id="i-politique" viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/></symbol>
  <symbol id="i-terrain" viewBox="0 0 24 24"><path d="M2 19l6.5-11 4 6.5 2.5-4L22 19zM7 11.5l1.5 1.5 1.5-1.5"/></symbol>
  <symbol id="i-ressources" viewBox="0 0 24 24"><path d="M6 3l12 0 3 6-9 12L3 9zM3 9h18M9 3l3 18M15 3l-3 18"/></symbol>
  <symbol id="i-ravitaillement" viewBox="0 0 24 24"><path d="M2 7h11v9H2zM13 10h4.5l3.5 3.5V16h-8"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></symbol>
  <symbol id="i-diplo2" viewBox="0 0 24 24"><circle cx="8.5" cy="12" r="5.5"/><circle cx="15.5" cy="12" r="5.5"/></symbol>
  <symbol id="i-usine" viewBox="0 0 24 24"><path d="M3 21V9l6 3.5V9l6 3.5V4h4v17zM3 21h18"/></symbol>
  <symbol id="i-caserne" viewBox="0 0 24 24"><path d="M3 10l9-5 9 5M5 10v10h14V10M10 20v-5h4v5M3 20h18"/></symbol>
  <symbol id="i-port" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 10h8M4 14c0 4 4 7 8 7s8-3 8-7M4 14l-1.5 1.5M20 14l1.5 1.5"/></symbol>
  <symbol id="i-fort" viewBox="0 0 24 24"><path d="M3 20V8h3v2h3V8h6v2h3V8h3v12zM9 20v-5h6v5M3 20h18"/></symbol>
  <symbol id="i-pluie" viewBox="0 0 24 24"><path d="M7 15a4 4 0 0 1 .5-8A5.5 5.5 0 0 1 18 8.5a3.5 3.5 0 0 1-1 6.5zM8 18l-1 3M12 18l-1 3M16 18l-1 3"/></symbol>
  <symbol id="i-relief" viewBox="0 0 24 24"><path d="M2 18c3-1 5-6 8-6s4 3 6 3 4-2 6-3M2 22h20"/></symbol>
  <symbol id="i-avion2" viewBox="0 0 24 24"><path d="M12 3c1 0 1.5 1.5 1.5 3v4l7.5 4v2l-7.5-2v4l2.5 2v1.5L12 20.5 8 21.5V20l2.5-2v-4L3 16v-2l7.5-4V6c0-1.5.5-3 1.5-3z"/></symbol>
  <symbol id="i-moral" viewBox="0 0 24 24"><path d="M12 21s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.5-8 11-8 11z"/></symbol>
  <symbol id="i-cible" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/></symbol>
  <symbol id="i-bouclier" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.5 8-8 9.5C7.5 20 4 16.5 4 12V6z"/></symbol>
  <symbol id="i-fusion" viewBox="0 0 24 24"><path d="M5 4v4c0 3 7 4 7 8v4M19 4v4c0 3-7 4-7 8M9 17l3 3 3-3"/></symbol>
  <symbol id="i-fleche" viewBox="0 0 24 24"><path d="M4 18c3-8 9-11 15-11M14 3l5 4-4 5"/></symbol>
  <symbol id="u-inf" viewBox="0 0 24 24"><path d="M3 16.5C3 10 7 6 12 6s9 4 9 10.5zM1.5 17h21v1.8c0 .7-.6 1.2-1.3 1.2H2.8c-.7 0-1.3-.5-1.3-1.2zM11 3.5h2V6h-2z"/></symbol>
  <symbol id="u-char" viewBox="0 0 24 24"><path d="M9 7h6l1.5 3H22v1.5h-5.5V12h3l2 2.5-1 3.5h-17l-1.5-3.5L4 12h3.5v-2z"/><circle cx="5.5" cy="18.5" r="1.4"/><circle cx="9.5" cy="18.5" r="1.4"/><circle cx="13.5" cy="18.5" r="1.4"/><circle cx="17.5" cy="18.5" r="1.4"/></symbol>
  <symbol id="u-art" viewBox="0 0 24 24"><path d="M3 13.5l15-8 1 1.8-12 7.2 1 2.5H5zM9.5 13h6.5v2h-5.5z"/><circle cx="9" cy="17.5" r="3.2"/><circle cx="9" cy="17.5" r="1.1" fill="#000" fill-opacity=".35"/><path d="M14 15l6 5h-2l-5-4z"/></symbol>
  <symbol id="u-air" viewBox="0 0 24 24"><path d="M12 2.5c.9 0 1.4 1.3 1.4 2.8V9.5L22 13v2l-8.6-2v4.3l2.6 2v1.7L12 20l-4 1v-1.7l2.6-2V13L2 15v-2l8.6-3.5V5.3c0-1.5.5-2.8 1.4-2.8z"/></symbol>
  <symbol id="u-navire" viewBox="0 0 24 24"><path d="M1.5 14h21l-3 5.5H5zM5 14v-2.5h4V9h2V6h2v3h1.5v2.5H19V14zM12 3.5h1V6h-1z"/></symbol>
  <symbol id="u-sub" viewBox="0 0 24 24"><path d="M2 15c0-1.8 3-3 8-3h1V9h3l1 3c4 .3 7 1.4 7 3s-4.5 3-10 3S2 16.8 2 15zM12.5 9V6.5h1V9z"/></symbol>
`;

export type IconName =
  | "i-argent"
  | "i-nourriture"
  | "i-acier"
  | "i-petrole"
  | "i-caoutchouc"
  | "i-maindoeuvre"
  | "i-munitions"
  | "i-journal"
  | "i-diplomatie"
  | "i-economie"
  | "i-armee"
  | "i-renseignement"
  | "i-recherche"
  | "i-production"
  | "i-objectifs"
  | "i-pause"
  | "i-reglages"
  | "i-plein"
  | "i-quitter"
  | "i-chat"
  | "i-livre"
  | "i-temps"
  | "i-fermer"
  | "i-plus"
  | "i-epees"
  | "i-politique"
  | "i-terrain"
  | "i-ressources"
  | "i-ravitaillement"
  | "i-diplo2"
  | "i-usine"
  | "i-caserne"
  | "i-port"
  | "i-fort"
  | "i-pluie"
  | "i-relief"
  | "i-avion2"
  | "i-moral"
  | "i-cible"
  | "i-bouclier"
  | "i-fusion"
  | "i-fleche"
  | "u-inf"
  | "u-char"
  | "u-art"
  | "u-air"
  | "u-navire"
  | "u-sub";

/** À placer une fois en haut de la partie. */
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs dangerouslySetInnerHTML={{ __html: SPRITE }} />
    </svg>
  );
}

export function Icon({ name, className = "ico" }: { name: IconName; className?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`#${name}`} />
    </svg>
  );
}
