import { imageSrc, useImage } from "../media/images.ts";

/**
 * Illustration de la bibliothèque, avec son auteur et sa licence en info-bulle.
 * Les images marquées « sensibles » (symboles nazis) sont légèrement floutées.
 */
export function WikiImage({ id, className = "", alt }: { id: string; className?: string; alt?: string }) {
  const img = useImage(id);
  if (!img) return <span className={`wiki-img placeholder ${className}`} aria-hidden="true" />;
  return (
    <img
      className={`wiki-img ${img.sensitive ? "sensitive" : ""} ${className}`}
      src={imageSrc(img)}
      width={img.width}
      height={img.height}
      alt={alt ?? img.label}
      title={`${img.label} · ${img.author} · ${img.license} (Wikimedia Commons)`}
      loading="lazy"
      decoding="async"
    />
  );
}
