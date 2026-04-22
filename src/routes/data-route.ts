import { Elysia, t } from "elysia";
import { getSessionRole } from "../services/user-service";
import { getCombinedData, getStatusStats } from "../services/data-service";

function getToken(headers: Record<string, string | undefined>): string {
  return (headers["authorization"] ?? "").split(" ")[1] ?? "";
}

export const dataRoute = new Elysia()
  .get("/api/data/combined", async ({ headers, query, set }) => {
    try {
      const token = getToken(headers);
      if (!token) { set.status = 401; return { error: "unauthorised" }; }
      const role = await getSessionRole(token);
      if (!role) { set.status = 401; return { error: "unauthorised" }; }

      const result = await getCombinedData({
        page:    Math.max(1, Number(query.page   ?? 1)),
        limit:   Math.min(100, Math.max(1, Number(query.limit ?? 25))),
        search:  query.search?.trim() || undefined,
        type:    (query.type as "indihome" | "indibiz" | "all") || "all",
        sortBy:  query.sortBy  || "no_order",
        sortDir: (query.sortDir as "asc" | "desc") || "desc",
      });
      return { data: result };
    } catch (error) {
      set.status = 500;
      return { error: (error as Error).message };
    }
  }, {
    query: t.Object({
      page:    t.Optional(t.String()),
      limit:   t.Optional(t.String()),
      search:  t.Optional(t.String()),
      type:    t.Optional(t.String()),
      sortBy:  t.Optional(t.String()),
      sortDir: t.Optional(t.String()),
    }),
  })
  .get("/api/data/stats", async ({ headers, set }) => {
    try {
      const token = getToken(headers);
      if (!token) { set.status = 401; return { error: "unauthorised" }; }
      const role = await getSessionRole(token);
      if (!role) { set.status = 401; return { error: "unauthorised" }; }
      return { data: await getStatusStats() };
    } catch (error) {
      set.status = 500;
      return { error: (error as Error).message };
    }
  });
