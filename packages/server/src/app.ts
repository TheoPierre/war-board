import { defineRoom, defineServer } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./GameRoom.ts";

export function createServer() {
  return defineServer({
    transport: new WebSocketTransport(),
    rooms: {
      partie: defineRoom(GameRoom),
    },
  });
}
