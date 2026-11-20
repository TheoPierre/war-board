import { createServer } from "./app.ts";

const PORT = Number(process.env.PORT ?? 2567);

const server = createServer();
await server.listen(PORT);
console.log(`Serveur War Board à l'écoute sur ws://localhost:${PORT}`);
