import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context";
import {
  LayoutDashboard, Users, ShieldCheck, BarChart2, Settings,
  UserPlus, Activity, Zap, LogOut, TrendingUp, TrendingDown,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

/* ─── Dummy data ────────────────────────────────────── */
const WEEKLY = [
  { day: "Sen", registrasi: 12, aktif: 45 },
  { day: "Sel", registrasi: 8,  aktif: 38 },
  { day: "Rab", registrasi: 19, aktif: 62 },
  { day: "Kam", registrasi: 15, aktif: 55 },
  { day: "Jum", registrasi: 24, aktif: 78 },
  { day: "Sab", registrasi: 7,  aktif: 28 },
  { day: "Min", registrasi: 11, aktif: 41 },
];

const MONTHLY = [
  { bulan: "Okt", pengguna: 1240 },
  { bulan: "Nov", pengguna: 1580 },
  { bulan: "Des", pengguna: 1820 },
  { bulan: "Jan", pengguna: 2100 },
  { bulan: "Feb", pengguna: 2340 },
  { bulan: "Mar", pengguna: 2600 },
  { bulan: "Apr", pengguna: 2847 },
];

const STATUS_PIE = [
  { name: "Aktif",       value: 1980, color: "#34d399" },
  { name: "Menunggu",    value: 540,  color: "#fbbf24" },
  { name: "Tidak Aktif", value: 327,  color: "#f87171" },
];

const DUMMY_USERS = [
  { id: 1, name: "Irfan Maulana",  email: "imfaridzqi@gmail.com", nik: "225668",  status: "active",   joined: "2026-04-15" },
  { id: 2, name: "Budi Santoso",   email: "budi@example.com",     nik: "112233",  status: "active",   joined: "2026-04-14" },
  { id: 3, name: "Siti Rahayu",    email: "siti@example.com",     nik: "334455",  status: "pending",  joined: "2026-04-13" },
  { id: 4, name: "Andi Pratama",   email: "andi@example.com",     nik: "556677",  status: "active",   joined: "2026-04-12" },
  { id: 5, name: "Dewi Kusuma",    email: "dewi@example.com",     nik: "778899",  status: "inactive", joined: "2026-04-11" },
  { id: 6, name: "Rizky Fauzan",   email: "rizky@example.com",    nik: "990011",  status: "active",   joined: "2026-04-10" },
];

const STATS = [
  { label: "Total Pengguna",  value: "2,847", change: "+12%",  dir: "up",   Icon: Users },
  { label: "Aktif Hari Ini",  value: "384",   change: "+5%",   dir: "up",   Icon: Activity },
  { label: "Registrasi Baru", value: "47",    change: "+18%",  dir: "up",   Icon: UserPlus },
  { label: "Sesi Aktif",      value: "128",   change: "-3%",   dir: "down", Icon: Zap },
];

const NAV = [
  { id: "dashboard", Icon: LayoutDashboard, label: "Dashboard",  section: "menu" },
  { id: "users",     Icon: Users,           label: "Pengguna",   section: "menu" },
  { id: "security",  Icon: ShieldCheck,     label: "Keamanan",   section: "menu" },
  { id: "reports",   Icon: BarChart2,       label: "Laporan",    section: "menu" },
  { id: "settings",  Icon: Settings,        label: "Pengaturan", section: "bottom" },
];

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  active:   { cls: "badge-success", label: "Aktif" },
  pending:  { cls: "badge-warning", label: "Menunggu" },
  inactive: { cls: "badge-error",   label: "Nonaktif" },
};

/* ─── Custom tooltip ────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-strong)",
      borderRadius: "var(--radius)",
      padding: "10px 14px",
      fontSize: 13,
      boxShadow: "var(--shadow-md)",
    }}>
      <p style={{ color: "var(--text)", fontWeight: 600, marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value.toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
};

/* ─── Component ─────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { setLoggedIn } = useContext(AuthContext);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("session_token");
    if (!token) return;
    fetch("/api/users/current", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json: { data?: { name: string; email: string } }) => {
        if (json.data) setCurrentUser(json.data);
      })
      .catch(() => {});
  }, []);

  const mainNav   = NAV.filter((n) => n.section === "menu");
  const bottomNav = NAV.filter((n) => n.section === "bottom");

  const handleLogout = async () => {
    const token = sessionStorage.getItem("session_token");
    if (token) {
      await fetch("/api/users/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    setLoggedIn(false);
    navigate("/login");
  };

  const axisStyle = { fill: "var(--text-muted)", fontSize: 11 };

  return (
    <div className="dashboard-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo"><Logo /></div>

        <div className="sidebar-section">Menu</div>
        <nav className="sidebar-nav">
          {mainNav.map(({ id, Icon, label }) => (
            <button
              key={id}
              className={`nav-item${activeNav === id ? " active" : ""}`}
              onClick={() => setActiveNav(id)}
            >
              <span className="nav-item-icon"><Icon size={16} /></span>
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-section">Lainnya</div>
        <nav style={{ padding: "0 6px 8px" }}>
          {bottomNav.map(({ id, Icon, label }) => (
            <button
              key={id}
              className={`nav-item${activeNav === id ? " active" : ""}`}
              onClick={() => setActiveNav(id)}
            >
              <span className="nav-item-icon"><Icon size={16} /></span>
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
              {currentUser?.name?.slice(0, 2).toUpperCase() ?? "??"}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{currentUser?.name ?? "—"}</div>
              <div className="sidebar-user-email">{currentUser?.email ?? "—"}</div>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={handleLogout}
            style={{ width: "100%", marginTop: 8, fontSize: 13, gap: 8, justifyContent: "center" }}
          >
            <LogOut size={14} /> Keluar
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Selamat datang kembali, {currentUser?.name ?? "—"} 👋</p>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <div className="avatar">{currentUser?.name?.slice(0, 2).toUpperCase() ?? "??"}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {STATS.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-card-top">
                <span className="stat-label">{s.label}</span>
                <div className="stat-icon-wrap"><s.Icon size={16} /></div>
              </div>
              <div className="stat-value">{s.value}</div>
              <div className={`stat-change${s.dir === "down" ? " down" : ""}`}>
                {s.dir === "up"
                  ? <TrendingUp size={12} style={{ display: "inline", marginRight: 3 }} />
                  : <TrendingDown size={12} style={{ display: "inline", marginRight: 3 }} />
                }
                {s.change} <span style={{ color: "var(--text-muted)" }}>dari bulan lalu</span>
              </div>
            </div>
          ))}
        </div>

        {/* Row 1: Area chart + Pie chart */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14, marginBottom: 16 }}>

          {/* Area chart: registrasi & pengguna aktif per hari */}
          <div className="chart-card">
            <div className="chart-header">
              <span className="chart-title">Aktivitas 7 Hari Terakhir</span>
              <span className="chart-subtitle">Registrasi & pengguna aktif</span>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={WEEKLY} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gradReg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradAktif" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#34d399" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.07)" />
                  <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="registrasi" name="Registrasi"
                    stroke="#3b82f6" strokeWidth={2} fill="url(#gradReg)" dot={false} />
                  <Area type="monotone" dataKey="aktif" name="Aktif"
                    stroke="#34d399" strokeWidth={2} fill="url(#gradAktif)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie chart: status pengguna */}
          <div className="chart-card">
            <div className="chart-header">
              <span className="chart-title">Status Pengguna</span>
            </div>
            <div className="chart-body" style={{ padding: "10px 10px 0" }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={STATUS_PIE}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {STATUS_PIE.map((entry, i) => (
                      <Cell key={i} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Row 2: Bar chart growth + table */}
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 14, marginBottom: 16 }}>

          {/* Bar chart: pertumbuhan bulanan */}
          <div className="chart-card">
            <div className="chart-header">
              <span className="chart-title">Pertumbuhan Pengguna</span>
              <span className="chart-subtitle">6 bulan terakhir</span>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={195}>
                <BarChart data={MONTHLY} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.07)" vertical={false} />
                  <XAxis dataKey="bulan" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
                  <Bar dataKey="pengguna" name="Pengguna" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* User table */}
          <div className="table-card" style={{ marginBottom: 0 }}>
            <div className="table-header">
              <span className="table-title">Pengguna Terbaru</span>
              <span className="table-subtitle">{DUMMY_USERS.length} pengguna</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>NIK</th>
                  <th>Status</th>
                  <th>Bergabung</th>
                </tr>
              </thead>
              <tbody>
                {DUMMY_USERS.map((u) => (
                  <tr key={u.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{u.id}</td>
                    <td className="td-primary">{u.name}</td>
                    <td>{u.email}</td>
                    <td className="td-mono">{u.nik}</td>
                    <td>
                      <span className={`badge ${STATUS_MAP[u.status].cls}`}>
                        {STATUS_MAP[u.status].label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{u.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
