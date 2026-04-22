import { db } from "../db";
import { sql } from "drizzle-orm";

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
