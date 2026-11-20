/**
 * Calendrier de jeu. Le jour 0 est le 1er janvier 1936.
 * Aucune dépendance à Date : le calcul est entièrement entier et déterministe.
 */

/** Durée réelle d'un jour de jeu à vitesse normale. */
export const MS_PER_DAY = 5000;

export const START_YEAR = 1936;

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

export interface GameDate {
  year: number;
  /** 1 à 12 */
  month: number;
  /** 1 à 31 */
  day: number;
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeap(y) ? 29 : 28;
  return m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31;
}

export function dateFromDay(dayIndex: number): GameDate {
  if (!Number.isInteger(dayIndex) || dayIndex < 0) throw new RangeError(`jour invalide : ${dayIndex}`);
  let y = START_YEAR;
  let rest = dayIndex;
  for (;;) {
    const len = isLeap(y) ? 366 : 365;
    if (rest < len) break;
    rest -= len;
    y++;
  }
  let m = 1;
  while (rest >= daysInMonth(y, m)) {
    rest -= daysInMonth(y, m);
    m++;
  }
  return { year: y, month: m, day: rest + 1 };
}

export function dayFromDate(date: GameDate): number {
  let n = 0;
  for (let y = START_YEAR; y < date.year; y++) n += isLeap(y) ? 366 : 365;
  for (let m = 1; m < date.month; m++) n += daysInMonth(date.year, m);
  return n + date.day - 1;
}

/** « 1er janvier 1936 », « 14 juillet 1936 ». */
export function formatDateFr(dayIndex: number): string {
  const d = dateFromDay(dayIndex);
  return `${d.day === 1 ? "1er" : d.day} ${MONTHS_FR[d.month - 1]} ${d.year}`;
}
