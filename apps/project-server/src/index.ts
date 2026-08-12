import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { ProjectService } from "./services/project-service.js";
import { createRouter } from "./http/router.js";

const port = Number(process.env.PORT ?? 8787);
const projectService = new ProjectService();
const router = createRouter({ projectService });

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  void router.handle(req, res);
});

server.listen(port, () => {
  process.stdout.write(`project-server listening on http://localhost:${port}\n`);
});
