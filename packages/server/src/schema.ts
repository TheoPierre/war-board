import { schema, t, type SchemaType } from "@colyseus/schema";

/** Un joueur humain dans la partie. */
export const PlayerState = schema(
  {
    name: t.string(),
    /** Code de la nation jouée, vide pour un observateur. */
    nation: t.string(),
    connected: t.boolean(),
  },
  "PlayerState",
);
export type PlayerState = SchemaType<typeof PlayerState>;

/**
 * Ce que le serveur synchronise vers les clients. La simulation complète
 * reste sur le serveur ; on n'envoie que ce que la carte doit afficher.
 */
export const GameRoomState = schema(
  {
    /** Jours écoulés depuis le 1er janvier 1936. */
    day: t.uint32(),
    /** 0 = pause, 1 = 1 jour pour 5 s. */
    speed: t.uint8(),
    /** Index de nation propriétaire de chaque province. */
    owners: t.array("uint8"),
    players: t.map(PlayerState),
    /** sessionId du joueur qui règle la vitesse. */
    host: t.string(),
    debug: t.boolean(),
  },
  "GameRoomState",
);
export type GameRoomState = SchemaType<typeof GameRoomState>;
