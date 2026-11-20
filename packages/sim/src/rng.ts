/**
 * Générateur pseudo-aléatoire déterministe (mulberry32). Son état est un
 * entier 32 bits stocké dans l'état de jeu, pour que deux machines qui
 * appliquent les mêmes commandes obtiennent exactement le même résultat.
 */
export function nextRandom(state: number): { value: number; state: number } {
  const s = (state + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: s };
}
