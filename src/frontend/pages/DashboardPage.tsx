import { useState, useContext, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context";
import {
  LayoutDashboard, Users, ShieldCheck, BarChart2, Settings,
  UserPlus, Activity, Zap, LogOut, TrendingUp, TrendingDown,
  PanelLeftClose, PanelLeftOpen, Menu, X, Upload,
} from "lucide-react";
import { isAdminOrManager } from "../app";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";
import ManageUsersView from "./ManageUsersView";
import UploadView from "./UploadView";

/* ── Data ────────────────────────────────────────────────── */
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
const USERS = [
  { id: 1, name: "Irfan Maulana", email: "imfaridzqi@gmail.com", nik: "225668", status: "active",   joined: "2026-04-15" },
  { id: 2, name: "Budi Santoso",  email: "budi@example.com",     nik: "112233", status: "active",   joined: "2026-04-14" },
  { id: 3, name: "Siti Rahayu",   email: "siti@example.com",     nik: "334455", status: "pending",  joined: "2026-04-13" },
  { id: 4, name: "Andi Pratama",  email: "andi@example.com",     nik: "556677", status: "active",   joined: "2026-04-12" },
  { id: 5, name: "Dewi Kusuma",   email: "dewi@example.com",     nik: "778899", status: "inactive", joined: "2026-04-11" },
  { id: 6, name: "Rizky Fauzan",  email: "rizky@example.com",    nik: "990011", status: "active",   joined: "2026-04-10" },
];
const STATS = [
  { label: "Total Pengguna",  value: "2,847", change: "+12%", up: true,  Icon: Users },
  { label: "Aktif Hari Ini",  value: "384",   change: "+5%",  up: true,  Icon: Activity },
  { label: "Registrasi Baru", value: "47",    change: "+18%", up: true,  Icon: UserPlus },
  { label: "Sesi Aktif",      value: "128",   change: "-3%",  up: false, Icon: Zap },
];
const NAV = [
  { id: "dashboard", Icon: LayoutDashboard, label: "Dashboard",  adminOnly: false },
  { id: "users",     Icon: Users,           label: "Pengguna",   adminOnly: true  },
  { id: "upload",    Icon: Upload,          label: "Upload Data", adminOnly: true  },
  { id: "security",  Icon: ShieldCheck,     label: "Keamanan",   adminOnly: false },
  { id: "reports",   Icon: BarChart2,       label: "Laporan",    adminOnly: false },
];
const NAV_BOTTOM = [
  { id: "settings", Icon: Settings, label: "Pengaturan" },
];
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active:   { label: "Aktif",    cls: "badge badge-success" },
  pending:  { label: "Menunggu", cls: "badge badge-warning" },
  inactive: { label: "Nonaktif", cls: "badge badge-error"   },
};

/* ── Sub-components ──────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-raised)", border: "1px solid var(--border-strong)",
      borderRadius: 10, padding: "12px 16px", boxShadow: "var(--shadow-md)",
      fontFamily: "var(--font-sans)", fontSize: 13,
    }}>
      {label && (
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          {label}
        </p>
      )}
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0, display: "inline-block" }} />
          <span style={{ color: "var(--fg-dim)" }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: "var(--fg)" }}>{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, change, up, Icon }: typeof STATS[0]) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <p className="stat-card-label">{label}</p>
        <div className="stat-icon"><Icon size={14} /></div>
      </div>
      <div>
        <p className="stat-value">{value}</p>
        <p className={`stat-trend ${up ? "up" : "down"}`}>
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {change}
          <span>vs bulan lalu</span>
        </p>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>;
}

function CardHead({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="card-head">
      <div>
        <p className="card-title">{title}</p>
        {subtitle && <p className="card-sub">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { setLoggedIn } = useContext(AuthContext);

  const [searchParams, setSearchParams]   = useSearchParams();
  const activeNav = searchParams.get("tab") ?? "dashboard";
  const setActiveNav = (id: string) => setSearchParams({ tab: id }, { replace: true });

  const [collapsed, setCollapsed]         = useState(false);
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [currentUser, setCurrentUser]     = useState<{ name: string; email: string; role: string } | null>(null);
  const [canManageUsers, setCanManageUsers] = useState(isAdminOrManager());

  useEffect(() => {
    const token = localStorage.getItem("session_token");
    if (!token) return;
    fetch("/api/users/current", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json: { data?: { name: string; email: string; role: string } }) => {
        if (json.data) {
          setCurrentUser(json.data);
          localStorage.setItem("user_role", json.data.role);
          setCanManageUsers(["Administrator", "Manager"].includes(json.data.role));
        }
      })
      .catch(() => {});
  }, []);

  const initials = currentUser?.name?.slice(0, 2).toUpperCase() ?? "??";

  const handleLogout = async () => {
    const token = localStorage.getItem("session_token");
    if (token) await fetch("/api/users/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    setLoggedIn(false);
    navigate("/login");
  };

  const axisProps = { fill: "var(--fg-faint)", fontSize: 11, fontFamily: "var(--font-sans)" };

  return (
    <div className="dashboard">

      {/* Mobile overlay */}
      <div
        className={`mobile-overlay${mobileOpen ? " show" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className={`sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>

        <div className="sidebar-header">
          {!collapsed && <Logo />}
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {!collapsed && <p className="nav-section-label">Menu</p>}
          {NAV.filter((n) => !n.adminOnly || canManageUsers).map(({ id, Icon, label }) => (
            <button
              key={id}
              className={`nav-link${activeNav === id ? " active" : ""}`}
              onClick={() => { setActiveNav(id); setMobileOpen(false); }}
              title={collapsed ? label : undefined}
            >
              <Icon size={16} />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && <p className="nav-section-label">Lainnya</p>}
          {NAV_BOTTOM.map(({ id, Icon, label }) => (
            <button
              key={id}
              className={`nav-link${activeNav === id ? " active" : ""}`}
              onClick={() => { setActiveNav(id); setMobileOpen(false); }}
              title={collapsed ? label : undefined}
            >
              <Icon size={16} />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}

          {!collapsed && currentUser && (
            <div className="sidebar-user">
              <div className="avatar">{initials}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{currentUser.name}</div>
                <div className="sidebar-user-email">{currentUser.role}</div>
              </div>
            </div>
          )}

          <button
            className="nav-link danger"
            onClick={handleLogout}
            title={collapsed ? "Keluar" : undefined}
          >
            <LogOut size={15} />
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <div className="main">

        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div>
              <div className="topbar-title">
                {NAV.find((n) => n.id === activeNav)?.label ?? NAV_BOTTOM.find((n) => n.id === activeNav)?.label ?? "Dashboard"}
              </div>
              <p className="topbar-sub">
                Selamat datang, <span>{currentUser?.name ?? "—"}</span>
              </p>
            </div>
          </div>
          <div className="topbar-right">
            <ThemeToggle fixed={false} />
            <div className="avatar avatar-lg">{initials}</div>
          </div>
        </header>

        <main className="content">

          {/* Admin-only views */}
          {activeNav === "users"  && <ManageUsersView />}
          {activeNav === "upload" && <UploadView />}

          {/* Dashboard content */}
          {activeNav !== "users" && activeNav !== "upload" && <>

          {/* Stats */}
          <div className="stat-grid">
            {STATS.map((s) => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Row 1: Area chart (wide) + Pie */}
          <div className="chart-grid">
            <Card>
              <CardHead title="Aktivitas 7 Hari Terakhir" subtitle="Registrasi & pengguna aktif" />
              <div style={{ padding: "20px 20px 12px" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={WEEKLY} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                    <defs>
                      <linearGradient id="gReg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gAktif" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#34d399" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.07)" />
                    <XAxis dataKey="day"  tick={axisProps} axisLine={false} tickLine={false} />
                    <YAxis              tick={axisProps} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="registrasi" name="Registrasi" stroke="#3b82f6" strokeWidth={2} fill="url(#gReg)"   dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="aktif"      name="Aktif"      stroke="#34d399" strokeWidth={2} fill="url(#gAktif)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHead title="Status Pengguna" />
              <div style={{ padding: 16 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={STATUS_PIE} cx="50%" cy="43%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                      {STATUS_PIE.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={7}
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(v) => <span style={{ color: "var(--fg-dim)" }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Row 2: Bar chart + Table (wide) */}
          <div className="chart-grid chart-grid-rev">
            <Card>
              <CardHead title="Pertumbuhan Pengguna" subtitle="6 bulan terakhir" />
              <div style={{ padding: "20px 20px 12px" }}>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={MONTHLY} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.07)" vertical={false} />
                    <XAxis dataKey="bulan" tick={axisProps} axisLine={false} tickLine={false} />
                    <YAxis               tick={axisProps} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(59,130,246,0.05)" }} />
                    <Bar dataKey="pengguna" name="Pengguna" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHead
                title="Pengguna Terbaru"
                right={
                  <span className="badge badge-success">{USERS.length} pengguna</span>
                }
              />
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      {["#", "Nama", "Email", "NIK", "Status", "Bergabung"].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {USERS.map((u) => {
                      const s = STATUS_MAP[u.status] ?? STATUS_MAP["inactive"]!;
                      return (
                        <tr key={u.id}>
                          <td className="td-id">{u.id}</td>
                          <td className="td-name">{u.name}</td>
                          <td className="td-email">{u.email}</td>
                          <td className="td-nik">{u.nik}</td>
                          <td><span className={s.cls}>{s.label}</span></td>
                          <td className="td-date">{u.joined}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          </>}

        </main>
      </div>
    </div>
  );
}
