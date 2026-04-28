import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, Ticket, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { BASE_PATH } from "../config";

/* ── Types ──────────────────────────────────────────────────── */
type Period = "all" | "daily" | "weekly" | "monthly";

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

const FILTERS: { label: string; value: Period }[] = [
  { label: "All Time", value: "all"     },
  { label: "Daily",    value: "daily"   },
  { label: "Weekly",   value: "weekly"  },
  { label: "Monthly",  value: "monthly" },
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

  return (
    <div className={`lb-card${featured ? " featured" : ""}`}>
      <div className="lb-card-top">
        <div className="lb-card-avatar" style={{ background: cfg.avatarBg, color: cfg.color }}>
          {initials(data.nama)}
          <span className="lb-card-rank-badge" style={{ background: cfg.color }}>#{data.rank}</span>
        </div>
        <div className="lb-card-info">
          <div className="lb-card-name">{data.nama}</div>
          <div className="lb-card-handle">{data.userTelegram ?? "—"}</div>
        </div>
      </div>

      <div className="lb-card-stats">
        <div className="lb-stat-col">
          <div className="lb-stat-label">Done</div>
          <div className="lb-stat-value" style={{ color: cfg.color }}>{data.tiketDone}</div>
        </div>
        <div className="lb-stat-col">
          <div className="lb-stat-label">Dikerjakan</div>
          <div className="lb-stat-value">{data.tiketDikerjakan}</div>
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
  const [period,  setPeriod]  = useState<Period>("all");
  const [page,    setPage]    = useState(1);
  const [data,    setData]    = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("session_token") ?? "";
      const res   = await fetch(`${BASE_PATH}/api/leaderboard?period=${period}`, {
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
  }, [period]);

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
      <div className="lb-top-header">
        <h2 className="lb-title">Leaderboard</h2>
        <div className="lb-filter-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`lb-filter-tab${period === f.value ? " active" : ""}`}
              onClick={() => setPeriod(f.value)}
            >
              {f.label}
            </button>
          ))}
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
            <div className="lb-top3-grid">
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
