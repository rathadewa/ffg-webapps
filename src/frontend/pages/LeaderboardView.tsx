import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, Ticket, ChevronLeft, ChevronRight, Clock, Trophy, X, CalendarDays } from "lucide-react";
import { BASE_PATH } from "../config";

/* ── Types ──────────────────────────────────────────────────── */
type OrderType = "logic" | "fisik";

interface LeaderboardEntry {
  rank:            number;
  nama:            string;
  userTelegram:    string | null;
  sto:             string | null;
  tiketDikerjakan: number;
  tiketDone:       number;
  tiketGagal:      number;
  avgPickupMenit:  number | null;
  avgDoneMenit:    number | null;
  trend:           "up" | "down" | "stable";
}

/* ── Constants ──────────────────────────────────────────────── */
const PAGE_SIZE = 10;

const FILTERS: { label: string; value: OrderType }[] = [
  { label: "Logic", value: "logic" },
  { label: "Fisik", value: "fisik" },
];

const RANK_CFG = {
  1: { color: "#f59e0b", avatarBg: "linear-gradient(135deg,#78350f,#b45309)" },
  2: { color: "#94a3b8", avatarBg: "linear-gradient(135deg,#1e293b,#475569)" },
  3: { color: "#f97316", avatarBg: "linear-gradient(135deg,#431407,#9a3412)" },
} as const;

/* ── Helpers ────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function fmtDuration(menit: number | null): string {
  if (menit === null) return "—";
  if (menit < 60) return `${menit} mnt`;
  const h = Math.floor(menit / 60);
  const m = menit % 60;
  return m > 0 ? `${h}j ${m}mnt` : `${h}j`;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up")     return <TrendingUp  size={13} style={{ color: "var(--ok)"    }} />;
  if (trend === "down")   return <TrendingDown size={13} style={{ color: "var(--error)" }} />;
  return                         <Minus        size={13} style={{ color: "var(--fg-faint)" }} />;
}

/* ── Top-3 card ─────────────────────────────────────────────── */
function TopCard({ data, featured }: { data: LeaderboardEntry; featured: boolean }) {
  const cfg = RANK_CFG[data.rank as 1 | 2 | 3];

  const avatarSize = featured ? 62 : 52;
  const nameFontSize = featured ? 16 : 15;
  const statValueFontSize = featured ? 16 : 14;

  return (
    <div className={`lb-card${featured ? " featured" : ""}`} style={featured ? {
      padding: 22,
      transform: "scale(1.03)",
      zIndex: 1,
    } : {}}>

      {featured && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "var(--bg-raised)", border: "1px solid var(--border)",
            borderRadius: 20, padding: "3px 10px",
            fontSize: 11, fontWeight: 700, color: "var(--fg-dim)", letterSpacing: "0.06em",
          }}>
            <Trophy size={12} /> PERINGKAT 1
          </span>
        </div>
      )}

      <div className="lb-card-top">
        <div className="lb-card-avatar" style={{
          background: cfg.avatarBg, color: cfg.color,
          width: avatarSize, height: avatarSize,
          fontSize: featured ? 22 : 16,
        }}>
          {initials(data.nama)}
          <span className="lb-card-rank-badge" style={{ background: cfg.color }}>#{data.rank}</span>
        </div>
        <div className="lb-card-info">
          <div className="lb-card-name" style={{ fontSize: nameFontSize }}>{data.nama}</div>
          <div className="lb-card-handle">{data.userTelegram ?? "—"}</div>
        </div>
      </div>

      <div className="lb-card-stats">
        <div className="lb-stat-col">
          <div className="lb-stat-label">Done</div>
          <div className="lb-stat-value" style={{ color: cfg.color, fontSize: statValueFontSize }}>{data.tiketDone}</div>
        </div>
        <div className="lb-stat-col">
          <div className="lb-stat-label">Dikerjakan</div>
          <div className="lb-stat-value" style={{ fontSize: statValueFontSize }}>{data.tiketDikerjakan}</div>
        </div>
        <div className="lb-stat-col">
          <div className="lb-stat-label">Trend</div>
          <div className="lb-stat-value"><TrendIcon trend={data.trend} /></div>
        </div>
      </div>

      <div className="lb-card-footer">
        <span className="lb-card-id" style={{ fontSize: 11 }}>
          <Clock size={10} style={{ marginRight: 4 }} />
          Avg done: {fmtDuration(data.avgDoneMenit)}
        </span>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function LeaderboardView() {
  const [orderType, setOrderType] = useState<OrderType>("logic");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [page,      setPage]      = useState(1);
  const [data,      setData]      = useState<LeaderboardEntry[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token  = localStorage.getItem("session_token") ?? "";
      const params = new URLSearchParams({ type: orderType });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const res   = await fetch(`${BASE_PATH}/api/leaderboard?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json  = await res.json() as { data?: LeaderboardEntry[]; error?: string };
      if (json.error) throw new Error(json.error);
      setData(json.data ?? []);
      setPage(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [orderType, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const top3      = data.slice(0, 3);
  const rest      = data.slice(3);
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const paged      = rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const cardOrder  = top3.length === 3
    ? [top3[1]!, top3[0]!, top3[2]!]
    : top3;

  return (
    <div className="lb-wrap">

      {/* Header */}
      <div className="lb-top-header" style={{ flexWrap: "wrap", gap: 12 }}>
        <h2 className="lb-title">Leaderboard</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

          {/* Date range pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 0,
            background: "var(--bg-raised)",
            border: `1px solid ${(dateFrom || dateTo) ? "rgba(99,102,241,0.5)" : "var(--border)"}`,
            borderRadius: 999,
            overflow: "hidden",
            boxShadow: (dateFrom || dateTo) ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
            padding: "4px 4px 4px 12px",
          }}>
            {/* Icon + label */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              color: (dateFrom || dateTo) ? "#818cf8" : "var(--fg-dim)",
              fontSize: 12, fontWeight: 600,
              paddingRight: 10,
              borderRight: "1px solid var(--border)",
              marginRight: 4,
              flexShrink: 0,
            }}>
              <CalendarDays size={13} />
              Filter Periode
            </div>

            {/* From */}
            <input
              type="date" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              onKeyDown={(e) => e.preventDefault()}
              onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
              style={{
                background: "transparent", border: "none",
                color: dateFrom ? "var(--fg)" : "var(--fg-faint)",
                fontSize: 12, padding: "4px 6px",
                outline: "none", cursor: "pointer", width: 120,
              }}
            />

            {/* Separator */}
            <span style={{
              fontSize: 12, color: "var(--fg-faint)",
              padding: "0 2px", userSelect: "none",
            }}>→</span>

            {/* To */}
            <input
              type="date" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              onKeyDown={(e) => e.preventDefault()}
              onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
              style={{
                background: "transparent", border: "none",
                color: dateTo ? "var(--fg)" : "var(--fg-faint)",
                fontSize: 12, padding: "4px 6px",
                outline: "none", cursor: "pointer", width: 120,
              }}
            />

            {/* Clear button */}
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                title="Hapus filter tanggal"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 999,
                  color: "#f87171", cursor: "pointer",
                  padding: "4px 8px",
                  marginLeft: 4,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                  transition: "background 0.15s",
                }}
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Type tabs */}
          <div className="lb-filter-tabs">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                className={`lb-filter-tab${orderType === f.value ? " active" : ""}`}
                onClick={() => setOrderType(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-faint)", fontSize: 14 }}>
          Memuat data...
        </div>
      )}

      {error && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--error)", fontSize: 14 }}>
          Gagal memuat: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Top 3 cards — order: 2nd · 1st · 3rd */}
          {cardOrder.length > 0 && (
            <div className="lb-top3-grid" style={{ alignItems: "center" }}>
              {cardOrder.map((d) => (
                <TopCard key={d.rank} data={d} featured={d.rank === 1} />
              ))}
            </div>
          )}

          {/* Table rank 4+ */}
          {paged.length > 0 && (
            <div className="lb-table-wrap">
              <div className="lb-table-head" style={{ gridTemplateColumns: "3rem 1fr 4rem 4rem 4rem 5rem 5rem 3rem" }}>
                <span>Rank</span>
                <span>Nama</span>
                <span style={{ textAlign: "center" }}>Dikerjakan</span>
                <span style={{ textAlign: "center" }}>Done</span>
                <span style={{ textAlign: "center" }}>Gagal</span>
                <span style={{ textAlign: "center" }}>Avg Pickup</span>
                <span style={{ textAlign: "center" }}>Avg Done</span>
                <span style={{ textAlign: "center" }}>Trend</span>
              </div>

              {paged.map((row) => (
                <div key={row.rank} className="lb-table-row" style={{ gridTemplateColumns: "3rem 1fr 4rem 4rem 4rem 5rem 5rem 3rem" }}>
                  <span className="lb-rank-num">#{row.rank}</span>
                  <span className="lb-row-name">
                    <div className="lb-row-avatar">{initials(row.nama)}</div>
                    <div>
                      <div>{row.nama}</div>
                      <div className="lb-row-handle">{row.userTelegram ?? "—"}</div>
                    </div>
                  </span>
                  <span style={{ textAlign: "center" }}>
                    <span className="lb-row-tickets"><Ticket size={12} />{row.tiketDikerjakan}</span>
                  </span>
                  <span style={{ textAlign: "center", color: "var(--ok)", fontWeight: 600 }}>{row.tiketDone}</span>
                  <span style={{ textAlign: "center", color: row.tiketGagal > 0 ? "var(--error)" : "var(--fg-faint)" }}>{row.tiketGagal}</span>
                  <span style={{ textAlign: "center", fontSize: 12, color: "var(--fg-dim)" }}>{fmtDuration(row.avgPickupMenit)}</span>
                  <span style={{ textAlign: "center", fontSize: 12, color: "var(--fg-dim)" }}>{fmtDuration(row.avgDoneMenit)}</span>
                  <span className="lb-row-trend" style={{ justifyContent: "center" }}>
                    <TrendIcon trend={row.trend} />
                  </span>
                </div>
              ))}

              {/* Pagination */}
              <div className="lb-pagination">
                <span className="lb-pg-label">
                  Peringkat {(page - 1) * PAGE_SIZE + 4}–{Math.min(page * PAGE_SIZE + 3, data.length)} dari {data.length}
                </span>
                <div className="lb-pg-controls">
                  <button className="pg-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} className={`pg-btn${page === p ? " active" : ""}`} onClick={() => setPage(p)}>
                      {p}
                    </button>
                  ))}
                  <button className="pg-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {data.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--fg-faint)", fontSize: 14 }}>
              Belum ada data leaderboard.
            </div>
          )}
        </>
      )}

    </div>
  );
}
