import * as XLSX from "xlsx";
import { db } from "../db";
import { ffgIndihome } from "../db/schema/ffg_indihome";
import { ffgIndibiz } from "../db/schema/ffg_indibiz";
import { sql } from "drizzle-orm";

/* ── no_order generator ─────────────────────────────────────
   Format: YYYYMMDDNNNNN  (8-digit date + 5-digit sequence)
──────────────────────────────────────────────────────────── */
function todayPrefix(): number {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return Number(`${y}${m}${d}`);
}

async function nextNoOrder(table: "indihome" | "indibiz"): Promise<number> {
  const prefix = todayPrefix();
  const low  = prefix * 100000 + 1;
  const high = prefix * 100000 + 99999;
  const tbl  = table === "indihome" ? ffgIndihome : ffgIndibiz;

  const rows = await db
    .select({ max: sql<number>`MAX(no_order)` })
    .from(tbl)
    .where(sql`no_order BETWEEN ${low} AND ${high}`);

  const current = rows[0]?.max ?? 0;
  return current > 0 ? current + 1 : low;
}

/* ── Cell helpers ───────────────────────────────────────────
   sheet_to_json({ header: 1 }) returns primitive values,
   NOT CellObject — handle string | number | Date | null
──────────────────────────────────────────────────────────── */
type CellVal = string | number | boolean | Date | null | undefined;

function colIdx(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 65;
}

function str(row: CellVal[], idx: number): string | null {
  const v = row[idx];
  if (v == null) return null;
  if (v instanceof Date) return null;
  const s = String(v).trim();
  return s || null;
}

function dateStr(row: CellVal[], idx: number): string | null {
  const v = row[idx];
  if (v == null) return null;

  // Date object (when cellDates: true in XLSX.read)
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }

  // Excel numeric serial date
  if (typeof v === "number") {
    try {
      const parsed = XLSX.SSF.parse_date_code(v);
      if (parsed) {
        const mm = String(parsed.m).padStart(2, "0");
        const dd = String(parsed.d).padStart(2, "0");
        return `${parsed.y}-${mm}-${dd}`;
      }
    } catch { /* ignore */ }
  }

  // String date fallback
  if (typeof v === "string") {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // dd/mm/yyyy or dd-mm-yyyy
    const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m2) return `${m2[3]}-${m2[2]!.padStart(2,"0")}-${m2[1]!.padStart(2,"0")}`;
  }

  return null;
}

/* ── Parse workbook → rows ──────────────────────────────── */
function parseRows(buffer: ArrayBuffer): CellVal[][] {
  const wb  = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws  = wb.Sheets[wb.SheetNames[0]!]!;
  // raw: true keeps numbers as numbers; cellDates in read() gives us Date objects
  return XLSX.utils.sheet_to_json<CellVal[]>(ws, { header: 1, raw: true, defval: null });
}

/* ── Indihome ───────────────────────────────────────────────
   E=sto, K=external, N=speedy, R=last_update, U=order_id
──────────────────────────────────────────────────────────── */
export async function importIndihome(buffer: ArrayBuffer): Promise<{ inserted: number; skipped: number }> {
  const rows = parseRows(buffer);
  let inserted = 0, skipped = 0;

  // skip row 0 (header)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const sto      = str(row, colIdx("E"));
    const external = str(row, colIdx("K"));
    const speedy   = str(row, colIdx("N"));
    const lastUpdate = dateStr(row, colIdx("R"));
    const orderId  = str(row, colIdx("U"));

    // skip completely empty rows
    if (!sto && !external && !speedy && !orderId) { skipped++; continue; }

    const noOrder = await nextNoOrder("indihome");
    await db.insert(ffgIndihome).values({ noOrder, sto, external, speedy, lastUpdate, orderId });
    inserted++;
  }

  return { inserted, skipped };
}

/* ── Indibiz ────────────────────────────────────────────────
   A=order_id, E=sto, J=external, K=speedy, L=pots, N=last_update
──────────────────────────────────────────────────────────── */
export async function importIndibiz(buffer: ArrayBuffer): Promise<{ inserted: number; skipped: number }> {
  const rows = parseRows(buffer);
  let inserted = 0, skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const orderId  = str(row, colIdx("A"));
    const sto      = str(row, colIdx("E"));
    const external = str(row, colIdx("J"));
    const speedy   = str(row, colIdx("K"));
    const pots     = str(row, colIdx("L"));
    const lastUpdate = dateStr(row, colIdx("N"));

    if (!sto && !external && !speedy && !orderId) { skipped++; continue; }

    const noOrder = await nextNoOrder("indibiz");
    await db.insert(ffgIndibiz).values({ noOrder, sto, external, speedy, lastUpdate, orderId, pots });
    inserted++;
  }

  return { inserted, skipped };
}
