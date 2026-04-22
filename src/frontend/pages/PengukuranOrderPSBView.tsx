import { useState, useEffect } from "react";
import { Database, TrendingUp, TrendingDown, SearchX } from "lucide-react";
import { BASE_PATH } from "../config";
import CombinedDataTable from "./CombinedDataTable";

interface Stats {
  total: number; up: number; down: number; notFound: number;
}

function StatCard({
  label, value, Icon, iconColor,
}: {
  label: string; value: string;
  Icon: React.ElementType; iconColor: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <p className="stat-card-label">{label}</p>
        <div className="stat-icon" style={{ background: `${iconColor}22`, color: iconColor }}>
          <Icon size={14} />
        </div>
      </div>
      <p className="stat-value">{value}</p>
    </div>
  );
}

export default function PengukuranOrderPSBView() {
  const [stats, setStats] = useState<Stats>({ total: 0, up: 0, down: 0, notFound: 0 });

  useEffect(() => {
    const token = localStorage.getItem("session_token") ?? "";
    fetch(`${BASE_PATH}/api/data/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json: { data?: Stats }) => {
        if (json.data) setStats(json.data);
      })
      .catch(() => {});
  }, []);

  const fmt = (n: number) => n.toLocaleString("id-ID");

  return (
    <>
      <div className="page-head">
        <div className="page-head-left">
          <span className="page-head-title">Pengukuran Order PSB</span>
          <span className="page-head-sub">Data pengukuran order PSB dari FFG IndiHome & IndiBiz</span>
        </div>
      </div>

      <div className="stat-grid" style={{ marginTop: 16 }}>
        <StatCard label="Total Data" value={fmt(stats.total)}    Icon={Database}     iconColor="#3b82f6" />
        <StatCard label="UP"         value={fmt(stats.up)}       Icon={TrendingUp}   iconColor="#34d399" />
        <StatCard label="DOWN"       value={fmt(stats.down)}     Icon={TrendingDown} iconColor="#f87171" />
        <StatCard label="Not Found"  value={fmt(stats.notFound)} Icon={SearchX}      iconColor="#fbbf24" />
      </div>

      <div style={{ marginTop: 16 }}>
        <CombinedDataTable />
      </div>
    </>
  );
}
