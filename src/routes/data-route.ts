import { Elysia, t } from "elysia";
import { getSessionRole } from "../services/user-service";
import { getCombinedData, getStatusStats, updateOrderStatus, getHistoryData } from "../services/data-service";

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
        page:     Math.max(1, Number(query.page  ?? 1)),
        limit:    Math.min(100, Math.max(1, Number(query.limit ?? 25))),
        search:   query.search?.trim()   || undefined,
        type:     (query.type as "indihome" | "indibiz" | "all") || "all",
        sortBy:   query.sortBy           || "order_id",
        sortDir:  (query.sortDir as "asc" | "desc") || "desc",
        status:   query.status?.trim()   || undefined,
        sto:      query.sto?.trim()      || undefined,
        dateFrom: query.dateFrom?.trim() || undefined,
        dateTo:   query.dateTo?.trim()   || undefined,
      });
      return { data: result };
    } catch (error) {
      set.status = 500;
      return { error: (error as Error).message };
    }
  }, {
    query: t.Object({
      page:     t.Optional(t.String()),
      limit:    t.Optional(t.String()),
      search:   t.Optional(t.String()),
      type:     t.Optional(t.String()),
      sortBy:   t.Optional(t.String()),
      sortDir:  t.Optional(t.String()),
      status:   t.Optional(t.String()),
      sto:      t.Optional(t.String()),
      dateFrom: t.Optional(t.String()),
      dateTo:   t.Optional(t.String()),
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
  })
  .patch("/api/data/:orderId/status", async ({ headers, params, body, set }) => {
    try {
      const token = getToken(headers);
      if (!token) { set.status = 401; return { error: "unauthorised" }; }
      const role = await getSessionRole(token);
      if (!role) { set.status = 401; return { error: "unauthorised" }; }

      const { status } = body as { status: string };
      const allowed = ["UP", "DOWN", "NOT FOUND"];
      if (!allowed.includes(status)) {
        set.status = 400;
        return { error: `Status tidak valid. Gunakan: ${allowed.join(", ")}` };
      }

      await updateOrderStatus(params.orderId, status);
      return { message: "Status berhasil diperbarui" };
    } catch (error) {
      const msg = (error as Error).message;
      set.status = msg === "Order tidak ditemukan" ? 404 : 500;
      return { error: msg };
    }
  }, {
    body: t.Object({ status: t.String() }),
  })

  /* ── History pengerjaan tiket ──────────────────────────── */
  .get("/api/data/history", async ({ headers, query, set }) => {
    try {
      const token = getToken(headers);
      if (!token) { set.status = 401; return { error: "unauthorised" }; }
      const role = await getSessionRole(token);
      if (!role)  { set.status = 401; return { error: "unauthorised" }; }

      return { data: await getHistoryData({
        page:              Math.max(1, Number(query.page  ?? 1)),
        limit:             Math.min(100, Math.max(1, Number(query.limit ?? 25))),
        search:            query.search?.trim()            || undefined,
        status:            query.status?.trim()            || undefined,
        statusPengerjaan:  query.statusPengerjaan?.trim()  || undefined,
        sto:               query.sto?.trim()               || undefined,
        sortBy:            query.sortBy                    || undefined,
        sortDir:           (query.sortDir as "asc" | "desc") || "desc",
      }) };
    } catch (error) {
      set.status = 500;
      return { error: (error as Error).message };
    }
  }, {
    query: t.Object({
      page:             t.Optional(t.String()),
      limit:            t.Optional(t.String()),
      search:           t.Optional(t.String()),
      status:           t.Optional(t.String()),
      statusPengerjaan: t.Optional(t.String()),
      sto:              t.Optional(t.String()),
      sortBy:           t.Optional(t.String()),
      sortDir:          t.Optional(t.String()),
    }),
  })

  /* ── Evidence proxy (Telegram file) — no auth, file_id sudah random ── */
  .get("/api/evidence/:fileId", async ({ params, set }) => {
    try {
      const botToken = Bun.env.TELEGRAM_BOT_TOKEN ?? "";
      if (!botToken) { set.status = 503; return new Response("bot not configured"); }

      const info = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${params.fileId}`);
      const json = await info.json() as any;
      if (!json.ok) { set.status = 404; return new Response("file not found"); }

      const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${json.result.file_path}`);
      set.headers["Content-Type"] = fileRes.headers.get("Content-Type") ?? "image/jpeg";
      set.headers["Cache-Control"] = "public, max-age=86400";
      return new Response(fileRes.body);
    } catch (error) {
      set.status = 500;
      return new Response((error as Error).message);
    }
  });
