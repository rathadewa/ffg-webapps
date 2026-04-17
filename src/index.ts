import { Elysia } from "elysia";
import { healthRoute } from "./routes/health";
import { usersRoute } from "./routes/users-route";
// @ts-ignore — Bun HTML import
import index from "../index.html";

const api = new Elysia().use(healthRoute).use(usersRoute);

const port = Number(Bun.env.PORT ?? 3000);

Bun.serve({
  port,
  routes: {
    // API routes — handled by ElysiaJS
    "/api/*":   (req: Request) => api.handle(req),
    "/health":  (req: Request) => api.handle(req),

    // Frontend routes — served as SPA
    "/":            index,
    "/login":       index,
    "/register":    index,
    "/verify-otp":  index,
    "/verify-2fa":  index,
    "/setup-2fa":   index,
    "/dashboard":   index,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at http://localhost:${port}`);
