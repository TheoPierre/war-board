/**
 * Bibliothèque d'illustrations (Wikidata et Wikimedia Commons).
 *
 * Le fichier public/images/manifest.json est produit par `pnpm images:build`
 * (packages/tools). Chaque image garde son auteur et sa licence, que le jeu
 * affiche dans les crédits.
 */
import { useEffect, useState } from "react";

export type ImageKind = "flag" | "leader" | "general" | "admiral" | "ship" | "equipment" | "city" | "event";

export interface ImageRecord {
  id: string;
  kind: ImageKind;
  label: string;
  order: number;
  nation?: string;
  url: string;
  width: number;
  height: number;
  local?: string;
  file: string;
  source: string;
  author: string;
  license: string;
  licenseUrl?: string;
  wikidata: string;
  wikipedia: string;
  sensitive?: boolean;
}

export interface ImageLibrary {
  byId: ReadonlyMap<string, ImageRecord>;
  all: readonly ImageRecord[];
}

const EMPTY: ImageLibrary = { byId: new Map(), all: [] };
let cache: ImageLibrary | null = null;
let pending: Promise<ImageLibrary> | null = null;

export function loadImages(): Promise<ImageLibrary> {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch(`${import.meta.env.BASE_URL}images/manifest.json`)
    .then((r) => (r.ok ? r.json() : { images: {} }))
    .then((m: { images?: Record<string, ImageRecord> }) => {
      const all = Object.values(m.images ?? {}).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      cache = { byId: new Map(all.map((r) => [r.id, r])), all };
      return cache;
    })
    .catch(() => EMPTY);
  return pending;
}

/** La bibliothèque, vide tant que le manifeste n'est pas chargé. */
export function useImageLibrary(): ImageLibrary {
  const [lib, setLib] = useState<ImageLibrary>(cache ?? EMPTY);
  useEffect(() => {
    let alive = true;
    loadImages().then((l) => alive && setLib(l));
    return () => {
      alive = false;
    };
  }, []);
  return lib;
}

export function useImage(id: string | undefined): ImageRecord | undefined {
  const lib = useImageLibrary();
  return id ? lib.byId.get(id) : undefined;
}

/** Adresse à utiliser : copie locale si elle existe, sinon la vignette de Wikimedia. */
export const imageSrc = (r: ImageRecord) => r.local ?? r.url;

/** Premier dirigeant connu d'une nation (ordre du catalogue : celui de 1936 d'abord). */
export function leaderOf(lib: ImageLibrary, nation: string): ImageRecord | undefined {
  return lib.all.find((r) => r.kind === "leader" && r.nation === nation);
}

export const KIND_LABELS: Record<ImageKind, string> = {
  flag: "Drapeaux",
  leader: "Dirigeants",
  general: "Généraux",
  admiral: "Amiraux",
  ship: "Navires",
  equipment: "Armes et matériels",
  city: "Villes",
  event: "Événements",
};
