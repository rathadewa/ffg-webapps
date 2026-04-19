import { db } from "../db";
import { sql } from "drizzle-orm";

export type DataType = "indihome" | "indibiz" | "all";
export type SortDir  = "asc" | "desc";

const SORT_WHITELIST = ["no_order", "type", "sto", "external", "speedy", "last_update", "order_id", "pots"] as const;
type SortCol = typeof SORT_WHITELIST[number];

function safeSort(col?: string): SortCol {
  return (SORT_WHITELIST as readonly string[]).includes(col ?? "") ? (col as SortCol) : "no_order";
}

export interface CombinedRow {
  no_order:    number;
  type:        "IndiHome" | "IndiBiz";
  order_id:    string | null;
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
  const offset  = (page - 1) * limit;
  const col     = safeSort(opts.sortBy);
  const dir     = sortDir === "asc" ? "ASC" : "DESC";
  const sp      = search ? `%${search}%` : null;

  /* ── search fragments ───────────────────────────────────── */
  const homeSearch = sp
    ? sql`WHERE (h.sto LIKE ${sp} OR h.order_id LIKE ${sp} OR h.external LIKE ${sp} OR h.speedy LIKE ${sp})`
    : sql``;
  const bizSearch = sp
    ? sql`WHERE (b.sto LIKE ${sp} OR b.order_id LIKE ${sp} OR b.external LIKE ${sp} OR b.speedy LIKE ${sp} OR b.pots LIKE ${sp})`
    : sql``;

  /* ── type filter on the outer query ────────────────────── */
  const typeFilter =
    type === "indihome" ? sql`WHERE combined.type = 'IndiHome'`
    : type === "indibiz" ? sql`WHERE combined.type = 'IndiBiz'`
    : sql``;

  /* ── count ──────────────────────────────────────────────── */
  const countResult = await db.execute(sql`
    SELECT COUNT(*) AS total FROM (
      SELECT 'IndiHome' AS type, h.sto, h.order_id, h.external, h.speedy
      FROM ffg_indihome h ${homeSearch}
      UNION ALL
      SELECT 'IndiBiz'  AS type, b.sto, b.order_id, b.external, b.speedy
      FROM ffg_indibiz b ${bizSearch}
    ) AS combined
    ${typeFilter}
  `);

  const total = Number((countResult as any)[0]?.[0]?.total ?? 0);

  /* ── rows ───────────────────────────────────────────────── */
  const rowsResult = await db.execute(sql`
    SELECT combined.* FROM (
      SELECT
        h.no_order, 'IndiHome' AS type,
        h.order_id, h.sto, h.external, h.speedy,
        NULL        AS pots,
        h.last_update
      FROM ffg_indihome h ${homeSearch}
      UNION ALL
      SELECT
        b.no_order, 'IndiBiz' AS type,
        b.order_id, b.sto, b.external, b.speedy,
        b.pots,
        b.last_update
      FROM ffg_indibiz b ${bizSearch}
    ) AS combined
    ${typeFilter}
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
