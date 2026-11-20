/**
 * Fonctions pures pour lire les réponses de Wikidata et de Wikimedia Commons.
 * Elles sont testées sans réseau (test/wikimedia.test.ts).
 */

/** Une illustration prête pour le jeu, telle qu'écrite dans manifest.json. */
export interface ImageRecord {
  id: string;
  kind: string;
  label: string;
  /** Rang dans le catalogue (pour garder l'ordre voulu, par exemple les dirigeants de 1936 d'abord). */
  order: number;
  nation?: string;
  /** Vignette servie par upload.wikimedia.org. */
  url: string;
  width: number;
  height: number;
  /** Copie locale (chemin depuis la racine du site), si l'outil a tourné avec --download. */
  local?: string;
  /** Nom du fichier sur Commons, sans le préfixe « File: ». */
  file: string;
  /** Page du fichier sur Commons, à citer dans les crédits. */
  source: string;
  author: string;
  license: string;
  licenseUrl?: string;
  /** Élément Wikidata et article Wikipédia, pour l'encyclopédie. */
  wikidata: string;
  wikipedia: string;
  sensitive?: boolean;
}

export interface ImageManifest {
  generatedAt: string;
  note: string;
  images: Record<string, ImageRecord>;
}

/** Valeur simplifiée d'une déclaration Wikidata (image ou drapeau). */
interface Claim {
  rank?: string;
  mainsnak?: { datavalue?: { value?: unknown } };
  qualifiers?: Record<string, { datavalue?: { value?: { time?: string } } }[]>;
}

const year = (time: string | undefined): number | undefined => {
  const m = time?.match(/^([+-]\d+)-/);
  return m ? Number(m[1]) : undefined;
};

/**
 * Choisit la déclaration valable à une date donnée : d'abord celles dont la
 * période (P580 début, P582 fin) couvre l'année, puis le rang « préféré »,
 * puis la première. Ignore les déclarations dépréciées.
 */
export function pickClaim(claims: Claim[] | undefined, atYear: number): string | undefined {
  const usable = (claims ?? []).filter((c) => c.rank !== "deprecated" && typeof c.mainsnak?.datavalue?.value === "string");
  if (!usable.length) return undefined;
  const span = (c: Claim) => ({
    start: year(c.qualifiers?.P580?.[0]?.datavalue?.value?.time),
    end: year(c.qualifiers?.P582?.[0]?.datavalue?.value?.time),
  });
  const dated = usable.filter((c) => {
    const { start, end } = span(c);
    return (start !== undefined || end !== undefined) && (start ?? -Infinity) <= atYear && atYear <= (end ?? Infinity);
  });
  const undated = usable.filter((c) => {
    const { start, end } = span(c);
    return start === undefined && end === undefined;
  });
  const pool = dated.length ? dated : undated.length ? undated : usable;
  const best = pool.find((c) => c.rank === "preferred") ?? pool[0];
  return best?.mainsnak?.datavalue?.value as string;
}

/** Retire les balises HTML et les espaces superflus (auteurs, crédits). */
export function stripHtml(html: string | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Licences acceptées : domaine public, CC0, CC BY et CC BY-SA (toutes versions).
 * Tout le reste (GFDL seule, licences non commerciales, usage restreint) est refusé.
 */
export function isAllowedLicense(license: string | undefined, shortName: string | undefined): boolean {
  const code = (license ?? "").toLowerCase();
  const name = (shortName ?? "").toLowerCase();
  if (/(^|\b)(nc|nd)(\b|-)/.test(code) || /\bnc\b|non[- ]?commercial|\bnd\b/.test(name)) return false;
  if (code === "pd" || code.startsWith("pd-") || code === "cc0" || /^cc-by(-sa)?(-\d|$)/.test(code)) return true;
  // « Attribution », « No restrictions » et « Copyrighted free use » sont des licences libres de Commons.
  if (code === "attribution" || /^(attribution|no restrictions|copyrighted free use)$/.test(name)) return true;
  return /public domain|domaine public|^cc0|^cc by(-sa)? \d|^cc by(-sa)?$/.test(name);
}

/** Nom lisible de la licence, en français pour le domaine public. */
export function licenseLabel(shortName: string | undefined, license: string | undefined): string {
  const s = (shortName ?? license ?? "").trim();
  if (/public domain/i.test(s) || /^pd/i.test(license ?? "")) return "Domaine public";
  return s;
}

/** Encode un nom de fichier Commons pour une URL de page. */
export function commonsPage(file: string): string {
  return "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(file.replace(/ /g, "_"));
}

export function frwikiUrl(title: string): string {
  return "https://fr.wikipedia.org/wiki/" + encodeURIComponent(title.replace(/ /g, "_"));
}

/** Normalise un titre pour comparer ce qu'on demande et ce que Wikidata renvoie. */
export function normTitle(t: string): string {
  return t.replace(/_/g, " ").trim().replace(/^./, (c) => c.toUpperCase());
}

/** Auteur lisible : sans HTML, sans répétition, « Auteur inconnu » en français. */
export function cleanAuthor(html: string | undefined): string {
  let s = stripHtml(html);
  // Commons répète parfois l'auteur (« Unknown author Unknown author »).
  const words = s.split(" ");
  for (let n = 1; n <= words.length / 2; n++) {
    if (words.length === 2 * n && words.slice(0, n).join(" ") === words.slice(n).join(" ")) s = words.slice(0, n).join(" ");
  }
  return s.replace(/^(anonymous )?unknown( author)?$/i, "Auteur inconnu").replace(/^anonymous$/i, "Anonyme");
}
