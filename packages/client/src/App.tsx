import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { MAP_1936, NATIONS_1936, createInitialState, findPath, type GameState, type Unit } from "@war-board/sim";
import { MapView } from "./map/MapView.tsx";
import { TopBar } from "./ui/TopBar.tsx";
import { ProvincePanel } from "./ui/ProvincePanel.tsx";
import { UnitPanel } from "./ui/UnitPanel.tsx";
import { Lobby, type LobbyChoice } from "./ui/Lobby.tsx";
import { LocalSession } from "./session/LocalSession.ts";
import { RemoteSession } from "./session/RemoteSession.ts";
import type { GameSession, SessionMessage } from "./session/types.ts";
import { MessageFeed } from "./ui/MessageFeed.tsx";

/** Propriétaires de 1936, affichés en attendant le premier état du serveur. */
const INITIAL_OWNERS = createInitialState().owners;
const NO_SELECTION: ReadonlySet<number> = new Set();

export function App() {
  const [choice, setChoice] = useState<LobbyChoice | null>(null);
  const [lobbyError, setLobbyError] = useState<string>();
  const session = useMemo<GameSession | null>(() => {
    if (!choice) return null;
    return choice.mode === "solo" ? new LocalSession(choice.nation, choice.name) : new RemoteSession(choice.nation, choice.name);
  }, [choice]);
  useEffect(() => () => session?.dispose(), [session]);

  if (!session) return <Lobby onStart={setChoice} error={lobbyError} />;
  return (
    <Game
      session={session}
      onQuit={(error) => {
        setLobbyError(error);
        setChoice(null);
      }}
    />
  );
}

function Game({ session, onQuit }: { session: GameSession; onQuit(error?: string): void }) {
  const view = useSyncExternalStore(
    (l) => session.subscribe(l),
    () => session.getView(),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<ReadonlySet<number>>(NO_SELECTION);
  const [moveMode, setMoveMode] = useState(false);
  /** Trajets ordonnés mais pas encore appliqués par la simulation (jusqu'au jour suivant). */
  const [preview, setPreview] = useState<{ day: number; paths: Map<number, number[]> } | null>(null);
  const [localMessages, setLocalMessages] = useState<SessionMessage[]>([]);
  const say = useCallback((text: string) => setLocalMessages((l) => [...l.slice(-3), { id: -Date.now(), text, bad: true }]), []);
  const myNation = NATIONS_1936.findIndex((n) => n.id === view.myNation);

  useEffect(() => {
    if (view.status === "closed" && view.error) onQuit(view.error);
  }, [view.status, view.error, onQuit]);

  // Retire de la sélection les divisions détruites.
  useEffect(() => {
    if (!selectedUnits.size) return;
    const alive = new Set(view.units.map((u) => u.id));
    if ([...selectedUnits].some((id) => !alive.has(id))) setSelectedUnits(new Set([...selectedUnits].filter((id) => alive.has(id))));
  }, [view.units, selectedUnits]);

  const units = useMemo<readonly Unit[]>(() => {
    if (!preview || preview.day !== view.day) return view.units;
    return view.units.map((u) => {
      const p = preview.paths.get(u.id);
      return p ? { ...u, path: p, progress: p[0] === u.path[0] ? u.progress : 0 } : u;
    });
  }, [view.units, view.day, preview]);

  const hostile = useMemo(
    () => new Set(view.wars.filter((w) => w.includes(myNation)).map((w) => (w[0] === myNation ? w[1] : w[0]))),
    [view.wars, myNation],
  );

  const selection = useMemo(() => units.filter((u) => selectedUnits.has(u.id)), [units, selectedUnits]);

  const order = useCallback(
    (province: number) => {
      const ids = selection.filter((u) => u.nation === myNation).map((u) => u.id);
      if (!ids.length) return;
      setMoveMode(false);
      session.send({ type: "unit.move", units: ids, to: province });
      // Aperçu immédiat du trajet.
      const sim = { owners: view.owners, wars: view.wars } as unknown as GameState;
      const paths = new Map<number, number[]>();
      for (const u of selection) {
        const p = findPath(MAP_1936, sim, u.nation, u.province, province);
        if (p) paths.set(u.id, p);
      }
      if (!paths.size) say("Aucun chemin par voie de terre : territoire neutre ou mer.");
      setPreview({ day: view.day, paths });
    },
    [selection, myNation, session, view.owners, view.wars, view.day, say],
  );

  const messages = useMemo(() => [...view.messages, ...localMessages], [view.messages, localMessages]);

  const hoveredName = hovered !== null ? MAP_1936.provinces[hovered]?.name : null;
  const hoveredOwner = hovered !== null ? NATIONS_1936[view.owners[hovered] ?? -1]?.name : null;
  const hoveredUnits = hovered !== null ? view.units.filter((u) => u.province === hovered).length : 0;

  return (
    <div className="game">
      <TopBar view={view} mode={session.mode} onSpeed={(s) => session.setSpeed(s)} onQuit={() => onQuit()} />
      <main className={moveMode ? "move-mode" : ""}>
        <MapView
          owners={view.owners.length ? view.owners : INITIAL_OWNERS}
          ownersVersion={view.owners.length ? view.ownersVersion : -2}
          selected={selected}
          onSelect={(p) => {
            if (moveMode && p !== null) return order(p);
            setSelected(p);
            setSelectedUnits(NO_SELECTION);
          }}
          onHover={setHovered}
          units={units}
          battles={view.battles}
          myNation={myNation}
          selectedUnits={selectedUnits}
          hostile={hostile}
          onUnitsClick={(ids, additive) => {
            setMoveMode(false);
            if (!additive) setSelectedUnits(new Set(ids));
            else {
              const next = new Set(selectedUnits);
              const all = ids.every((id) => next.has(id));
              for (const id of ids) all ? next.delete(id) : next.add(id);
              setSelectedUnits(next);
            }
          }}
          onBoxSelect={(ids) => setSelectedUnits(new Set([...selectedUnits, ...ids]))}
          onOrder={order}
        />
        {hoveredName && (
          <div className="hover-info">
            {hoveredName}
            {hoveredOwner ? ` · ${hoveredOwner}` : ""}
            {hoveredUnits ? ` · ${hoveredUnits} division${hoveredUnits > 1 ? "s" : ""}` : ""}
          </div>
        )}
        {selected !== null && (
          <ProvincePanel
            province={selected}
            owners={view.owners}
            myNation={view.myNation}
            debug={view.debug}
            units={view.units}
            wars={view.wars}
            onClose={() => setSelected(null)}
            onTransfer={(province, to) => session.send({ type: "debug.transferProvince", province, to })}
            onDeclareWar={(target) => session.send({ type: "war.declare", target })}
          />
        )}
        {selection.length > 0 && (
          <UnitPanel
            units={selection}
            battles={view.battles}
            moveMode={moveMode}
            onMoveMode={setMoveMode}
            onStop={() => {
              session.send({ type: "unit.stop", units: selection.map((u) => u.id) });
              const paths = new Map(selection.map((u) => [u.id, [] as number[]]));
              setPreview({ day: view.day, paths });
            }}
            onSelectOnly={(id) => setSelectedUnits(new Set([id]))}
            onClose={() => {
              setSelectedUnits(NO_SELECTION);
              setMoveMode(false);
            }}
          />
        )}
        <MessageFeed messages={messages} />
      </main>
    </div>
  );
}
