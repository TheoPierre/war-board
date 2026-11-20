/**
 * Construit la bibliothèque d'illustrations à partir de Wikidata et de
 * Wikimedia Commons.
 *
 *   pnpm images:build                 met à jour manifest.json (vignettes servies par Wikimedia)
 *   pnpm images:build --download      copie aussi les vignettes dans le client (pour le VPS)
 *   pnpm images:build --kind=general  ne traite qu'un type (les autres entrées sont gardées)
 *
 * Étapes :
 *  1. Lit le catalogue (src/images/catalog.ts).
 *  2. Retrouve chaque élément Wikidata par son article Wikipédia en français.
 *  3. Prend l'image (P18), ou pour un drapeau celui en usage en 1936 (P41).
 *  4. Lit sur Commons l'URL de la vignette, l'auteur et la licence.
 *  5. Garde seulement le domaine public, CC0, CC BY et CC BY-SA.
 *  6. Écrit packages/client/public/images/manifest.json et un rapport
 *     (packages/tools/images-report.md) qui liste ce qui manque.
 *
 * L'outil fait peu de requêtes (par lots de 50, une à la fois, avec une pause)
 * pour respecter les règles d'usage des API de Wikimedia.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOG, THUMB_WIDTH, type CatalogEntry } from "./images/catalog.ts";
import {
  cleanAuthor,
  commonsPage,
  frwikiUrl,
  isAllowedLicense,
  licenseLabel,
  normTitle,
  pickClaim,
  type ImageManifest,
  type ImageRecord,
} from "./images/wikimedia.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC = join(ROOT, "client", "public");
const MANIFEST = join(PUBLIC, "images", "manifest.json");
const REPORT = join(ROOT, "tools", "images-report.md");
/** Wikimedia demande un User-Agent qui décrit l'outil. Ajoutez-y un contact si vous le souhaitez. */
const USER_AGENT = "war-board-image-tool/0.1 (jeu de strategie amateur, usage ponctuel)";
const PAUSE_MS = 800;
const YEAR = 1936;

const args = process.argv.slice(2);
const download = args.includes("--download");
const onlyKind = args.find((a) => a.startsWith("--kind="))?.slice(7);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    await sleep(PAUSE_MS);
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT } });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const wait = Number(res.headers.get("retry-after")) * 1000 || 2000 * 2 ** attempt;
      console.warn(`  ${res.status}, nouvel essai dans ${Math.round(wait / 1000)} s`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${res.status} ${res.statusText} pour ${url}`);
  }
}

const chunks = <T,>(list: T[], n: number): T[][] => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

const WD = "https://www.wikidata.org/w/api.php?format=json&formatversion=2&action=wbgetentities&props=claims%7Csitelinks&sitefilter=frwiki";

/** Étape 2 : élément Wikidata de chaque entrée (clé = id de l'entrée). */
async function resolveEntities(entries: CatalogEntry[]): Promise<Map<string, any>> {
  const out = new Map<string, any>();
  const byQid = entries.filter((e) => e.qid);
  for (const batch of chunks(byQid, 50)) {
    const data = await getJson(`${WD}&ids=${batch.map((e) => e.qid).join("%7C")}`);
    for (const e of batch) if (data.entities?.[e.qid!] && !("missing" in data.entities[e.qid!])) out.set(e.id, data.entities[e.qid!]);
  }
  const byTitle = entries.filter((e) => !e.qid);
  for (const [i, batch] of chunks(byTitle, 50).entries()) {
    console.log(`  Wikidata, lot ${i + 1}/${Math.ceil(byTitle.length / 50)}`);
    const titles = [...new Set(batch.map((e) => e.frwiki))];
    const data = await getJson(`${WD}&sites=frwiki&titles=${titles.map(encodeURIComponent).join("%7C")}`);
    const byFr = new Map<string, any>();
    for (const ent of Object.values<any>(data.entities ?? {})) {
      const t = ent.sitelinks?.frwiki?.title;
      if (t && !("missing" in ent)) byFr.set(normTitle(t), ent);
    }
    for (const e of batch) {
      const ent = byFr.get(normTitle(e.frwiki));
      if (ent) out.set(e.id, ent);
    }
  }
  // Titres qui sont des redirections : une requête par titre avec normalize=1,
  // qui suit la redirection côté Wikipédia ; la réponse est alors sans ambiguïté.
  for (const e of byTitle.filter((e) => !out.has(e.id))) {
    const data = await getJson(`${WD}&sites=frwiki&normalize=1&titles=${encodeURIComponent(e.frwiki)}`);
    const ent = Object.values<any>(data.entities ?? {}).find((x) => !("missing" in x));
    if (ent) out.set(e.id, ent);
  }
  return out;
}

/** Étape 4 : informations Commons pour une liste de fichiers à une largeur donnée. */
async function commonsInfo(files: string[], width: number): Promise<Map<string, any>> {
  const out = new Map<string, any>();
  const filter = "LicenseShortName|License|LicenseUrl|Artist|Credit|AttributionRequired|UsageTerms";
  for (const batch of chunks(files, 50)) {
    const url =
      "https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&action=query&prop=imageinfo" +
      `&iiprop=url%7Csize%7Cmime%7Cextmetadata&iiurlwidth=${width}&iiextmetadatafilter=${encodeURIComponent(filter)}` +
      `&titles=${batch.map((f) => encodeURIComponent("File:" + f)).join("%7C")}`;
    const data = await getJson(url);
    const alias = new Map<string, string>();
    for (const n of data.query?.normalized ?? []) alias.set(n.to, n.from);
    for (const n of data.query?.redirects ?? []) alias.set(n.to, alias.get(n.from) ?? n.from);
    for (const page of data.query?.pages ?? []) {
      if (page.missing || !page.imageinfo?.[0]) continue;
      const asked = (alias.get(page.title) ?? page.title).replace(/^File:/, "");
      out.set(normTitle(asked), { ...page.imageinfo[0], title: page.title.replace(/^File:/, "") });
    }
  }
  return out;
}

async function main() {
  const entries = CATALOG.filter((e) => !onlyKind || e.kind === onlyKind);
  if (!entries.length) throw new Error(`Aucune entrée pour --kind=${onlyKind}`);
  const previous: ImageManifest | undefined = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : undefined;
  const images: Record<string, ImageRecord> = {};
  if (onlyKind && previous) for (const [k, v] of Object.entries(previous.images)) if (v.kind !== onlyKind) images[k] = v;
  const problems: string[] = [];
  // Avec --kind, on garde les problèmes déjà signalés pour les autres types.
  if (onlyKind && existsSync(REPORT)) {
    for (const line of readFileSync(REPORT, "utf8").split("\n")) {
      const kind = line.match(/^\| ([a-z]+):/)?.[1];
      if (kind && kind !== onlyKind) problems.push(line);
    }
  }

  console.log(`Catalogue : ${entries.length} entrées`);
  const entities = await resolveEntities(entries);

  // Étape 3 : fichier Commons de chaque entrée.
  const fileOf = new Map<string, string>();
  for (const e of entries) {
    if (e.file) { fileOf.set(e.id, e.file); continue; }
    const ent = entities.get(e.id);
    if (!ent) { problems.push(`| ${e.id} | ${e.frwiki} | article introuvable sur Wikidata |`); continue; }
    const file = pickClaim(ent.claims?.[e.kind === "flag" ? "P41" : "P18"], YEAR) ?? (e.kind === "flag" ? undefined : pickClaim(ent.claims?.P154, YEAR));
    if (!file) { problems.push(`| ${e.id} | ${e.frwiki} | pas d'image sur Wikidata (${ent.id}) |`); continue; }
    fileOf.set(e.id, file);
  }

  // Étape 4, groupée par largeur de vignette.
  const widths = [...new Set(entries.map((e) => THUMB_WIDTH[e.kind]))];
  const info = new Map<string, any>();
  for (const w of widths) {
    const files = [...new Set(entries.filter((e) => THUMB_WIDTH[e.kind] === w && fileOf.has(e.id)).map((e) => fileOf.get(e.id)!))];
    console.log(`  Commons, ${files.length} fichiers à ${w} px`);
    const got = await commonsInfo(files, w);
    for (const [f, v] of got) info.set(`${w}|${f}`, v);
  }

  // Étape 5 : licences, puis enregistrement.
  for (const e of entries) {
    const file = fileOf.get(e.id);
    if (!file) continue;
    const ii = info.get(`${THUMB_WIDTH[e.kind]}|${normTitle(file)}`);
    if (!ii) { problems.push(`| ${e.id} | ${e.frwiki} | fichier absent de Commons : ${file} |`); continue; }
    const m = ii.extmetadata ?? {};
    const lic = m.License?.value as string | undefined;
    const short = m.LicenseShortName?.value as string | undefined;
    if (!isAllowedLicense(lic, short)) { problems.push(`| ${e.id} | ${e.frwiki} | licence refusée : ${short ?? lic ?? "inconnue"} |`); continue; }
    const ent = entities.get(e.id);
    images[e.id] = {
      id: e.id,
      kind: e.kind,
      label: e.label,
      order: CATALOG.indexOf(e),
      ...(e.nation ? { nation: e.nation } : {}),
      url: ii.thumburl ?? ii.url,
      width: ii.thumbwidth ?? ii.width,
      height: ii.thumbheight ?? ii.height,
      file: ii.title,
      source: commonsPage(ii.title),
      author: cleanAuthor(m.Artist?.value) || cleanAuthor(m.Credit?.value) || "Auteur inconnu",
      license: licenseLabel(short, lic),
      ...(m.LicenseUrl?.value ? { licenseUrl: m.LicenseUrl.value } : {}),
      wikidata: ent?.id ?? e.qid ?? "",
      wikipedia: frwikiUrl(ent?.sitelinks?.frwiki?.title ?? e.frwiki),
      ...(e.sensitive ? { sensitive: true } : {}),
    };
  }

  // Copie locale facultative.
  if (download) {
    const recs = Object.values(images).filter((r) => !onlyKind || r.kind === onlyKind);
    console.log(`Téléchargement de ${recs.length} vignettes`);
    for (const r of recs) {
      const ext = (extname(new URL(r.url).pathname) || ".jpg").toLowerCase();
      const rel = `images/files/${r.kind}/${r.id.split(":")[1]}${ext}`;
      const dest = join(PUBLIC, rel);
      if (!existsSync(dest)) {
        await sleep(PAUSE_MS);
        const res = await fetch(r.url, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) { problems.push(`| ${r.id} | ${r.label} | téléchargement : ${res.status} |`); continue; }
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      }
      r.local = "/" + rel;
    }
  }

  const sorted = Object.fromEntries(Object.entries(images).sort(([a], [b]) => a.localeCompare(b)));
  const manifest: ImageManifest = {
    generatedAt: new Date().toISOString().slice(0, 10),
    note: "Généré par pnpm images:build depuis Wikidata et Wikimedia Commons. Chaque image garde son auteur et sa licence : les afficher dans les crédits.",
    images: sorted,
  };
  mkdirSync(dirname(MANIFEST), { recursive: true });
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + "\n");

  const count = (k: string) => Object.values(sorted).filter((r) => r.kind === k).length;
  const kinds = [...new Set(CATALOG.map((e) => e.kind))];
  writeFileSync(
    REPORT,
    `# Rapport des illustrations\n\nGénéré le ${manifest.generatedAt} par \`pnpm images:build\`.\n\n` +
      `| Type | Images | Catalogue |\n|---|---|---|\n` +
      kinds.map((k) => `| ${k} | ${count(k)} | ${CATALOG.filter((e) => e.kind === k).length} |`).join("\n") +
      `\n\n## À corriger (${problems.length})\n\nAjouter \`qid\` ou \`file\` à l'entrée dans packages/tools/src/images/catalog.ts.\n\n` +
      (problems.length ? `| Entrée | Article | Problème |\n|---|---|---|\n${problems.sort().join("\n")}\n` : "Rien à corriger.\n"),
  );
  console.log(`${Object.keys(sorted).length} images dans ${MANIFEST}`);
  console.log(`${problems.length} entrées à corriger, voir ${REPORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
