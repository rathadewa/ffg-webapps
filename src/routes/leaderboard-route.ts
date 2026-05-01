import { Elysia, t } from "elysia";
import { getSessionRole } from "../services/user-service";
import { getLeaderboard, OrderType } from "../services/leaderboard-service";

function getToken(headers: Record<string, string | undefined>): string {
  return (headers["authorization"] ?? "").split(" ")[1] ?? "";
}

const VALID_TYPES = new Set<OrderType>(["logic", "fisik"]);

export const leaderboardRoute = new Elysia()
  .get("/api/leaderboard", async ({ headers, query, set }) => {
    try {
      const token = getToken(headers);
      if (!token) { set.status = 401; return { error: "unauthorised" }; }
      const role = await getSessionRole(token);
      if (!role)  { set.status = 401; return { error: "unauthorised" }; }

      const orderType = VALID_TYPES.has(query.type as OrderType)
        ? (query.type as OrderType)
        : "logic";

      const dateFrom = query.dateFrom?.trim() || undefined;
      const dateTo   = query.dateTo?.trim()   || undefined;

      return { data: await getLeaderboard(orderType, dateFrom, dateTo) };
    } catch (error) {
      set.status = 500;
      return { error: (error as Error).message };
    }
  }, {
    query: t.Object({
      type:     t.Optional(t.String()),
      dateFrom: t.Optional(t.String()),
      dateTo:   t.Optional(t.String()),
    }),
  });
