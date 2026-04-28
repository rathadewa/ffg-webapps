import { db } from "../db";
import { sql, eq } from "drizzle-orm";

const nowWib = () => new Date(Date.now() + 7 * 60 * 60 * 1000);
import { pengukuranOrderPsb } from "../db/schema/pengukuran_order_psb";
import { userFfg } from "../db/schema/user_ffg";
import { sendDownNotification } from "./telegram-service";

export type DataType = "indihome" | "indibiz" | "all";
export type SortDir  = "asc" | "desc";

const SORT_WHITELIST = ["order_id", "source", "sto", "external", "speedy", "last_update", "pots", "status"] as const;
type SortCol = typeof SORT_WHITELIST[number];

function safeSort(col?: string): SortCol {
  return (SORT_WHITELIST as readonly string[]).includes(col ?? "") ? (col as SortCol) : "order_id";
}

export interface CombinedRow {
  order_id:    string;
  type:        "IndiHome" | "IndiBiz";
  sto:         string | null;
  external:    string | null;
  speedy:      string | null;
  pots:        string | null;
  last_update: string | null;
  status:      string | null;
}

export interface StatusStats {
  total:    number;
  up:       number;
  down:     number;
  notFound: number;
}

export interface CombinedResult {
  rows:       CombinedRow[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export async function getCombinedData(opts: {
  page:       number;
  limit:      number;
  search?:    string;
  type?:      DataType;
  sortBy?:    string;
  sortDir?:   SortDir;
  status?:    string;       // "UP" | "DOWN" | "NOT FOUND" | "all"
  sto?:       string;       // partial match
  dateFrom?:  string;       // yyyy-mm-dd
  dateTo?:    string;       // yyyy-mm-dd
}): Promise<CombinedResult> {
  const { page, limit, search, type = "all", sortDir = "desc" } = opts;
  const offset = (page - 1) * limit;
  const col    = safeSort(opts.sortBy === "type" ? "source" : opts.sortBy);
  const dir    = sortDir === "asc" ? "ASC" : "DESC";
  const sp     = search ? `%${search}%` : null;

  const searchFilter = sp
    ? sql`AND (p.order_id LIKE ${sp} OR p.external LIKE ${sp} OR p.speedy LIKE ${sp} OR p.pots LIKE ${sp})`
    : sql``;

  const typeFilter =
    type === "indihome" ? sql`AND p.source = 'indihome'`
    : type === "indibiz" ? sql`AND p.source = 'indibiz'`
    : sql``;

  const statusFilter = opts.status && opts.status !== "all"
    ? sql`AND p.status = ${opts.status}`
    : sql``;

  const stoFilter = opts.sto
    ? sql`AND p.sto LIKE ${"%" + opts.sto + "%"}`
    : sql``;

  // last_update stored as dd-mm-yyyy, convert for range comparison
  const dateFromFilter = opts.dateFrom
    ? sql`AND STR_TO_DATE(p.last_update, '%d-%m-%Y') >= ${opts.dateFrom}`
    : sql``;

  const dateToFilter = opts.dateTo
    ? sql`AND STR_TO_DATE(p.last_update, '%d-%m-%Y') <= ${opts.dateTo}`
    : sql``;

  /* ── count ──────────────────────────────────────────────── */
  const countResult = await db.execute(sql`
    SELECT COUNT(*) AS total
    FROM pengukuran_order_psb p
    WHERE 1=1
      ${typeFilter} ${searchFilter}
      ${statusFilter} ${stoFilter}
      ${dateFromFilter} ${dateToFilter}
  `);

  const total = Number((countResult as any)[0]?.[0]?.total ?? 0);

  /* ── rows ───────────────────────────────────────────────── */
  const rowsResult = await db.execute(sql`
    SELECT
      p.order_id,
      CASE WHEN p.source = 'indihome' THEN 'IndiHome' ELSE 'IndiBiz' END AS type,
      p.sto, p.external, p.speedy, p.pots, p.last_update, p.status
    FROM pengukuran_order_psb p
    WHERE 1=1
      ${typeFilter} ${searchFilter}
      ${statusFilter} ${stoFilter}
      ${dateFromFilter} ${dateToFilter}
    ORDER BY ${sql.raw(col)} ${sql.raw(dir)}
    LIMIT ${limit} OFFSET ${offset}
  `);

  const rows = ((rowsResult as any)[0] ?? []) as CombinedRow[];

  return {
    rows,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  const [existing] = await db
    .select()
    .from(pengukuranOrderPsb)
    .where(eq(pengukuranOrderPsb.orderId, orderId))
    .limit(1);

  if (!existing) throw new Error("Order tidak ditemukan");

  await db
    .update(pengukuranOrderPsb)
    .set({ status, ...(status === "DOWN" ? { downTime: nowWib() } : {}) })
    .where(eq(pengukuranOrderPsb.orderId, orderId));

  if (status === "DOWN") {
    const pic = existing.sto
      ? (await db.select().from(userFfg).where(eq(userFfg.sto, existing.sto)).limit(1))[0] ?? null
      : null;

    await sendDownNotification(
      {
        orderId:    existing.orderId,
        source:     existing.source    ?? null,
        sto:        existing.sto       ?? null,
        external:   existing.external  ?? null,
        speedy:     existing.speedy    ?? null,
        pots:       existing.pots      ?? null,
        lastUpdate: existing.lastUpdate?? null,
      },
      pic?.idTelegram ?? null,
    );
  }
}

export async function syncStatusFromUmasOnu(): Promise<void> {
  const rows = await db
    .select({
      orderId:       pengukuranOrderPsb.orderId,
      source:        pengukuranOrderPsb.source,
      sto:           pengukuranOrderPsb.sto,
      external:      pengukuranOrderPsb.external,
      speedy:        pengukuranOrderPsb.speedy,
      pots:          pengukuranOrderPsb.pots,
      lastUpdate:    pengukuranOrderPsb.lastUpdate,
      status:        pengukuranOrderPsb.status,
      umasOnuStatus: pengukuranOrderPsb.umasOnuStatus,
    })
    .from(pengukuranOrderPsb);

  for (const row of rows) {
    const raw = row.umasOnuStatus?.toUpperCase() ?? null;
    const newStatus =
      raw === "LOS"    ? "DOWN"      :
      raw === "ONLINE" ? "UP"        :
      /* UNKNOWN/null */ "NOT FOUND";

    if (row.status === newStatus) continue;

    try {
      await db
        .update(pengukuranOrderPsb)
        .set({
          status: newStatus,
          ...(newStatus === "DOWN" ? { downTime: nowWib() } : {}),
        })
        .where(eq(pengukuranOrderPsb.orderId, row.orderId));

      if (newStatus === "DOWN") {
        const pic = row.sto
          ? (await db.select().from(userFfg).where(eq(userFfg.sto, row.sto)).limit(1))[0] ?? null
          : null;

        await sendDownNotification(
          {
            orderId:    row.orderId,
            source:     row.source     ?? null,
            sto:        row.sto        ?? null,
            external:   row.external   ?? null,
            speedy:     row.speedy     ?? null,
            pots:       row.pots       ?? null,
            lastUpdate: row.lastUpdate ?? null,
          },
          pic?.idTelegram ?? null,
        );
      }
    } catch (e) {
      console.error(`[syncStatus] Error pada order ${row.orderId}:`, e);
    }
  }
}

/* ── History ──────────────────────────────────────────────── */

export interface HistoryRow {
  order_id:          string;
  type:              string;
  sto:               string | null;
  external:          string | null;
  speedy:            string | null;
  pots:              string | null;
  last_update:       string | null;
  status:            string | null;
  pic:               string | null;
  status_pengerjaan: string;
  down_time:         string | null;
  pickup_time:       string | null;
  done_time:         string | null;
  penyebab_loss:     string | null;
  segmen_infra:      string | null;
  actsol:            string | null;
  evidence:          string | null;
}

export interface HistoryResult {
  rows:       HistoryRow[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

const HISTORY_SORT = ["order_id", "status", "status_pengerjaan", "down_time", "pickup_time", "done_time", "sto"] as const;
type HistorySortCol = typeof HISTORY_SORT[number];
function safeHistorySort(col?: string): HistorySortCol {
  return (HISTORY_SORT as readonly string[]).includes(col ?? "") ? (col as HistorySortCol) : "down_time";
}

export async function getHistoryData(opts: {
  page:               number;
  limit:              number;
  search?:            string;
  status?:            string;
  statusPengerjaan?:  string;
  sto?:               string;
  sortBy?:            string;
  sortDir?:           SortDir;
}): Promise<HistoryResult> {
  const { page, limit, search, sortDir = "desc" } = opts;
  const offset = (page - 1) * limit;
  const col    = safeHistorySort(opts.sortBy);
  const dir    = sortDir === "asc" ? "ASC" : "DESC";
  const sp     = search ? `%${search}%` : null;

  const searchFilter = sp
    ? sql`AND (p.order_id LIKE ${sp} OR p.external LIKE ${sp} OR p.speedy LIKE ${sp} OR p.pots LIKE ${sp} OR p.pic LIKE ${sp})`
    : sql``;

  const statusFilter = opts.status && opts.status !== "all"
    ? sql`AND p.status = ${opts.status}`
    : sql``;

  const spFilter = opts.statusPengerjaan && opts.statusPengerjaan !== "all"
    ? sql`AND p.status_pengerjaan = ${opts.statusPengerjaan}`
    : sql``;

  const stoFilter = opts.sto
    ? sql`AND p.sto LIKE ${"%" + opts.sto + "%"}`
    : sql``;

  const countResult = await db.execute(sql`
    SELECT COUNT(*) AS total
    FROM pengukuran_order_psb p
    WHERE 1=1 ${statusFilter} ${spFilter} ${searchFilter} ${stoFilter}
  `);
  const total = Number((countResult as any)[0]?.[0]?.total ?? 0);

  const rowsResult = await db.execute(sql`
    SELECT
      p.order_id,
      CASE WHEN p.source = 'indihome' THEN 'IndiHome' ELSE 'IndiBiz' END AS type,
      p.sto, p.external, p.speedy, p.pots, p.last_update, p.status,
      p.pic, p.status_pengerjaan,
      p.down_time, p.pickup_time, p.done_time,
      p.penyebab_loss, p.segmen_infra, p.actsol, p.evidence
    FROM pengukuran_order_psb p
    WHERE 1=1 ${statusFilter} ${spFilter} ${searchFilter} ${stoFilter}
    ORDER BY ${sql.raw(col)} ${sql.raw(dir)}
    LIMIT ${limit} OFFSET ${offset}
  `);

  const rows = ((rowsResult as any)[0] ?? []) as HistoryRow[];
  return { rows, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getStatusStats(): Promise<StatusStats> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*)                                               AS total,
      SUM(CASE WHEN status = 'UP'        THEN 1 ELSE 0 END) AS up,
      SUM(CASE WHEN status = 'DOWN'      THEN 1 ELSE 0 END) AS down,
      SUM(CASE WHEN status = 'NOT FOUND' THEN 1 ELSE 0 END) AS not_found
    FROM pengukuran_order_psb
  `);
  const row = (result as any)[0]?.[0] ?? {};
  return {
    total:    Number(row.total     ?? 0),
    up:       Number(row.up        ?? 0),
    down:     Number(row.down      ?? 0),
    notFound: Number(row.not_found ?? 0),
  };
}
