import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight, Database, SlidersHorizontal,
} from "lucide-react";
import { BASE_PATH } from "../config";

type DataType = "all" | "indihome" | "indibiz";
type SortDir  = "asc" | "desc";

interface CombinedRow {
  no_order:    number;
  type:        "IndiHome" | "IndiBiz";
  order_id:    string | null;
  sto:         string | null;
  external:    string | null;
  speedy:      string | null;
  pots:        string | null;
  last_update: string | null;
}

interface PageResult {
  rows:       CombinedRow[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

/* ── Helpers ────────────────────────────────────────────── */
function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("session_token") ?? ""}` };
}

function fmtDate(d: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

const EMPTY = <span style={{ color: "var(--fg-faint)" }}>—</span>;

/* ── Sort header ────────────────────────────────────────── */
function SortTh({
  col, label, sortBy, sortDir, onSort,
}: {
  col: string; label: string; sortBy: string; sortDir: SortDir;
  onSort: (col: string) => void;
}) {
  const active = sortBy === col;
  return (
    <th
      className="th-sort"
      onClick={() => onSort(col)}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="th-sort-inner">
        {label}
        <span className="th-sort-icons">
          <ChevronUp  size={10} style={{ opacity: active && sortDir === "asc"  ? 1 : 0.25 }} />
          <ChevronDown size={10} style={{ opacity: active && sortDir === "desc" ? 1 : 0.25 }} />
        </span>
      </span>
    </th>
  );
}

/* ── Pagination ─────────────────────────────────────────── */
function Pagination({
  page, totalPages, total, limit, onPage,
}: {
  page: number; totalPages: number; total: number; limit: number;
  onPage: (p: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);
  return (
    <div className="pagination">
      <span className="pagination-info">
        {total === 0 ? "Tidak ada data" : `${from.toLocaleString("id-ID")}–${to.toLocaleString("id-ID")} dari ${total.toLocaleString("id-ID")} data`}
      </span>
      <div className="pagination-btns">
        <button className="pg-btn" onClick={() => onPage(1)}          disabled={page <= 1}><ChevronsLeft  size={12} /></button>
        <button className="pg-btn" onClick={() => onPage(page - 1)}   disabled={page <= 1}><ChevronLeft   size={12} /></button>
        <span className="pg-label">Hal {page} / {totalPages}</span>
        <button className="pg-btn" onClick={() => onPage(page + 1)}   disabled={page >= totalPages}><ChevronRight  size={12} /></button>
        <button className="pg-btn" onClick={() => onPage(totalPages)} disabled={page >= totalPages}><ChevronsRight size={12} /></button>
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────── */
export default function CombinedDataTable() {
  const [data,    setData]    = useState<PageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [search,  setSearch]  = useState("");
  const [type,    setType]    = useState<DataType>("all");
  const [sortBy,  setSortBy]  = useState("no_order");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page,    setPage]    = useState(1);
  const limit = 20;

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (opts: {
    page: number; search: string; type: DataType; sortBy: string; sortDir: SortDir;
  }) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page:    String(opts.page),
        limit:   String(limit),
        sortBy:  opts.sortBy,
        sortDir: opts.sortDir,
      });
      if (opts.search) params.set("search", opts.search);
      if (opts.type !== "all") params.set("type", opts.type);

      const res  = await fetch(`${BASE_PATH}/api/data/combined?${params}`, { headers: authHeader() });
      const json = await res.json() as { data?: PageResult; error?: string };
      if (!res.ok) { setError(json.error ?? "Gagal memuat data."); return; }
      setData(json.data ?? null);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Initial load
  useEffect(() => {
    fetchData({ page: 1, search: "", type: "all", sortBy: "no_order", sortDir: "desc" });
  }, [fetchData]);

  const reload = (overrides: Partial<{ page: number; search: string; type: DataType; sortBy: string; sortDir: SortDir }> = {}) => {
    const next = {
      page: overrides.page ?? page,
      search: overrides.search ?? search,
      type: overrides.type ?? type,
      sortBy: overrides.sortBy ?? sortBy,
      sortDir: overrides.sortDir ?? sortDir,
    };
    fetchData(next);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => reload({ search: val, page: 1 }), 350);
  };

  const handleType = (val: DataType) => {
    setType(val);
    setPage(1);
    reload({ type: val, page: 1 });
  };

  const handleSort = (col: string) => {
    const nextDir: SortDir = sortBy === col && sortDir === "desc" ? "asc" : "desc";
    setSortBy(col);
    setSortDir(nextDir);
    setPage(1);
    reload({ sortBy: col, sortDir: nextDir, page: 1 });
  };

  const goPage = (p: number) => {
    setPage(p);
    reload({ page: p });
  };

  const sortProps = { sortBy, sortDir, onSort: handleSort };

  return (
    <div className="card">
      {/* ── Card header ─────────────────────────────────── */}
      <div className="card-head" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="card-title">Data FFG IndiHome & IndiBiz</p>
          <p className="card-sub">
            {data ? `${data.total.toLocaleString("id-ID")} total data` : "Memuat…"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>

          {/* Search */}
          <div className="search-wrap" style={{ minWidth: 200, maxWidth: 260 }}>
            <Search size={13} />
            <input
              className="search-input"
              type="text"
              placeholder="Cari STO, Order ID…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          {/* Type filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <SlidersHorizontal size={13} style={{ color: "var(--fg-faint)", flexShrink: 0 }} />
            <select
              className="field-input"
              value={type}
              onChange={(e) => handleType(e.target.value as DataType)}
              style={{ padding: "7px 28px 7px 10px", fontSize: 12, minWidth: 130 }}
            >
              <option value="all">Semua Tipe</option>
              <option value="indihome">IndiHome</option>
              <option value="indibiz">IndiBiz</option>
            </select>
          </div>

        </div>
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      {error && <div className="alert alert-error" style={{ margin: "0 20px 12px" }}>{error}</div>}

      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Memuat data…</div>
        ) : !data || data.rows.length === 0 ? (
          <div className="table-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 24px" }}>
            <Database size={32} style={{ opacity: 0.2 }} />
            <span>{search || type !== "all" ? "Tidak ada data yang cocok." : "Belum ada data. Upload file Excel terlebih dahulu."}</span>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <SortTh col="no_order"    label="No. Order"   {...sortProps} />
                <SortTh col="type"        label="Tipe"        {...sortProps} />
                <SortTh col="order_id"    label="Order ID"    {...sortProps} />
                <SortTh col="sto"         label="STO"         {...sortProps} />
                <SortTh col="external"    label="External"    {...sortProps} />
                <SortTh col="speedy"      label="Speedy"      {...sortProps} />
                <SortTh col="pots"        label="POTS"        {...sortProps} />
                <SortTh col="last_update" label="Last Update" {...sortProps} />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={`${row.type}-${row.no_order}`}>
                  <td className="td-id" style={{ fontVariantNumeric: "tabular-nums" }}>{row.no_order}</td>
                  <td>
                    <span className={`badge ${row.type === "IndiHome" ? "badge-type-home" : "badge-type-biz"}`}>
                      {row.type}
                    </span>
                  </td>
                  <td>{row.order_id ?? EMPTY}</td>
                  <td>{row.sto      ?? EMPTY}</td>
                  <td>{row.external ?? EMPTY}</td>
                  <td>{row.speedy   ?? EMPTY}</td>
                  <td>{row.pots     ?? EMPTY}</td>
                  <td className="td-date">{fmtDate(row.last_update) ?? EMPTY}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────── */}
      {data && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          total={data.total}
          limit={limit}
          onPage={goPage}
        />
      )}
    </div>
  );
}
