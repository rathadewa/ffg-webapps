import * as XLSX from "xlsx";
import { db } from "../db";
import { pengukuranOrderPsb } from "../db/schema/pengukuran_order_psb";
import { sql } from "drizzle-orm";

/* ── Order ID generator ─────────────────────────────────────
   Format: ORDYYYYMMDDnnnn  (prefix + 4-digit sequence per day)
   e.g.  : ORD202604220001
──────────────────────────────────────────────────────────── */
async function nextOrderIds(count: number): Promise<string[]> {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = String(now.getMonth() + 1).padStart(2, "0");
  const d    = String(now.getDate()).padStart(2, "0");
  const prefix = `ORD${y}${m}${d}`;

  const rows = await db
    .select({ max: sql<string>`MAX(order_id)` })
    .from(pengukuranOrderPsb)
    .where(sql`order_id LIKE ${prefix + "%"}`);

  const maxId = rows[0]?.max ?? null;
  let seq = maxId ? parseInt(maxId.slice(-4), 10) + 1 : 1;

  return Array.from({ length: count }, () => `${prefix}${String(seq++).padStart(4, "0")}`);
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

/* ── Date normalizer ────────────────────────────────────────
   Always outputs dd-mm-yyyy regardless of input format.

   indihome  → Excel Date object  or  string yyyy-mm-dd
   indibiz   → string dd/mm/yy   (2-digit year, assume 20xx)
──────────────────────────────────────────────────────────── */
function normalizeDate(v: CellVal, source: "indihome" | "indibiz"): string | null {
  if (v == null) return null;

  // Date object (when cellDates: true in XLSX.read)
  if (v instanceof Date && !isNaN(v.getTime())) {
    const dd   = String(v.getDate()).padStart(2, "0");
    const mm   = String(v.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${v.getFullYear()}`;
  }

  // Excel numeric serial date
  if (typeof v === "number") {
    try {
      const p = XLSX.SSF.parse_date_code(v);
      if (p) return `${String(p.d).padStart(2, "0")}-${String(p.m).padStart(2, "0")}-${p.y}`;
    } catch { /* ignore */ }
  }

  if (typeof v === "string") {
    const s = v.trim();

    if (source === "indihome") {
      // yyyy-mm-dd
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    }

    if (source === "indibiz") {
      // dd/mm/yy  (2-digit year → 20yy)
      const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
      if (m2) {
        const dd   = m2[1]!.padStart(2, "0");
        const mm   = m2[2]!.padStart(2, "0");
        const yyyy = 2000 + parseInt(m2[3]!, 10);
        return `${dd}-${mm}-${yyyy}`;
      }
      // dd/mm/yyyy  (4-digit year fallback)
      const m3 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m3) return `${m3[1]!.padStart(2, "0")}-${m3[2]!.padStart(2, "0")}-${m3[3]}`;
    }
  }

  return null;
}

/* ── Chunked insert ─────────────────────────────────────────
   MySQL limits parameters per query (~65 535).
   At 7 cols/row → max ~9 000 rows; use 1 000 to stay safe.
──────────────────────────────────────────────────────────── */
const CHUNK = 500;

async function insertChunked(
  batch: (typeof pengukuranOrderPsb.$inferInsert)[]
): Promise<void> {
  const total = batch.length;
  for (let i = 0; i < total; i += CHUNK) {
    const chunk = batch.slice(i, i + CHUNK);
    console.log(`[insert] chunk ${Math.floor(i/CHUNK)+1}/${Math.ceil(total/CHUNK)} (${chunk.length} rows)`);
    await db.insert(pengukuranOrderPsb).values(chunk);
  }
}

/* ── Parse workbook → rows ──────────────────────────────── */
function parseRows(buffer: ArrayBuffer): CellVal[][] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]!]!;
  return XLSX.utils.sheet_to_json<CellVal[]>(ws, { header: 1, raw: true, defval: null });
}

/* ── Indihome ───────────────────────────────────────────────
   E=sto, K=external, N=speedy, R=last_update (yyyy-mm-dd), U=order_id (ignored, auto-generated)
──────────────────────────────────────────────────────────── */
export async function importIndihome(buffer: ArrayBuffer): Promise<{ inserted: number; skipped: number }> {
  const rows    = parseRows(buffer);
  let   skipped = 0;
  const valid: { sto: string|null; external: string|null; speedy: string|null; lastUpdate: string|null; pots: string|null }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const sto        = str(row, colIdx("E"));
    const external   = str(row, colIdx("K"));
    const speedy     = str(row, colIdx("N"));
    const lastUpdate = normalizeDate(row[colIdx("R")], "indihome");

    if (!sto && !external && !speedy) { skipped++; continue; }

    valid.push({ sto, external, speedy, lastUpdate, pots: null });
  }

  if (valid.length === 0) return { inserted: 0, skipped };

  const orderIds = await nextOrderIds(valid.length);
  const batch = valid.map((r, i) => ({
    orderId:    orderIds[i]!,
    source:     "indihome" as const,
    sto:        r.sto,
    external:   r.external,
    speedy:     r.speedy,
    lastUpdate: r.lastUpdate,
    pots:       null,
  }));

  await insertChunked(batch);
  return { inserted: batch.length, skipped };
}

/* ── Indibiz ────────────────────────────────────────────────
   A=order_id (ignored, auto-generated), E=sto, J=external, K=speedy, L=pots, N=last_update (dd/mm/yy)
──────────────────────────────────────────────────────────── */
export async function importIndibiz(buffer: ArrayBuffer): Promise<{ inserted: number; skipped: number }> {
  const rows    = parseRows(buffer);
  let   skipped = 0;
  const valid: { sto: string|null; external: string|null; speedy: string|null; pots: string|null; lastUpdate: string|null }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const sto        = str(row, colIdx("E"));
    const external   = str(row, colIdx("J"));
    const speedy     = str(row, colIdx("K"));
    const pots       = str(row, colIdx("L"));
    const lastUpdate = normalizeDate(row[colIdx("N")], "indibiz");

    if (!sto && !external && !speedy) { skipped++; continue; }

    valid.push({ sto, external, speedy, pots, lastUpdate });
  }

  if (valid.length === 0) return { inserted: 0, skipped };

  const orderIds = await nextOrderIds(valid.length);
  const batch = valid.map((r, i) => ({
    orderId:    orderIds[i]!,
    source:     "indibiz" as const,
    sto:        r.sto,
    external:   r.external,
    speedy:     r.speedy,
    lastUpdate: r.lastUpdate,
    pots:       r.pots,
  }));

  await insertChunked(batch);
  return { inserted: batch.length, skipped };
}
