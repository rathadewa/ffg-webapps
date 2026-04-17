import { Elysia } from "elysia";
import { healthRoute } from "./routes/health";

const port = Number(Bun.env.PORT ?? 3000);

const app = new Elysia()
  .use(healthRoute)
  .listen(port);

console.log(`Server running at http://localhost:${port}`);