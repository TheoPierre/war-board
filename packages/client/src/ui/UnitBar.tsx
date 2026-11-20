import { MAP_1936, MAX_HP, UNIT_TYPES, divisionLabel, remainingTrip, type Battle, type Unit } from "@war-board/sim";
import { Icon } from "./hud/Icons.tsx";
import { UnitSymbol } from "./hud/UnitSymbol.tsx";
import { nationColor } from "./hud/Panels.tsx";

interface Props {
  units: Unit[];
  battles: readonly Battle[];
  /** Les divisions appartiennent à la nation jouée (sinon : simple consultation). */
  own: boolean;
  moveMode: boolean;
  onMoveMode(on: boolean): void;
  onStop(): void;
  onSelectOnly(id: number): void;
  onClose(): void;
}

/** Barre de sélection en bas de l'écran : divisions choisies, leur état et les ordres. */
export function UnitBar({ units, battles, own, moveMode, onMoveMode, onStop, onSelectOnly, onClose }: Props) {
  const byType = new Map<number, number>();
  for (const u of units) byType.set(u.type, (byType.get(u.type) ?? 0) + 1);
  const main = [...byType].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
  const anyMoving = units.some((u) => u.path.length);
  const one = units.length === 1 ? units[0]! : null;
  const title = one ? divisionLabel(one.type, one.num) : `${units.length} divisions`;
  const hp = units.reduce((a, u) => a + u.hp, 0) / units.length / MAX_HP;
  const types = [...byType.keys()].map((t) => UNIT_TYPES[t]!);
  // Le groupe avance au pas de la plus lente ; attaque et défense s'additionnent.
  const speed = Math.min(...types.map((t) => t.speed));
  const attack = units.reduce((a, u) => a + UNIT_TYPES[u.type]!.attack, 0);
  const defense = units.reduce((a, u) => a + UNIT_TYPES[u.type]!.defense, 0);

  return (
    <section className="unitbar" aria-label="Divisions sélectionnées">
      <div className="big" style={{ background: nationColor(units[0]!.nation) }}>
        <UnitSymbol type={UNIT_TYPES[main]!.id} />
        {units.length > 1 && <span className="eff">{units.length}</span>}
      </div>

      <div className="info">
        <div className="nm">{title}</div>
        <div className="meta">
          {one
            ? status(one, battles)
            : [...byType]
                .sort((a, b) => a[0] - b[0])
                .map(([t, n]) => `${n} ${UNIT_TYPES[t]!.name.toLowerCase()}`)
                .join(" · ")}
        </div>
        <div className="stats">
          <div className="gauge">
            <div className="top">
              <span>Santé</span>
              <b>{Math.round(hp * 100)} %</b>
            </div>
            <div className={`bar ticks ${hp > 0.5 ? "g" : "r"}`}>
              <i style={{ width: `${hp * 100}%` }} />
            </div>
          </div>
          <div className="stat">
            <Icon name="i-cible" /> Attaque <b>{attack}</b>
          </div>
          <div className="stat">
            <Icon name="i-bouclier" /> Défense <b>{defense}</b>
          </div>
          <div className="stat">
            <Icon name="i-temps" /> <b>{speed}</b> km/j
          </div>
        </div>
        {units.length > 1 && (
          <ul className="ulist">
            {units.slice(0, 40).map((u) => (
              <li key={u.id}>
                <button onClick={() => onSelectOnly(u.id)} title={`${divisionLabel(u.type, u.num)} · ${status(u, battles)}`}>
                  <UnitSymbol type={UNIT_TYPES[u.type]!.id} />
                  {u.num}
                  <i style={{ width: `${(u.hp / MAX_HP) * 100}%` }} className={u.hp < MAX_HP / 2 ? "low" : ""} />
                </button>
              </li>
            ))}
            {units.length > 40 && <li className="more">+{units.length - 40}</li>}
          </ul>
        )}
      </div>

      <div className="orders-col">
        <button className="x" onClick={onClose} aria-label="Fermer la sélection">
          <Icon name="i-fermer" />
        </button>
        {own ? (
          <div className="orders">
            <button className={`order ${moveMode ? "on" : ""}`} onClick={() => onMoveMode(!moveMode)} aria-pressed={moveMode}>
              <Icon name="i-fleche" /> {moveMode ? "Destination ?" : "Déplacer"} <kbd>D</kbd>
            </button>
            <button className="order" onClick={onStop} disabled={!anyMoving}>
              <Icon name="i-bouclier" /> Arrêter <kbd>S</kbd>
            </button>
            <button className="order" disabled title="À venir">
              <Icon name="i-fusion" /> Fusionner
            </button>
            <button className="order" disabled title="À venir avec la production (étape 2)">
              <Icon name="i-plus" /> Améliorer
            </button>
          </div>
        ) : (
          <p className="muted">Divisions étrangères</p>
        )}
      </div>
      {own && (
        <p className="unit-hint">
          {moveMode
            ? "Cliquez sur la province de destination. Échap pour annuler."
            : "Clic droit sur une province pour y envoyer la sélection · Maj + glisser pour sélectionner plusieurs pions."}
        </p>
      )}
    </section>
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
