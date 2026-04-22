import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight, Database, SlidersHorizontal, X,
} from "lucide-react";
import { BASE_PATH } from "../config";

type DataType = "all" | "indihome" | "indibiz";
type SortDir  = "asc" | "desc";

interface CombinedRow {
  order_id:    string;
  type:        "IndiHome" | "IndiBiz";
  sto:         string | null;
  external:    string | null;
  speedy:      string | null;
  pots:        string | null;
  last_update: string | null;
  status:      string | null;
}

interface PageResult {
  rows:       CombinedRow[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

interface Filters {
  page:     number;
  search:   string;
  type:     DataType;
  sortBy:   string;
  sortDir:  SortDir;
  status:   string;
  sto:      string;
  dateFrom: string;
  dateTo:   string;
}

/* ── Helpers ────────────────────────────────────────────── */
function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("session_token") ?? ""}` };
}

function fmtDate(d: string | null) {
  if (!d) return null;
  const parts = d.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (parts) {
    const dt = new Date(`${parts[3]}-${parts[2]}-${parts[1]}`);
    if (!isNaN(dt.getTime()))
      return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  }
  return d;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: "var(--fg-faint)" }}>—</span>;
  const cfg: Record<string, { bg: string; color: string }> = {
    "UP":        { bg: "rgba(52,211,153,0.15)",  color: "#34d399" },
    "DOWN":      { bg: "rgba(248,113,113,0.15)", color: "#f87171" },
    "NOT FOUND": { bg: "rgba(251,191,36,0.15)",  color: "#fbbf24" },
  };
  const s = cfg[status] ?? { bg: "rgba(148,163,184,0.15)", color: "#94a3b8" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "2px 8px", borderRadius: 6,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
    }}>
      {status}
    </span>
  );
}

const EMPTY = <span style={{ color: "var(--fg-faint)" }}>—</span>;

/* ── Sort header ────────────────────────────────────────── */
function SortTh({ col, label, sortBy, sortDir, onSort }: {
  col: string; label: string; sortBy: string; sortDir: SortDir;
  onSort: (col: string) => void;
}) {
  const active = sortBy === col;
  return (
    <th className="th-sort" onClick={() => onSort(col)}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
      <span className="th-sort-inner">
        {label}
        <span className="th-sort-icons">
          <ChevronUp   size={10} style={{ opacity: active && sortDir === "asc"  ? 1 : 0.25 }} />
          <ChevronDown size={10} style={{ opacity: active && sortDir === "desc" ? 1 : 0.25 }} />
        </span>
      </span>
    </th>
  );
}

/* ── Pagination ─────────────────────────────────────────── */
function Pagination({ page, totalPages, total, limit, onPage }: {
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

  const [search,   setSearch]   = useState("");
  const [type,     setType]     = useState<DataType>("all");
  const [sortBy,   setSortBy]   = useState("order_id");
  const [sortDir,  setSortDir]  = useState<SortDir>("desc");
  const [page,     setPage]     = useState(1);
  const [status,   setStatus]   = useState("all");
  const [sto,      setSto]      = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const limit = 20;

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (f: Filters) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page:    String(f.page),
        limit:   String(limit),
        sortBy:  f.sortBy,
        sortDir: f.sortDir,
      });
      if (f.search)              params.set("search",   f.search);
      if (f.type !== "all")      params.set("type",     f.type);
      if (f.status !== "all")    params.set("status",   f.status);
      if (f.sto)                 params.set("sto",      f.sto);
      if (f.dateFrom)            params.set("dateFrom", f.dateFrom);
      if (f.dateTo)              params.set("dateTo",   f.dateTo);

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

  const currentFilters = useCallback((): Filters => ({
    page, search, type, sortBy, sortDir, status, sto, dateFrom, dateTo,
  }), [page, search, type, sortBy, sortDir, status, sto, dateFrom, dateTo]);

  useEffect(() => {
    fetchData({ page: 1, search: "", type: "all", sortBy: "order_id", sortDir: "desc", status: "all", sto: "", dateFrom: "", dateTo: "" });
  }, [fetchData]);

  const reload = (overrides: Partial<Filters> = {}) => {
    fetchData({ ...currentFilters(), ...overrides });
  };

  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => reload({ search: val, page: 1 }), 350);
  };

  const handleSto = (val: string) => {
    setSto(val); setPage(1);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => reload({ sto: val, page: 1 }), 350);
  };

  const handleType     = (val: DataType) => { setType(val);     setPage(1); reload({ type: val,     page: 1 }); };
  const handleStatus   = (val: string)   => { setStatus(val);   setPage(1); reload({ status: val,   page: 1 }); };
  const handleDateFrom = (val: string)   => { setDateFrom(val); setPage(1); reload({ dateFrom: val, page: 1 }); };
  const handleDateTo   = (val: string)   => { setDateTo(val);   setPage(1); reload({ dateTo: val,   page: 1 }); };

  const handleSort = (col: string) => {
    const nextDir: SortDir = sortBy === col && sortDir === "desc" ? "asc" : "desc";
    setSortBy(col); setSortDir(nextDir); setPage(1);
    reload({ sortBy: col, sortDir: nextDir, page: 1 });
  };

  const goPage = (p: number) => { setPage(p); reload({ page: p }); };

  const hasActiveFilter = status !== "all" || sto || dateFrom || dateTo;

  const resetFilters = () => {
    setStatus("all"); setSto(""); setDateFrom(""); setDateTo(""); setPage(1);
    reload({ status: "all", sto: "", dateFrom: "", dateTo: "", page: 1 });
  };

  const sortProps = { sortBy, sortDir, onSort: handleSort };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-input)", border: "1px solid var(--border)",
    borderRadius: 8, color: "var(--fg)", fontSize: 12,
    padding: "7px 10px", outline: "none",
  };

  return (
    <div className="card">
      {/* ── Card header ─────────────────────────────────── */}
      <div className="card-head" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>

        {/* Row 1: title + search + type */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <p className="card-title">Data Pengukuran Order PSB</p>
            <p className="card-sub">{data ? `${data.total.toLocaleString("id-ID")} total data` : "Memuat…"}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div className="search-wrap" style={{ minWidth: 200, maxWidth: 240 }}>
              <Search size={13} />
              <input className="search-input" type="text" placeholder="Cari Order ID…"
                value={search} onChange={(e) => handleSearch(e.target.value)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <SlidersHorizontal size={13} style={{ color: "var(--fg-faint)", flexShrink: 0 }} />
              <select className="field-input" value={type} onChange={(e) => handleType(e.target.value as DataType)}
                style={{ padding: "7px 28px 7px 10px", fontSize: 12, minWidth: 130 }}>
                <option value="all">Semua Tipe</option>
                <option value="indihome">IndiHome</option>
                <option value="indibiz">IndiBiz</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: filters */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>

          {/* Status filter */}
          <select value={status} onChange={(e) => handleStatus(e.target.value)}
            style={{ ...inputStyle, minWidth: 140 }}>
            <option value="all">Semua Status</option>
            <option value="UP">UP</option>
            <option value="DOWN">DOWN</option>
            <option value="NOT FOUND">NOT FOUND</option>
          </select>

          {/* STO filter */}
          <div className="search-wrap" style={{ minWidth: 160, maxWidth: 200 }}>
            <Search size={13} />
            <input className="search-input" type="text" placeholder="Filter STO…"
              value={sto} onChange={(e) => handleSto(e.target.value)} />
          </div>

          {/* Date range */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--fg-faint)", whiteSpace: "nowrap" }}>Last Update:</span>
            <input type="date" value={dateFrom} onChange={(e) => handleDateFrom(e.target.value)}
              style={{ ...inputStyle, width: 140 }} />
            <span style={{ fontSize: 11, color: "var(--fg-faint)" }}>—</span>
            <input type="date" value={dateTo} onChange={(e) => handleDateTo(e.target.value)}
              style={{ ...inputStyle, width: 140 }} />
          </div>

          {/* Reset button */}
          {hasActiveFilter && (
            <button onClick={resetFilters} style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: 8, color: "#f87171", fontSize: 11, fontWeight: 600,
              padding: "6px 10px", cursor: "pointer",
            }}>
              <X size={12} /> Reset Filter
            </button>
          )}
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
            <span>{search || type !== "all" || hasActiveFilter ? "Tidak ada data yang cocok." : "Belum ada data. Upload file Excel terlebih dahulu."}</span>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <SortTh col="order_id"    label="Order ID"    {...sortProps} />
                <SortTh col="source"      label="Tipe"        {...sortProps} />
                <SortTh col="status"      label="Status"      {...sortProps} />
                <SortTh col="sto"         label="STO"         {...sortProps} />
                <SortTh col="external"    label="External"    {...sortProps} />
                <SortTh col="speedy"      label="Speedy"      {...sortProps} />
                <SortTh col="pots"        label="POTS"        {...sortProps} />
                <SortTh col="last_update" label="Last Update" {...sortProps} />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.order_id}>
                  <td className="td-id" style={{ fontVariantNumeric: "tabular-nums" }}>{row.order_id}</td>
                  <td>
                    <span className={`badge ${row.type === "IndiHome" ? "badge-type-home" : "badge-type-biz"}`}>
                      {row.type}
                    </span>
                  </td>
                  <td><StatusBadge status={row.status} /></td>
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
        <Pagination page={page} totalPages={data.totalPages} total={data.total}
          limit={limit} onPage={goPage} />
      )}
    </div>
  );
}
