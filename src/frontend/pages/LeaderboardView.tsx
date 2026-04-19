import { useState } from "react";
import { Trophy, Medal, Star, Flame, TrendingUp, Ticket, ChevronLeft, ChevronRight } from "lucide-react";

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

/* ── Medal config ───────────────────────────────────────── */
const MEDALS = [
  {
    rank: 1,
    color:  "#f59e0b",
    glow:   "rgba(245,158,11,0.45)",
    bg:     "linear-gradient(145deg,#78350f 0%,#92400e 40%,#b45309 100%)",
    ring:   "#f59e0b",
    label:  "GOLD",
    size:   "lb-podium-1",
    height: "180px",
  },
  {
    rank: 2,
    color:  "#94a3b8",
    glow:   "rgba(148,163,184,0.35)",
    bg:     "linear-gradient(145deg,#1e293b 0%,#334155 40%,#475569 100%)",
    ring:   "#94a3b8",
    label:  "SILVER",
    size:   "lb-podium-2",
    height: "140px",
  },
  {
    rank: 3,
    color:  "#f97316",
    glow:   "rgba(249,115,22,0.35)",
    bg:     "linear-gradient(145deg,#431407 0%,#7c2d12 40%,#9a3412 100%)",
    ring:   "#f97316",
    label:  "BRONZE",
    size:   "lb-podium-3",
    height: "110px",
  },
];

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function fmtScore(n: number) {
  return n.toLocaleString("id-ID");
}

/* ── Podium card ────────────────────────────────────────── */
function PodiumCard({ data, cfg }: { data: typeof LEADERBOARD[0]; cfg: typeof MEDALS[0] }) {
  const isFirst = cfg.rank === 1;
  return (
    <div className={`lb-podium-card ${cfg.size}`} style={{ "--medal-ring": cfg.ring, "--medal-glow": cfg.glow } as React.CSSProperties}>
      {isFirst && <div className="lb-crown">👑</div>}
      <div className="lb-avatar-wrap" style={{ borderColor: cfg.ring, boxShadow: `0 0 20px ${cfg.glow}, 0 0 40px ${cfg.glow}` }}>
        <div className="lb-avatar" style={{ background: cfg.bg, color: cfg.color }}>
          {initials(data.name)}
        </div>
      </div>
      <div className="lb-medal-badge" style={{ background: cfg.color, color: "#000" }}>
        {cfg.rank === 1 ? <Trophy size={10} /> : <Medal size={10} />}
        {cfg.label}
      </div>
      <div className="lb-podium-name">{data.name}</div>
      <div className="lb-podium-score" style={{ color: cfg.color }}>{fmtScore(data.score)}</div>
      <div className="lb-podium-tickets">
        <Ticket size={11} />
        {data.tiket} tiket
      </div>
      <div className="lb-podium-base" style={{ height: cfg.height, background: cfg.bg, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 20px ${cfg.glow}` }}>
        <span className="lb-podium-rank" style={{ color: cfg.color }}>#{cfg.rank}</span>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function LeaderboardView() {
  const [page, setPage] = useState(1);

  const top3 = LEADERBOARD.slice(0, 3);
  const rest  = LEADERBOARD.slice(3);

  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const paged      = rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* reorder podium: 2nd, 1st, 3rd */
  const podiumOrder = [top3[1]!, top3[0]!, top3[2]!];
  const podiumCfg   = [MEDALS[1]!, MEDALS[0]!, MEDALS[2]!];

  return (
    <div className="lb-wrap">

      {/* Header */}
      <div className="lb-header">
        <div className="lb-header-icon"><Flame size={22} /></div>
        <div>
          <h2 className="lb-title">Leaderboard</h2>
          <p className="lb-subtitle">Ranking agen berdasarkan score tertinggi bulan ini</p>
        </div>
        <div className="lb-header-badge">
          <Star size={12} />
          Live Ranking
        </div>
      </div>

      {/* Podium */}
      <div className="lb-podium-stage">
        <div className="lb-podium-glow" />
        <div className="lb-podium-row">
          {podiumOrder.map((d, i) => (
            <PodiumCard key={d.rank} data={d} cfg={podiumCfg[i]!} />
          ))}
        </div>
      </div>

      {/* Rest of the table */}
      <div className="lb-table-wrap">
        <div className="lb-table-head">
          <span>Rank</span>
          <span>Nama</span>
          <span>Total Tiket</span>
          <span>Score</span>
          <span>Trend</span>
        </div>

        {paged.map((row) => (
          <div key={row.rank} className="lb-table-row">
            <span className="lb-rank-num">#{row.rank}</span>
            <span className="lb-row-name">
              <div className="lb-row-avatar">{initials(row.name)}</div>
              {row.name}
            </span>
            <span className="lb-row-tickets">
              <Ticket size={12} />
              {row.tiket}
            </span>
            <span className="lb-row-score">{fmtScore(row.score)}</span>
            <span className="lb-row-trend">
              <TrendingUp size={13} />
            </span>
          </div>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
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
        )}
      </div>

    </div>
  );
}
