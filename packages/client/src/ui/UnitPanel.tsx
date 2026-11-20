import { MAP_1936, MAX_HP, UNIT_TYPES, divisionLabel, remainingTrip, type Battle, type Unit } from "@war-board/sim";

interface Props {
  units: Unit[];
  battles: readonly Battle[];
  moveMode: boolean;
  onMoveMode(on: boolean): void;
  onStop(): void;
  onSelectOnly(id: number): void;
  onClose(): void;
}

/** Divisions sélectionnées : état, destination et ordres. */
export function UnitPanel({ units, battles, moveMode, onMoveMode, onStop, onSelectOnly, onClose }: Props) {
  const byType = new Map<number, number>();
  for (const u of units) byType.set(u.type, (byType.get(u.type) ?? 0) + 1);
  const anyMoving = units.some((u) => u.path.length);
  const title = units.length === 1 ? divisionLabel(units[0]!.type, units[0]!.num) : `${units.length} divisions`;

  return (
    <aside className="panel unit-panel">
      <button className="close" onClick={onClose} aria-label="Fermer">
        ×
      </button>
      <h2>{title}</h2>
      {units.length > 1 && (
        <p className="composition">
          {[...byType]
            .sort((a, b) => a[0] - b[0])
            .map(([t, n]) => `${n} ${UNIT_TYPES[t]!.name.toLowerCase()}`)
            .join(" · ")}
        </p>
      )}
      <ul className="unit-list">
        {units.slice(0, 40).map((u) => (
          <li key={u.id} onClick={() => onSelectOnly(u.id)} title="Sélectionner seulement cette division">
            <div className="unit-line">
              <span className="unit-name">{divisionLabel(u.type, u.num)}</span>
              <span className="unit-hp">{Math.round((u.hp / MAX_HP) * 100)} %</span>
            </div>
            <div className="hpbar">
              <span style={{ width: `${(u.hp / MAX_HP) * 100}%` }} className={u.hp < MAX_HP / 2 ? "low" : ""} />
            </div>
            <div className="unit-status">{status(u, battles)}</div>
          </li>
        ))}
        {units.length > 40 && <li className="more">… et {units.length - 40} autres</li>}
      </ul>
      <div className="unit-actions">
        <button className={moveMode ? "active" : ""} onClick={() => onMoveMode(!moveMode)}>
          {moveMode ? "Choisissez la destination…" : "Déplacer"}
        </button>
        <button onClick={onStop} disabled={!anyMoving}>
          Arrêter
        </button>
      </div>
      <p className="hint">Clic droit sur une province pour y envoyer la sélection. Maj + glisser pour sélectionner plusieurs pions.</p>
    </aside>
  );
}

function status(u: Unit, battles: readonly Battle[]): string {
  const here = MAP_1936.provinces[u.province]!.name;
  const next = u.path[0];
  if (next === undefined) {
    const defending = battles.find((b) => b.province === u.province && b.defender === u.nation);
    return defending ? `Défend ${here}` : `À l'arrêt à ${here}`;
  }
  const attacking = battles.find((b) => b.province === next && b.from.includes(u.province) && b.attackers.includes(u.nation));
  if (attacking) return `Attaque ${MAP_1936.provinces[next]!.name} depuis ${here} (jour ${attacking.days})`;
  const dest = MAP_1936.provinces[u.path[u.path.length - 1]!]!.name;
  const { days } = remainingTrip(MAP_1936, u);
  return `En route vers ${dest} · ${days} jour${days > 1 ? "s" : ""}`;
}
