import { Elysia, t } from "elysia";
import { getSessionRole } from "../services/user-service";
import { getLeaderboard, Period } from "../services/leaderboard-service";

function getToken(headers: Record<string, string | undefined>): string {
  return (headers["authorization"] ?? "").split(" ")[1] ?? "";
}

const VALID_PERIODS = new Set<Period>(["all", "daily", "weekly", "monthly"]);

export const leaderboardRoute = new Elysia()
  .get("/api/leaderboard", async ({ headers, query, set }) => {
    try {
      const token = getToken(headers);
      if (!token) { set.status = 401; return { error: "unauthorised" }; }
      const role = await getSessionRole(token);
      if (!role)  { set.status = 401; return { error: "unauthorised" }; }

      const period = VALID_PERIODS.has(query.period as Period)
        ? (query.period as Period)
        : "all";

      return { data: await getLeaderboard(period) };
    } catch (error) {
      set.status = 500;
      return { error: (error as Error).message };
    }
  }, {
    query: t.Object({ period: t.Optional(t.String()) }),
  });
