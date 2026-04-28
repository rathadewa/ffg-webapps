import { Elysia } from "elysia";
import { healthRoute } from "./routes/health";
import { usersRoute } from "./routes/users-route";
import { uploadRoute } from "./routes/upload-route";
import { dataRoute } from "./routes/data-route";
import { userFfgRoute } from "./routes/user-ffg-route";
import { telegramRoute } from "./routes/telegram-route";
import { leaderboardRoute } from "./routes/leaderboard-route";
import { startPolling } from "./services/telegram-service";
import { syncStatusFromUmasOnu } from "./services/data-service";
import { join } from "path";

const api = new Elysia().use(healthRoute).use(usersRoute).use(uploadRoute).use(dataRoute).use(userFfgRoute).use(telegramRoute).use(leaderboardRoute);

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

// Jalankan polling Telegram di background (tidak blocking server)
startPolling();

// Sinkronisasi status dari umas_onu_status setiap 5 menit
const runSync = () => syncStatusFromUmasOnu().catch(e => console.error("[syncStatus] Fatal:", e));
runSync();
setInterval(runSync, 5 * 60 * 1_000);
