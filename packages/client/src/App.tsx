import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MAP_1936, NATIONS_1936, createInitialState, findPath, type GameState, type Unit } from "@war-board/sim";
import { MapView } from "./map/MapView.tsx";
import { TopBar } from "./ui/TopBar.tsx";
import { ProvincePanel } from "./ui/ProvincePanel.tsx";
import { UnitBar } from "./ui/UnitBar.tsx";
import { Lobby, type LobbyChoice } from "./ui/Lobby.tsx";
import { LocalSession } from "./session/LocalSession.ts";
import { RemoteSession } from "./session/RemoteSession.ts";
import type { GameSession, SessionMessage } from "./session/types.ts";
import { Telegrams } from "./ui/Telegrams.tsx";
import { IconSprite } from "./ui/hud/Icons.tsx";
import { LeftColumn, type PanelId } from "./ui/hud/Panel.tsx";
import { ArmyPanel, DiplomacyPanel, JournalPanel, ProductionPanel, SoonPanel, type JournalEntry } from "./ui/hud/Panels.tsx";
import { PlayersBox, RightColumn } from "./ui/hud/RightColumn.tsx";
import { Credits } from "./ui/Credits.tsx";

/** Nombre de télégrammes gardés dans le journal. */
const JOURNAL_SIZE = 200;

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
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [encyclopedia, setEncyclopedia] = useState(false);
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

  // Journal : chaque message est daté du jour de jeu et de l'heure d'arrivée (pour les télégrammes).
  const journal = useRef(new Map<number, JournalEntry & { at: number }>());
  const entries = useMemo(() => {
    const j = journal.current;
    for (const m of [...view.messages, ...localMessages])
      if (!j.has(m.id)) j.set(m.id, { ...m, day: view.day, at: Date.now() });
    while (j.size > JOURNAL_SIZE) j.delete(j.keys().next().value!);
    return [...j.values()];
    // view.day n'est lu que pour dater les nouveaux messages.
  }, [view.messages, localMessages]);

  // Raccourcis : D déplacer, S arrêter, Échap pour annuler.
  const ownSelection = selection.filter((u) => u.nation === myNation);
  const keys = useRef({ ownSelection, moveMode, stop: () => {} });
  const stop = useCallback(() => {
    session.send({ type: "unit.stop", units: selection.map((u) => u.id) });
    const paths = new Map(selection.map((u) => [u.id, [] as number[]]));
    setPreview({ day: view.day, paths });
  }, [session, selection, view.day]);
  keys.current = { ownSelection, moveMode, stop };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = keys.current;
      if (e.key === "Escape") {
        if (k.moveMode) setMoveMode(false);
        else if (k.ownSelection.length) setSelectedUnits(NO_SELECTION);
        else setPanel(null);
      } else if (e.key.toLowerCase() === "d" && k.ownSelection.length) setMoveMode(!k.moveMode);
      else if (e.key.toLowerCase() === "s" && k.ownSelection.some((u) => u.path.length)) k.stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closePanel = () => {
    if (panel === "province") setSelected(null);
    setPanel(null);
  };
  const togglePanel = (id: PanelId) => {
    if (panel === "province") setSelected(null);
    setPanel(panel === id ? null : id);
  };

  const hoveredName = hovered !== null ? MAP_1936.provinces[hovered]?.name : null;
  const hoveredOwner = hovered !== null ? NATIONS_1936[view.owners[hovered] ?? -1]?.name : null;
  const hoveredUnits = hovered !== null ? view.units.filter((u) => u.province === hovered).length : 0;

  return (
    <>
    <div className="game">
      <IconSprite />
      <main className={moveMode ? "move-mode" : ""}>
        <MapView
          owners={view.owners.length ? view.owners : INITIAL_OWNERS}
          ownersVersion={view.owners.length ? view.ownersVersion : -2}
          selected={selected}
          onSelect={(p) => {
            if (moveMode && p !== null) return order(p);
            setSelected(p);
            setSelectedUnits(NO_SELECTION);
            if (p !== null) setPanel("province");
            else if (panel === "province") setPanel(null);
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
        <TopBar view={view} mode={session.mode} onSpeed={(s) => session.setSpeed(s)} onQuit={() => onQuit()} />
        {hoveredName && (
          <div className="hover-info">
            <b>{hoveredName}</b>
            {hoveredOwner ? ` · ${hoveredOwner}` : ""}
            {hoveredUnits ? ` · ${hoveredUnits} division${hoveredUnits > 1 ? "s" : ""}` : ""}
          </div>
        )}
        <LeftColumn open={panel} badges={{ diplomatie: hostile.size }} onToggle={togglePanel} />
        {panel === "province" && selected !== null && (
          <ProvincePanel
            province={selected}
            owners={view.owners}
            myNation={view.myNation}
            debug={view.debug}
            units={view.units}
            wars={view.wars}
            onClose={closePanel}
            onTransfer={(province, to) => session.send({ type: "debug.transferProvince", province, to })}
            onDeclareWar={(target) => session.send({ type: "war.declare", target })}
          />
        )}
        {panel === "journal" && <JournalPanel entries={entries} onClose={closePanel} />}
        {panel === "diplomatie" && (
          <DiplomacyPanel
            myNation={myNation}
            wars={view.wars}
            onDeclareWar={(target) => session.send({ type: "war.declare", target })}
            onClose={closePanel}
          />
        )}
        {panel === "armee" && (
          <ArmyPanel units={view.units} myNation={myNation} onSelect={(ids) => setSelectedUnits(new Set(ids))} onClose={closePanel} />
        )}
        {panel === "production" && <ProductionPanel myNation={myNation} onClose={closePanel} />}
        {(panel === "economie" || panel === "renseignement" || panel === "recherche" || panel === "objectifs") && (
          <SoonPanel id={panel} myNation={myNation} onClose={closePanel} />
        )}
        <Telegrams entries={entries} />
        <RightColumn nation={view.myNation} onEncyclopedia={() => setEncyclopedia(true)} />
        {session.mode === "multi" && <PlayersBox players={view.players} me={view.myNation} />}
        {selection.length > 0 && (
          <UnitBar
            units={selection}
            battles={view.battles}
            own={ownSelection.length > 0}
            moveMode={moveMode}
            onMoveMode={setMoveMode}
            onStop={stop}
            onSelectOnly={(id) => setSelectedUnits(new Set([id]))}
            onClose={() => {
              setSelectedUnits(NO_SELECTION);
              setMoveMode(false);
            }}
          />
        )}
      </main>
    </div>
    {encyclopedia && <Credits title="Encyclopédie illustrée" onClose={() => setEncyclopedia(false)} />}
    </>
  );
}
