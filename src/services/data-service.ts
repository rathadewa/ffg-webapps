import { db } from "../db";
import { sql } from "drizzle-orm";

export type DataType = "indihome" | "indibiz" | "all";
export type SortDir  = "asc" | "desc";

const SORT_WHITELIST = ["order_id", "source", "sto", "external", "speedy", "last_update", "pots"] as const;
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
}

export interface CombinedResult {
  rows:       CombinedRow[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export async function getCombinedData(opts: {
  page:    number;
  limit:   number;
  search?: string;
  type?:   DataType;
  sortBy?: string;
  sortDir?: SortDir;
}): Promise<CombinedResult> {
  const { page, limit, search, type = "all", sortDir = "desc" } = opts;
  const offset = (page - 1) * limit;
  const col    = safeSort(opts.sortBy === "type" ? "source" : opts.sortBy);
  const dir    = sortDir === "asc" ? "ASC" : "DESC";
  const sp     = search ? `%${search}%` : null;

  const searchFilter = sp
    ? sql`AND (p.sto LIKE ${sp} OR p.order_id LIKE ${sp} OR p.external LIKE ${sp} OR p.speedy LIKE ${sp} OR p.pots LIKE ${sp})`
    : sql``;

  const typeFilter =
    type === "indihome" ? sql`AND p.source = 'indihome'`
    : type === "indibiz" ? sql`AND p.source = 'indibiz'`
    : sql``;

  /* ── count ──────────────────────────────────────────────── */
  const countResult = await db.execute(sql`
    SELECT COUNT(*) AS total
    FROM pengukuran_order_psb p
    WHERE 1=1 ${typeFilter} ${searchFilter}
  `);

  const total = Number((countResult as any)[0]?.[0]?.total ?? 0);

  /* ── rows ───────────────────────────────────────────────── */
  const rowsResult = await db.execute(sql`
    SELECT
      p.order_id,
      CASE WHEN p.source = 'indihome' THEN 'IndiHome' ELSE 'IndiBiz' END AS type,
      p.sto, p.external, p.speedy, p.pots, p.last_update
    FROM pengukuran_order_psb p
    WHERE 1=1 ${typeFilter} ${searchFilter}
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
