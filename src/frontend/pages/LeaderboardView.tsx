import { useState } from "react";
import { TrendingUp, Ticket, ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";

/* ── Dummy Data ─────────────────────────────────────────── */
const LEADERBOARD = [
  { rank: 1,  name: "Irfan Maulana",    tiket: 312, score: 9840 },
  { rank: 2,  name: "Dewi Kusuma",      tiket: 287, score: 8920 },
  { rank: 3,  name: "Rizky Fauzan",     tiket: 261, score: 8150 },
  { rank: 4,  name: "Budi Santoso",     tiket: 234, score: 7340 },
  { rank: 5,  name: "Siti Rahayu",      tiket: 218, score: 6880 },
  { rank: 6,  name: "Andi Pratama",     tiket: 196, score: 6120 },
  { rank: 7,  name: "Hendra Wijaya",    tiket: 181, score: 5670 },
  { rank: 8,  name: "Nurul Hidayah",    tiket: 165, score: 5210 },
  { rank: 9,  name: "Fajar Setiawan",   tiket: 148, score: 4730 },
  { rank: 10, name: "Kartika Sari",     tiket: 132, score: 4180 },
  { rank: 11, name: "Yoga Permana",     tiket: 117, score: 3650 },
  { rank: 12, name: "Mega Pratiwi",     tiket: 104, score: 3240 },
  { rank: 13, name: "Dimas Ardiansyah", tiket: 98,  score: 3010 },
  { rank: 14, name: "Putri Wulandari",  tiket: 91,  score: 2780 },
  { rank: 15, name: "Bagas Pramudya",   tiket: 85,  score: 2550 },
  { rank: 16, name: "Laila Fitriani",   tiket: 79,  score: 2320 },
  { rank: 17, name: "Rendi Kurniawan",  tiket: 72,  score: 2100 },
  { rank: 18, name: "Anisa Maharani",   tiket: 66,  score: 1890 },
  { rank: 19, name: "Taufik Hidayat",   tiket: 59,  score: 1670 },
  { rank: 20, name: "Yuliana Safitri",  tiket: 51,  score: 1450 },
];

const PAGE_SIZE = 10;
const FILTERS   = ["All Time", "Daily", "Weekly", "Monthly"];

const RANK_CFG = {
  1: { color: "#f59e0b", avatarBg: "linear-gradient(135deg,#78350f,#b45309)" },
  2: { color: "#94a3b8", avatarBg: "linear-gradient(135deg,#1e293b,#475569)" },
  3: { color: "#f97316", avatarBg: "linear-gradient(135deg,#431407,#9a3412)" },
} as const;

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function toHandle(name: string) {
  return "@" + name.toLowerCase().replace(/\s+/g, "_");
}
function fmtScore(n: number) {
  return n.toLocaleString("id-ID");
}
function fmtTiket(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
}

/* ── Top-3 card ─────────────────────────────────────────── */
function TopCard({ data, featured }: { data: typeof LEADERBOARD[0]; featured: boolean }) {
  const [copied, setCopied] = useState(false);
  const cfg      = RANK_CFG[data.rank as 1 | 2 | 3];
  const idString = `FFG-${String(data.rank).padStart(3, "0")}···${data.score}pts`;

  const handleCopy = () => {
    navigator.clipboard.writeText(idString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`lb-card${featured ? " featured" : ""}`}>
      {/* avatar + name */}
      <div className="lb-card-top">
        <div className="lb-card-avatar" style={{ background: cfg.avatarBg, color: cfg.color }}>
          {initials(data.name)}
          <span className="lb-card-rank-badge" style={{ background: cfg.color }}>
            #{data.rank}
          </span>
        </div>
        <div className="lb-card-info">
          <div className="lb-card-name">{data.name}</div>
          <div className="lb-card-handle">{toHandle(data.name)}</div>
        </div>
      </div>

      {/* stats */}
      <div className="lb-card-stats">
        <div className="lb-stat-col">
          <div className="lb-stat-label">Tiket</div>
          <div className="lb-stat-value">{data.tiket}</div>
        </div>
        <div className="lb-stat-col">
          <div className="lb-stat-label">Score</div>
          <div className="lb-stat-value" style={{ color: cfg.color }}>{fmtScore(data.score)}</div>
        </div>
        <div className="lb-stat-col">
          <div className="lb-stat-label">Growth</div>
          <div className="lb-stat-value" style={{ color: "var(--ok)" }}>
            +{(data.rank === 1 ? 12.4 : data.rank === 2 ? 9.8 : 7.2).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="lb-card-footer">
        <span className="lb-card-id">{idString}</span>
        <button className="lb-copy-btn" onClick={handleCopy}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Tersalin" : "Salin"}
        </button>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function LeaderboardView() {
  const [filter, setFilter] = useState("All Time");
  const [page,   setPage]   = useState(1);

  const top3 = LEADERBOARD.slice(0, 3);
  const rest  = LEADERBOARD.slice(3);

  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const paged      = rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* order: 2nd · 1st · 3rd */
  const cardOrder = [top3[1]!, top3[0]!, top3[2]!];

  return (
    <div className="lb-wrap">

      {/* Header */}
      <div className="lb-top-header">
        <h2 className="lb-title">Leaderboard</h2>
        <div className="lb-filter-tabs">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`lb-filter-tab${filter === f ? " active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 cards */}
      <div className="lb-top3-grid">
        {cardOrder.map((d) => (
          <TopCard key={d.rank} data={d} featured={d.rank === 1} />
        ))}
      </div>

      {/* Table ranks 4+ */}
      <div className="lb-table-wrap">
        <div className="lb-table-head">
          <span>Rank</span>
          <span>Nama</span>
          <span>Tiket</span>
          <span>Score</span>
          <span>Trend</span>
        </div>

        {paged.map((row) => (
          <div key={row.rank} className="lb-table-row">
            <span className="lb-rank-num">#{row.rank}</span>
            <span className="lb-row-name">
              <div className="lb-row-avatar">{initials(row.name)}</div>
              <div>
                <div>{row.name}</div>
                <div className="lb-row-handle">{toHandle(row.name)}</div>
              </div>
            </span>
            <span className="lb-row-tickets">
              <Ticket size={12} />
              {fmtTiket(row.tiket)}
            </span>
            <span className="lb-row-score">{fmtScore(row.score)}</span>
            <span className="lb-row-trend">
              <TrendingUp size={13} />
            </span>
          </div>
        ))}

        {/* Pagination */}
        <div className="lb-pagination">
          <span className="lb-pg-label">
            Peringkat {(page - 1) * PAGE_SIZE + 4}–{Math.min(page * PAGE_SIZE + 3, LEADERBOARD.length)} dari {LEADERBOARD.length}
          </span>
          <div className="lb-pg-controls">
            <button
              className="pg-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`pg-btn${page === p ? " active" : ""}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="pg-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
