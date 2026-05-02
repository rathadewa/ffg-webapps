import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight, Database, X, ImageOff, Images, Download, CalendarDays,
} from "lucide-react";
import { BASE_PATH } from "../config";

/* ── Types ──────────────────────────────────────────────────── */
type SortDir = "asc" | "desc";

interface HistoryRow {
  order_id:          string;
  type:              string;
  order_type:        "logic" | "fisik" | null;
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

interface PageResult {
  rows: HistoryRow[]; total: number; page: number; limit: number; totalPages: number;
}

interface Filters {
  page: number; search: string; sortBy: string; sortDir: SortDir;
  status: string; statusPengerjaan: string; sto: string;
  dateFrom: string; dateTo: string;
}

/* ── Helpers ─────────────────────────────────────────────────── */
function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("session_token") ?? ""}` };
}

const EMPTY = <span style={{ color: "var(--fg-faint)" }}>—</span>;

function fmtTs(ts: string | null) {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <>{EMPTY}</>;
  const cfg: Record<string, { bg: string; color: string }> = {
    "UP":        { bg: "rgba(52,211,153,0.15)",  color: "#34d399" },
    "DOWN":      { bg: "rgba(248,113,113,0.15)", color: "#f87171" },
    "NOT FOUND": { bg: "rgba(251,191,36,0.15)",  color: "#fbbf24" },
  };
  const s = cfg[status] ?? { bg: "rgba(148,163,184,0.15)", color: "#94a3b8" };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
      {status}
    </span>
  );
}

function SpBadge({ sp }: { sp: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    belum:  { bg: "rgba(148,163,184,0.15)", color: "#94a3b8", label: "Belum"  },
    pickup: { bg: "rgba(251,191,36,0.15)",  color: "#fbbf24", label: "Pickup" },
    done:   { bg: "rgba(52,211,153,0.15)",  color: "#34d399", label: "Done"   },
  };
  const s = cfg[sp] ?? cfg["belum"]!;
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function SortTh({ col, label, sortBy, sortDir, onSort }: {
  col: string; label: string; sortBy: string; sortDir: SortDir; onSort: (c: string) => void;
}) {
  const active = sortBy === col;
  return (
    <th className="th-sort" onClick={() => onSort(col)}>
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

function Pagination({ page, totalPages, total, limit, onPage }: {
  page: number; totalPages: number; total: number; limit: number; onPage: (p: number) => void;
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

/* ── Evidence Modal ─────────────────────────────────────────── */
function EvidenceModal({ fileIds, onClose }: { fileIds: string[]; onClose: () => void }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const prev = () => setLightboxIdx((i) => (i !== null ? (i - 1 + fileIds.length) % fileIds.length : null));
  const next = () => setLightboxIdx((i) => (i !== null ? (i + 1) % fileIds.length : null));

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape")     setLightboxIdx(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx]);

  const handleDownload = (fid: string) => {
    const a = document.createElement("a");
    a.href = `${BASE_PATH}/api/evidence/${fid}`;
    a.download = fid;
    a.click();
  };

  return (
    <>
      {/* Thumbnail grid modal */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.7)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 24,
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: "var(--bg-card)", borderRadius: 16, padding: 24,
            maxWidth: 720, width: "100%", maxHeight: "85vh", overflowY: "auto",
            boxShadow: "var(--shadow-lg)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Evidence ({fileIds.length} foto)</span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-dim)" }}>
              <X size={18} />
            </button>
          </div>

          {fileIds.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-faint)" }}>
              <ImageOff size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>Tidak ada evidence</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {fileIds.map((fid, idx) => (
                <div
                  key={fid}
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(idx); }}
                  style={{ cursor: "zoom-in", borderRadius: 10, overflow: "hidden", background: "var(--bg-raised)", aspectRatio: "1" }}
                >
                  <img
                    src={`${BASE_PATH}/api/evidence/${fid}`}
                    alt="evidence"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity 0.15s" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1100,
            background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close */}
          <button
            onClick={() => setLightboxIdx(null)}
            style={{
              position: "absolute", top: 16, right: 16,
              background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 999,
              color: "#fff", cursor: "pointer", padding: 10, display: "flex",
            }}
          >
            <X size={18} />
          </button>

          {/* Download */}
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(fileIds[lightboxIdx]!); }}
            style={{
              position: "absolute", top: 16, right: 60,
              background: "rgba(59,130,246,0.8)", border: "none", borderRadius: 999,
              color: "#fff", cursor: "pointer", padding: 10, display: "flex",
              gap: 6, alignItems: "center", fontSize: 12, fontWeight: 600,
            }}
          >
            <Download size={14} /> Download
          </button>

          {/* Counter */}
          <div style={{
            position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.6)", fontSize: 12,
          }}>
            {lightboxIdx + 1} / {fileIds.length}
          </div>

          {/* Prev */}
          {fileIds.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              style={{
                position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 999,
                color: "#fff", cursor: "pointer", padding: 12, display: "flex",
              }}
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Image */}
          <img
            src={`${BASE_PATH}/api/evidence/${fileIds[lightboxIdx]}`}
            alt="evidence"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "calc(100vw - 140px)", maxHeight: "calc(100vh - 100px)",
              objectFit: "contain", borderRadius: 8,
              boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
            }}
          />

          {/* Next */}
          {fileIds.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              style={{
                position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 999,
                color: "#fff", cursor: "pointer", padding: 12, display: "flex",
              }}
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      )}
    </>
  );
}

/* ── Main ────────────────────────────────────────────────────── */
export default function HistoryView() {
  const [data,    setData]    = useState<PageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [search,           setSearch]           = useState("");
  const [status,           setStatus]           = useState("all");
  const [statusPengerjaan, setStatusPengerjaan] = useState("all");
  const [sto,              setSto]              = useState("");
  const [dateFrom,         setDateFrom]         = useState("");
  const [dateTo,           setDateTo]           = useState("");
  const [sortBy,           setSortBy]           = useState("down_time");
  const [sortDir,          setSortDir]          = useState<SortDir>("desc");
  const [page,             setPage]             = useState(1);
  const [evidence,         setEvidence]         = useState<string[] | null>(null);
  const limit = 20;

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (f: Filters) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({
        page: String(f.page), limit: String(limit),
        sortBy: f.sortBy, sortDir: f.sortDir,
      });
      if (f.search)                         params.set("search",           f.search);
      if (f.status !== "all")               params.set("status",           f.status);
      if (f.statusPengerjaan !== "all")     params.set("statusPengerjaan", f.statusPengerjaan);
      if (f.sto)                            params.set("sto",              f.sto);
      if (f.dateFrom)                       params.set("dateFrom",         f.dateFrom);
      if (f.dateTo)                         params.set("dateTo",           f.dateTo);

      const res  = await fetch(`${BASE_PATH}/api/data/history?${params}`, { headers: authHeader() });
      const json = await res.json() as { data?: PageResult; error?: string };
      if (!res.ok) { setError(json.error ?? "Gagal memuat data."); return; }
      setData(json.data ?? null);
    } catch { setError("Tidak dapat terhubung ke server."); }
    finally  { setLoading(false); }
  }, [limit]);

  const currentFilters = useCallback((): Filters => ({
    page, search, sortBy, sortDir, status, statusPengerjaan, sto, dateFrom, dateTo,
  }), [page, search, sortBy, sortDir, status, statusPengerjaan, sto, dateFrom, dateTo]);

  useEffect(() => {
    fetchData({ page: 1, search: "", sortBy: "down_time", sortDir: "desc", status: "all", statusPengerjaan: "all", sto: "", dateFrom: "", dateTo: "" });
  }, [fetchData]);

  const reload = (overrides: Partial<Filters> = {}) => fetchData({ ...currentFilters(), ...overrides });

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

  const handleDateFrom = (val: string) => { setDateFrom(val); setPage(1); reload({ dateFrom: val, page: 1 }); };
  const handleDateTo   = (val: string) => { setDateTo(val);   setPage(1); reload({ dateTo:   val, page: 1 }); };
  const clearDates     = ()            => { setDateFrom(""); setDateTo(""); setPage(1); reload({ dateFrom: "", dateTo: "", page: 1 }); };

  const handleStatus = (val: string) => { setStatus(val); setPage(1); reload({ status: val, page: 1 }); };
  const handleSp     = (val: string) => { setStatusPengerjaan(val); setPage(1); reload({ statusPengerjaan: val, page: 1 }); };

  const handleSort = (col: string) => {
    const nextDir: SortDir = sortBy === col && sortDir === "desc" ? "asc" : "desc";
    setSortBy(col); setSortDir(nextDir); setPage(1);
    reload({ sortBy: col, sortDir: nextDir, page: 1 });
  };

  const goPage = (p: number) => { setPage(p); reload({ page: p }); };

  const hasActiveFilter = search || status !== "all" || statusPengerjaan !== "all" || sto || dateFrom || dateTo;

  const resetFilters = () => {
    setSearch(""); setStatus("all"); setStatusPengerjaan("all"); setSto(""); setDateFrom(""); setDateTo(""); setPage(1);
    reload({ search: "", status: "all", statusPengerjaan: "all", sto: "", dateFrom: "", dateTo: "", page: 1 });
  };

  const openEvidence = (raw: string | null) => {
    try { setEvidence(raw ? (JSON.parse(raw) as string[]) : []); }
    catch { setEvidence([]); }
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-input)", border: "1px solid var(--border)",
    borderRadius: 8, color: "var(--fg)", fontSize: 12, padding: "7px 10px", outline: "none",
  };

  const filterBtn = (val: string, cur: string, label: string, onSelect: (v: string) => void, color?: string) => {
    const active = cur === val;
    return (
      <button key={val} onClick={() => { if (val !== cur) onSelect(val); }}
        style={{
          padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
          border: `1px solid ${active ? "transparent" : "var(--border)"}`,
          background: active ? (color ? `${color}22` : "var(--accent-subtle)") : "var(--bg-input)",
          color: active ? (color ?? "var(--accent)") : "var(--fg-dim)", transition: "all .15s",
        }}>
        {label}
      </button>
    );
  };

  const sortProps = { sortBy, sortDir, onSort: handleSort };

  return (
    <>
      {evidence !== null && (
        <EvidenceModal fileIds={evidence} onClose={() => setEvidence(null)} />
      )}

      <div className="page-head">
        <div className="page-head-left">
          <span className="page-head-title">History Pengerjaan Tiket</span>
          <span className="page-head-sub">Riwayat lengkap pengerjaan tiket PSB termasuk detail penanganan</span>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {/* ── Filter ──────────────────────────────────────── */}
        <div className="card-head" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
          <div>
            <p className="card-title">Riwayat Pengerjaan</p>
            <p className="card-sub">{data ? `${data.total.toLocaleString("id-ID")} total data` : "Memuat…"}</p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Search */}
            <div className="search-wrap" style={{ minWidth: 180, maxWidth: 240 }}>
              <Search size={13} />
              <input className="search-input" type="text" placeholder="Cari Order ID / PIC…"
                value={search} onChange={(e) => handleSearch(e.target.value)} />
            </div>

            {/* STO */}
            <div className="search-wrap" style={{ minWidth: 140, maxWidth: 180 }}>
              <Search size={13} />
              <input className="search-input" type="text" placeholder="Filter STO…"
                value={sto} onChange={(e) => handleSto(e.target.value)} />
            </div>

            {/* Date range — filter by down_time */}
            <div style={{
              display: "flex", alignItems: "center", gap: 0,
              background: "var(--bg-raised)",
              border: `1px solid ${(dateFrom || dateTo) ? "rgba(99,102,241,0.5)" : "var(--border)"}`,
              borderRadius: 999, overflow: "hidden",
              boxShadow: (dateFrom || dateTo) ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
              padding: "4px 4px 4px 10px",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                color: (dateFrom || dateTo) ? "#818cf8" : "var(--fg-dim)",
                fontSize: 11, fontWeight: 600,
                paddingRight: 8, borderRight: "1px solid var(--border)",
                marginRight: 4, flexShrink: 0,
              }}>
                <CalendarDays size={12} />
                Down Time
              </div>
              <input
                type="date" value={dateFrom}
                onChange={(e) => handleDateFrom(e.target.value)}
                onKeyDown={(e) => e.preventDefault()}
                onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                style={{
                  background: "transparent", border: "none",
                  color: dateFrom ? "var(--fg)" : "var(--fg-faint)",
                  fontSize: 12, padding: "3px 6px",
                  outline: "none", cursor: "pointer", width: 118,
                }}
              />
              <span style={{ fontSize: 12, color: "var(--fg-faint)", padding: "0 2px", userSelect: "none" }}>→</span>
              <input
                type="date" value={dateTo}
                onChange={(e) => handleDateTo(e.target.value)}
                onKeyDown={(e) => e.preventDefault()}
                onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                style={{
                  background: "transparent", border: "none",
                  color: dateTo ? "var(--fg)" : "var(--fg-faint)",
                  fontSize: 12, padding: "3px 6px",
                  outline: "none", cursor: "pointer", width: 118,
                }}
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={clearDates}
                  title="Hapus filter tanggal"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "var(--bg-card)", border: "1px solid var(--border-strong)",
                    borderRadius: 999, color: "#f87171", cursor: "pointer",
                    padding: "3px 7px", marginLeft: 4,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                  }}
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Status */}
            <div style={{ display: "flex", gap: 4 }}>
              {(["all", "UP", "DOWN", "NOT FOUND"] as const).map((s) => {
                const clr = s === "UP" ? "#34d399" : s === "DOWN" ? "#f87171" : s === "NOT FOUND" ? "#fbbf24" : undefined;
                return filterBtn(s, status, s === "all" ? "Semua Status" : s, handleStatus, clr);
              })}
            </div>

            {/* Status Pengerjaan */}
            <div style={{ display: "flex", gap: 4 }}>
              {(["all", "belum", "pickup", "done"] as const).map((s) => (
                <button key={s} onClick={() => handleSp(s)} style={{
                  padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${statusPengerjaan === s ? "transparent" : "var(--border)"}`,
                  background: statusPengerjaan === s
                    ? s === "done"   ? "rgba(52,211,153,0.2)"
                    : s === "pickup" ? "rgba(251,191,36,0.2)"
                    : s === "belum"  ? "rgba(148,163,184,0.2)"
                    : "var(--accent-subtle)"
                    : "var(--bg-input)",
                  color: statusPengerjaan === s
                    ? s === "done"   ? "#34d399"
                    : s === "pickup" ? "#fbbf24"
                    : s === "belum"  ? "#94a3b8"
                    : "var(--accent)"
                    : "var(--fg-dim)",
                  transition: "all .15s",
                }}>
                  {s === "all" ? "Semua" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

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
              <span>{hasActiveFilter ? "Tidak ada data yang cocok." : "Belum ada data pengerjaan."}</span>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortTh col="order_id"          label="Order ID"         {...sortProps} />
                  <th>Tipe</th>
                  <th>Jenis</th>
                  <SortTh col="sto"               label="STO"              {...sortProps} />
                  <th>External</th>
                  <th>Speedy</th>
                  <SortTh col="status"            label="Status"           {...sortProps} />
                  <SortTh col="status_pengerjaan" label="Pengerjaan"       {...sortProps} />
                  <th>PIC</th>
                  <SortTh col="down_time"         label="Down Time"        {...sortProps} />
                  <SortTh col="pickup_time"       label="Pickup Time"      {...sortProps} />
                  <SortTh col="done_time"         label="Done Time"        {...sortProps} />
                  <th>Penyebab Loss</th>
                  <th>Segmen Infra</th>
                  <th>Actual Solution</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const eids: string[] = (() => { try { return row.evidence ? JSON.parse(row.evidence) : []; } catch { return []; } })();
                  return (
                    <tr key={row.order_id}>
                      <td className="td-id" style={{ fontVariantNumeric: "tabular-nums" }}>{row.order_id}</td>
                      <td>
                        <span className={`badge ${row.type === "IndiHome" ? "badge-type-home" : "badge-type-biz"}`}>
                          {row.type}
                        </span>
                      </td>
                      <td>
                        {row.order_type ? (
                          <span style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: row.order_type === "logic" ? "rgba(139,92,246,0.15)" : "rgba(20,184,166,0.15)",
                            color:      row.order_type === "logic" ? "#8b5cf6"               : "#14b8a6",
                          }}>
                            {row.order_type === "logic" ? "Logic" : "Fisik"}
                          </span>
                        ) : EMPTY}
                      </td>
                      <td>{row.sto      ?? EMPTY}</td>
                      <td>{row.external ?? EMPTY}</td>
                      <td>{row.speedy   ?? EMPTY}</td>
                      <td><StatusBadge status={row.status} /></td>
                      <td><SpBadge sp={row.status_pengerjaan} /></td>
                      <td style={{ fontSize: 12 }}>{row.pic ?? EMPTY}</td>
                      <td className="td-date" style={{ whiteSpace: "nowrap", fontSize: 11 }}>{fmtTs(row.down_time)   ?? EMPTY}</td>
                      <td className="td-date" style={{ whiteSpace: "nowrap", fontSize: 11 }}>{fmtTs(row.pickup_time) ?? EMPTY}</td>
                      <td className="td-date" style={{ whiteSpace: "nowrap", fontSize: 11 }}>{fmtTs(row.done_time)   ?? EMPTY}</td>
                      <td style={{ fontSize: 12 }}>{row.penyebab_loss ?? EMPTY}</td>
                      <td style={{ fontSize: 12 }}>{row.segmen_infra  ?? EMPTY}</td>
                      <td style={{ fontSize: 12, maxWidth: 180, whiteSpace: "normal" }}>{row.actsol ?? EMPTY}</td>
                      <td>
                        <button
                          onClick={() => openEvidence(row.evidence)}
                          title={eids.length > 0 ? `${eids.length} foto` : "Tidak ada evidence"}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            background: eids.length > 0 ? "rgba(59,130,246,0.12)" : "var(--bg-raised)",
                            border: `1px solid ${eids.length > 0 ? "rgba(59,130,246,0.3)" : "var(--border)"}`,
                            borderRadius: 7, padding: "4px 9px", cursor: "pointer",
                            color: eids.length > 0 ? "#60a5fa" : "var(--fg-faint)",
                            fontSize: 11, fontWeight: 600,
                          }}
                        >
                          <Images size={12} />
                          {eids.length > 0 ? eids.length : "—"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {data && (
          <Pagination page={page} totalPages={data.totalPages} total={data.total} limit={limit} onPage={goPage} />
        )}
      </div>
    </>
  );
}
