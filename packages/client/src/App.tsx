import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { MAP_1936, NATIONS_1936, createInitialState } from "@war-board/sim";
import { MapView } from "./map/MapView.tsx";
import { TopBar } from "./ui/TopBar.tsx";
import { ProvincePanel } from "./ui/ProvincePanel.tsx";
import { Lobby, type LobbyChoice } from "./ui/Lobby.tsx";
import { LocalSession } from "./session/LocalSession.ts";
import { RemoteSession } from "./session/RemoteSession.ts";
import type { GameSession } from "./session/types.ts";

/** Propriétaires de 1936, affichés en attendant le premier état du serveur. */
const INITIAL_OWNERS = createInitialState().owners;

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

  useEffect(() => {
    if (view.status === "closed" && view.error) onQuit(view.error);
  }, [view.status, view.error, onQuit]);

  const hoveredName = hovered !== null ? MAP_1936.provinces[hovered]?.name : null;
  const hoveredOwner = hovered !== null ? NATIONS_1936[view.owners[hovered] ?? -1]?.name : null;

  return (
    <div className="game">
      <TopBar view={view} mode={session.mode} onSpeed={(s) => session.setSpeed(s)} onQuit={() => onQuit()} />
      <main>
        <MapView
          owners={view.owners.length ? view.owners : INITIAL_OWNERS}
          ownersVersion={view.owners.length ? view.ownersVersion : -2}
          selected={selected}
          onSelect={setSelected}
          onHover={setHovered}
        />
        {hoveredName && (
          <div className="hover-info">
            {hoveredName}
            {hoveredOwner ? ` · ${hoveredOwner}` : ""}
          </div>
        )}
        {selected !== null && (
          <ProvincePanel
            province={selected}
            owners={view.owners}
            myNation={view.myNation}
            debug={view.debug}
            onClose={() => setSelected(null)}
            onTransfer={(province, to) => session.send({ type: "debug.transferProvince", province, to })}
          />
        )}
      </main>
    </div>
  );
}
