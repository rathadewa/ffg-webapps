import { Elysia } from "elysia";
import { healthRoute } from "./routes/health";
import { usersRoute } from "./routes/users-route";
import { uploadRoute } from "./routes/upload-route";
import { dataRoute } from "./routes/data-route";
import { userFfgRoute } from "./routes/user-ffg-route";
import { join } from "path";

const api = new Elysia().use(healthRoute).use(usersRoute).use(uploadRoute).use(dataRoute).use(userFfgRoute);

const port = Number(Bun.env.PORT ?? 3000);
const distDir = join(import.meta.dir, "../dist");
const indexHtml = Bun.file(join(distDir, "index.html"));

Bun.serve({
  port,
  async fetch(req: Request) {
    const { pathname } = new URL(req.url);

    if (pathname.startsWith("/api/") || pathname === "/health") {
      return api.handle(req);
    }

    const staticFile = Bun.file(join(distDir, pathname));
    if (await staticFile.exists()) {
      return new Response(staticFile);
    }

    return new Response(indexHtml);
  },
});

console.log(`Server running at http://localhost:${port}`);
