import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@colyseus/sdk";
import { MAP_1936, NATION_INDEX } from "@war-board/sim";
import { createServer } from "../src/app.ts";

const PORT = 25670;
const server = createServer();

beforeAll(async () => {
  await server.listen(PORT);
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

describe("salle de jeu", () => {
  it("synchronise la carte et fait avancer les jours", async () => {
    const client = new Client(`ws://localhost:${PORT}`);
    const room = await client.create<any>("partie", { speed: 20, debug: true, name: "Théo", nation: "FRA" });
    await waitFor(() => room.state.owners?.length > 0);
    expect(room.state.owners.length).toBeGreaterThan(500);
    expect(room.state.players.get(room.sessionId).nation).toBe("FRA");
    const d0 = room.state.day;
    await waitFor(() => room.state.day >= d0 + 2, 3000);
    expect(room.state.day).toBeGreaterThanOrEqual(d0 + 2);

    // commande de debug : la France prend la province 0
    room.send("command", { type: "debug.transferProvince", province: 0, to: "FRA" });
    await waitFor(() => room.state.owners[0] === 1, 3000);
    expect(room.state.owners[0]).toBe(1);

    // l'hôte met en pause
    room.send("speed", 0);
    await waitFor(() => room.state.speed === 0);
    await room.leave();
  });

  it("synchronise les divisions, la guerre et les déplacements", async () => {
    const client = new Client(`ws://localhost:${PORT}`);
    const room = await client.create<any>("partie", { speed: 20, nation: "GER" });
    await waitFor(() => room.state.units?.size > 100);
    const ger = NATION_INDEX.get("GER")!;
    const mine: any[] = [];
    room.state.units.forEach((u: any) => u.nation === ger && mine.push(u));
    expect(mine.length).toBe(32);

    const rejected: any[] = [];
    room.onMessage("rejected", (m: any) => rejected.push(m));
    // Vers la France sans guerre : refusé.
    const unit = mine[0];
    const fra = MAP_1936.capitals.FRA!;
    room.send("command", { type: "unit.move", units: [unit.id], to: fra });
    await waitFor(() => rejected.length > 0, 3000);
    expect(rejected[0].reason).toMatch(/chemin/);

    room.send("command", { type: "war.declare", target: "FRA" });
    await waitFor(() => room.state.wars.length === 1, 3000);
    room.send("command", { type: "unit.move", units: [unit.id], to: fra });
    await waitFor(() => room.state.units.get(String(unit.id))?.path.length > 0, 3000);
    expect(room.state.units.get(String(unit.id)).path.at(-1)).toBe(fra);
    await room.leave();
  });

  it("refuse deux joueurs sur la même nation", async () => {
    const a = new Client(`ws://localhost:${PORT}`);
    const room = await a.create<any>("partie", { nation: "GER" });
    const b = new Client(`ws://localhost:${PORT}`);
    await expect(b.joinById(room.roomId, { nation: "GER" })).rejects.toThrow(/déjà/);
    await room.leave();
  });
});

async function waitFor(cond: () => boolean, timeout = 2000) {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > timeout) throw new Error("délai dépassé");
    await new Promise((r) => setTimeout(r, 20));
  }
}
