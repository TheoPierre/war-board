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

/** Une division terrestre (voir `Unit` dans la simulation). */
export const UnitState = schema(
  {
    id: t.uint32(),
    nation: t.uint8(),
    type: t.uint8(),
    num: t.uint16(),
    hp: t.float32(),
    level: t.uint8(),
    province: t.uint16(),
    /** Provinces restant à traverser. */
    path: t.array("uint16"),
    /** Kilomètres parcourus vers path[0]. */
    progress: t.float32(),
    /** Vitesse imposée du groupe, 0 = vitesse propre. */
    pace: t.float32(),
  },
  "UnitState",
);
export type UnitState = SchemaType<typeof UnitState>;

/** Une bataille en cours (voir `Battle` dans la simulation). */
export const BattleState = schema(
  {
    province: t.uint16(),
    from: t.array("uint16"),
    attackers: t.array("uint8"),
    defender: t.uint8(),
    days: t.uint16(),
  },
  "BattleState",
);
export type BattleState = SchemaType<typeof BattleState>;

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
    /** Divisions, par identifiant. */
    units: t.map(UnitState),
    /** Guerres en cours, sous la forme « a:b » (index de nations, a < b). */
    wars: t.array("string"),
    battles: t.array(BattleState),
    players: t.map(PlayerState),
    /** sessionId du joueur qui règle la vitesse. */
    host: t.string(),
    debug: t.boolean(),
  },
  "GameRoomState",
);
export type GameRoomState = SchemaType<typeof GameRoomState>;
