import { Elysia, t } from "elysia";
import { getSessionRole } from "../services/user-service";
import { listUserFfg, createUserFfg, updateUserFfg, deleteUserFfg } from "../services/user-ffg-service";

function getToken(headers: Record<string, string | undefined>): string {
  return (headers["authorization"] ?? "").split(" ")[1] ?? "";
}

async function requireAuth(headers: Record<string, string | undefined>) {
  const token = getToken(headers);
  if (!token) return null;
  return getSessionRole(token);
}

export const userFfgRoute = new Elysia()

  .get("/api/user-ffg", async ({ headers, query, set }) => {
    const role = await requireAuth(headers);
    if (!role) { set.status = 401; return { error: "unauthorised" }; }

    try {
      const result = await listUserFfg({
        page:    Math.max(1, Number(query.page  ?? 1)),
        limit:   Math.min(100, Math.max(1, Number(query.limit ?? 20))),
        search:  query.search?.trim()  || undefined,
        distrik: query.distrik?.trim() || undefined,
        sto:     query.sto?.trim()     || undefined,
      });
      return { data: result };
    } catch (e) {
      set.status = 500;
      return { error: (e as Error).message };
    }
  }, {
    query: t.Object({
      page:    t.Optional(t.String()),
      limit:   t.Optional(t.String()),
      search:  t.Optional(t.String()),
      distrik: t.Optional(t.String()),
      sto:     t.Optional(t.String()),
    }),
  })

  .post("/api/user-ffg", async ({ headers, body, set }) => {
    const role = await requireAuth(headers);
    if (!role) { set.status = 401; return { error: "unauthorised" }; }

    try {
      await createUserFfg(body as any);
      return { success: true };
    } catch (e) {
      set.status = 500;
      return { error: (e as Error).message };
    }
  }, {
    body: t.Object({
      nama:       t.String(),
      email:      t.String(),
      distrik:    t.Optional(t.String()),
      hsa:        t.Optional(t.String()),
      sto:        t.Optional(t.String()),
      idTelegram: t.Optional(t.String()),
    }),
  })

  .put("/api/user-ffg/:id", async ({ headers, params, body, set }) => {
    const role = await requireAuth(headers);
    if (!role) { set.status = 401; return { error: "unauthorised" }; }

    try {
      await updateUserFfg(Number(params.id), body as any);
      return { success: true };
    } catch (e) {
      set.status = 500;
      return { error: (e as Error).message };
    }
  }, {
    body: t.Object({
      nama:       t.Optional(t.String()),
      distrik:    t.Optional(t.String()),
      hsa:        t.Optional(t.String()),
      sto:        t.Optional(t.String()),
      idTelegram: t.Optional(t.String()),
    }),
  })

  .delete("/api/user-ffg/:id", async ({ headers, params, set }) => {
    const role = await requireAuth(headers);
    if (!role) { set.status = 401; return { error: "unauthorised" }; }

    try {
      await deleteUserFfg(Number(params.id));
      return { success: true };
    } catch (e) {
      set.status = 500;
      return { error: (e as Error).message };
    }
  });
