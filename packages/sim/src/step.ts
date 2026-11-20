import { NATION_INDEX } from "./scenario/nations1936.ts";
import { MAP_1936, type MapDef } from "./map.ts";
import type { GameState } from "./state.ts";
import type { IssuedCommand } from "./commands.ts";

export interface StepOptions {
  /** Autorise les commandes de debug. */
  debug?: boolean;
  map?: MapDef;
}

export interface StepResult {
  state: GameState;
  /** Provinces dont le propriétaire a changé pendant ce jour. */
  changedProvinces: number[];
  /** Commandes refusées, avec la raison. */
  rejected: { issued: IssuedCommand; reason: string }[];
}

/**
 * Avance la partie d'un jour. Fonction pure : ne modifie pas `prev`.
 */
export function step(prev: GameState, commands: readonly IssuedCommand[] = [], opts: StepOptions = {}): StepResult {
  const map = opts.map ?? MAP_1936;
  const state: GameState = {
    day: prev.day + 1,
    rng: prev.rng,
    owners: prev.owners.slice(),
    nations: prev.nations.map((n) => ({ ...n })),
  };
  const changed = new Set<number>();
  const rejected: StepResult["rejected"] = [];

  for (const issued of commands) {
    const reason = applyCommand(state, issued, map, opts);
    if (reason) rejected.push({ issued, reason });
    else if (issued.command.type === "debug.transferProvince") changed.add(issued.command.province);
  }

  // Économie provisoire : chaque province rapporte un point par jour.
  for (const owner of state.owners) state.nations[owner]!.production += 1;

  // Capitulation : une nation sans province est vaincue.
  const alive = new Set(state.owners);
  state.nations.forEach((n, i) => {
    if (!n.defeated && !alive.has(i)) n.defeated = true;
  });

  return { state, changedProvinces: [...changed].sort((a, b) => a - b), rejected };
}

function applyCommand(state: GameState, issued: IssuedCommand, map: MapDef, opts: StepOptions): string | null {
  const c = issued.command;
  switch (c.type) {
    case "debug.transferProvince": {
      if (!opts.debug) return "commandes de debug désactivées";
      if (!Number.isInteger(c.province) || c.province < 0 || c.province >= map.provinces.length) return "province inconnue";
      const to = NATION_INDEX.get(c.to);
      if (to === undefined) return "nation inconnue";
      state.owners[c.province] = to;
      return null;
    }
    default:
      return "commande inconnue";
  }
}
