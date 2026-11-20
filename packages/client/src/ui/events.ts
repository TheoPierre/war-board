import { MAP_1936, NATIONS_1936, divisionLabel, type GameEvent } from "@war-board/sim";

const pname = (p: number) => MAP_1936.provinces[p]?.name ?? "?";
const nname = (n: number) => NATIONS_1936[n]?.name ?? "?";

/** Phrase à afficher pour un événement qui concerne la nation jouée, sinon null. */
export function describeEvent(e: GameEvent, me: number): string | null {
  switch (e.type) {
    case "war":
      if (e.attacker === me) return `Vous déclarez la guerre à ${nname(e.target)}.`;
      if (e.target === me) return `${nname(e.attacker)} vous déclare la guerre !`;
      return `${nname(e.attacker)} déclare la guerre à ${nname(e.target)}.`;
    case "captured":
      if (e.by === me) return `Vos troupes occupent ${pname(e.province)}.`;
      if (e.from === me) return `${pname(e.province)} est tombée aux mains de ${nname(e.by)}.`;
      return null;
    case "repulsed":
      if (e.attackers.includes(me)) return `Attaque sur ${pname(e.province)} repoussée.`;
      if (e.defender === me) return `Attaque ennemie repoussée à ${pname(e.province)}.`;
      return null;
    case "destroyed":
      if (e.nation === me) return `${capitalize(divisionLabel(e.unitType, e.num))} détruite à ${pname(e.province)}.`;
      return null;
    case "retreat":
      if (e.nation === me) return `Repli de ${pname(e.from)} vers ${pname(e.to)}.`;
      return null;
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
