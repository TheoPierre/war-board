import { UNIT_SYMBOLS } from "../../map/unitSymbols.ts";

/** Silhouette d'un type de division (la même que sur les pions de la carte). */
export function UnitSymbol({ type, className = "usym" }: { type: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: UNIT_SYMBOLS[type] ?? UNIT_SYMBOLS.infantry! }}
    />
  );
}
