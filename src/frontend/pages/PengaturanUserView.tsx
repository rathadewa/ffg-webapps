import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, Pencil, Trash2, X,
  ChevronUp, ChevronDown,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Users,
} from "lucide-react";
import { BASE_PATH } from "../config";

interface UserFfg {
  id:         number;
  nama:       string;
  distrik:    string | null;
  hsa:        string | null;
  sto:        string | null;
  idTelegram: string | null;
}

interface PageResult {
  rows:       UserFfg[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

interface FormData {
  nama:       string;
  distrik:    string;
  hsa:        string;
  sto:        string;
  idTelegram: string;
}

const EMPTY_FORM: FormData = { nama: "", distrik: "", hsa: "", sto: "", idTelegram: "" };

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("session_token") ?? ""}` };
}

/* ── Modal ─────────────────────────────────────────────────── */
function Modal({ title, onClose, onSubmit, form, setForm, loading }: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  form: FormData;
  setForm: (f: FormData) => void;
  loading: boolean;
}) {
  const inp = (field: keyof FormData, label: string, placeholder?: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <input
        value={form[field]}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        placeholder={placeholder ?? label}
        style={{
          background: "var(--bg-input)", border: "1px solid var(--border)",
          borderRadius: 8, color: "var(--fg)", fontSize: 13,
          padding: "8px 12px", outline: "none", width: "100%", boxSizing: "border-box",
        }}
      />
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "var(--bg-raised)", border: "1px solid var(--border-strong)",
        borderRadius: 14, width: "100%", maxWidth: 480,
        boxShadow: "var(--shadow-lg)", padding: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: "var(--fg)" }}>{title}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-faint)", padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {inp("nama",       "Nama",        "Nama lengkap")}
          {inp("distrik",    "Distrik",     "Distrik")}
          {inp("hsa",        "HSA",         "Kode HSA")}
          {inp("sto",        "STO",         "Kode STO")}
          {inp("idTelegram", "ID Telegram", "@username")}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} style={{
            background: "none", border: "1px solid var(--border)",
            borderRadius: 8, color: "var(--fg-dim)", fontSize: 12, fontWeight: 600,
            padding: "8px 16px", cursor: "pointer",
          }}>Batal</button>
          <button onClick={onSubmit} disabled={loading || !form.nama.trim()} style={{
            background: "var(--accent)", border: "none",
            borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600,
            padding: "8px 16px", cursor: loading ? "not-allowed" : "pointer",
            opacity: loading || !form.nama.trim() ? 0.6 : 1,
          }}>
            {loading ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Confirm delete ─────────────────────────────────────────── */
function ConfirmModal({ name, onClose, onConfirm, loading }: {
  name: string; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "var(--bg-raised)", border: "1px solid var(--border-strong)",
        borderRadius: 14, width: "100%", maxWidth: 380,
        boxShadow: "var(--shadow-lg)", padding: 24,
      }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: "var(--fg)", marginBottom: 8 }}>Hapus User</p>
        <p style={{ fontSize: 13, color: "var(--fg-dim)", marginBottom: 20 }}>
          Hapus <strong>{name}</strong>? Tindakan ini tidak bisa dibatalkan.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "none", border: "1px solid var(--border)",
            borderRadius: 8, color: "var(--fg-dim)", fontSize: 12, fontWeight: 600,
            padding: "8px 16px", cursor: "pointer",
          }}>Batal</button>
          <button onClick={onConfirm} disabled={loading} style={{
            background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.4)",
            borderRadius: 8, color: "#f87171", fontSize: 12, fontWeight: 600,
            padding: "8px 16px", cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}>
            {loading ? "Menghapus…" : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Pagination ─────────────────────────────────────────────── */
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

/* ── Main ───────────────────────────────────────────────────── */
export default function PengaturanUserView() {
  const [data,    setData]    = useState<PageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [search,  setSearch]  = useState("");
  const [distrik, setDistrik] = useState("");
  const [sto,     setSto]     = useState("");
  const [page,    setPage]    = useState(1);
  const limit = 20;

  const [modal,   setModal]   = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<UserFfg | null>(null);
  const [form,    setForm]    = useState<FormData>(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserFfg | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const [formError, setFormError] = useState("");

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (p: number, s: string, d: string, st: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (s)  params.set("search",  s);
      if (d)  params.set("distrik", d);
      if (st) params.set("sto",     st);

      const res  = await fetch(`${BASE_PATH}/api/user-ffg?${params}`, { headers: authHeader() });
      const json = await res.json() as { data?: PageResult; error?: string };
      if (!res.ok) { setError(json.error ?? "Gagal memuat data."); return; }
      setData(json.data ?? null);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetchData(1, "", "", ""); }, [fetchData]);

  const reload = (p = page, s = search, d = distrik, st = sto) => fetchData(p, s, d, st);

  const debouncedReload = (p: number, s: string, d: string, st: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchData(p, s, d, st), 350);
  };

  const handleSearch  = (v: string) => { setSearch(v);  setPage(1); debouncedReload(1, v, distrik, sto); };
  const handleDistrik = (v: string) => { setDistrik(v); setPage(1); debouncedReload(1, search, v, sto);  };
  const handleSto     = (v: string) => { setSto(v);     setPage(1); debouncedReload(1, search, distrik, v); };
  const goPage        = (p: number) => { setPage(p);    reload(p);  };

  const hasFilter = search || distrik || sto;
  const resetFilters = () => {
    setSearch(""); setDistrik(""); setSto(""); setPage(1);
    fetchData(1, "", "", "");
  };

  const openAdd = () => { setForm(EMPTY_FORM); setFormError(""); setModal("add"); };
  const openEdit = (row: UserFfg) => {
    setEditing(row);
    setForm({ nama: row.nama, distrik: row.distrik ?? "", hsa: row.hsa ?? "", sto: row.sto ?? "", idTelegram: row.idTelegram ?? "" });
    setFormError("");
    setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.nama.trim()) { setFormError("Nama wajib diisi."); return; }
    setSaving(true);
    setFormError("");
    try {
      const body = {
        nama:       form.nama.trim(),
        distrik:    form.distrik.trim()    || undefined,
        hsa:        form.hsa.trim()        || undefined,
        sto:        form.sto.trim()        || undefined,
        idTelegram: form.idTelegram.trim() || undefined,
      };
      const url    = modal === "edit" ? `${BASE_PATH}/api/user-ffg/${editing!.id}` : `${BASE_PATH}/api/user-ffg`;
      const method = modal === "edit" ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setFormError(json.error ?? "Gagal menyimpan."); return; }
      closeModal();
      reload(page);
    } catch {
      setFormError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${BASE_PATH}/api/user-ffg/${deleteTarget.id}`, {
        method: "DELETE", headers: authHeader(),
      });
      setDeleteTarget(null);
      const newPage = data && data.rows.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      reload(newPage);
    } catch {
      setError("Gagal menghapus.");
    } finally {
      setDeleting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-input)", border: "1px solid var(--border)",
    borderRadius: 8, color: "var(--fg)", fontSize: 12,
    padding: "7px 10px", outline: "none",
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="card-head" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p className="card-title">Pengaturan User</p>
            <p className="card-sub">{data ? `${data.total.toLocaleString("id-ID")} total user` : "Memuat…"}</p>
          </div>
          <button onClick={openAdd} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "var(--accent)", border: "none",
            borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600,
            padding: "8px 14px", cursor: "pointer",
          }}>
            <Plus size={13} /> Tambah User
          </button>
        </div>

        {/* Filter row */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="search-wrap" style={{ minWidth: 180, maxWidth: 220 }}>
            <Search size={13} />
            <input className="search-input" type="text" placeholder="Cari nama…"
              value={search} onChange={(e) => handleSearch(e.target.value)} />
          </div>
          <div className="search-wrap" style={{ minWidth: 150, maxWidth: 190 }}>
            <Search size={13} />
            <input className="search-input" type="text" placeholder="Filter Distrik…"
              value={distrik} onChange={(e) => handleDistrik(e.target.value)} />
          </div>
          <div className="search-wrap" style={{ minWidth: 140, maxWidth: 180 }}>
            <Search size={13} />
            <input className="search-input" type="text" placeholder="Filter STO…"
              value={sto} onChange={(e) => handleSto(e.target.value)} />
          </div>
          {hasFilter && (
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

      {/* Error */}
      {error && <div className="alert alert-error" style={{ margin: "0 20px 12px" }}>{error}</div>}

      {/* Table */}
      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Memuat data…</div>
        ) : !data || data.rows.length === 0 ? (
          <div className="table-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 24px" }}>
            <Users size={32} style={{ opacity: 0.2 }} />
            <span>{hasFilter ? "Tidak ada user yang cocok." : "Belum ada data user."}</span>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Distrik</th>
                <th>HSA</th>
                <th>STO</th>
                <th>ID Telegram</th>
                <th style={{ textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, idx) => (
                <tr key={row.id}>
                  <td style={{ color: "var(--fg-faint)", fontSize: 12 }}>{(page - 1) * limit + idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{row.nama}</td>
                  <td>{row.distrik ?? <span style={{ color: "var(--fg-faint)" }}>—</span>}</td>
                  <td>{row.hsa     ?? <span style={{ color: "var(--fg-faint)" }}>—</span>}</td>
                  <td>{row.sto     ?? <span style={{ color: "var(--fg-faint)" }}>—</span>}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{row.idTelegram ?? <span style={{ color: "var(--fg-faint)" }}>—</span>}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button onClick={() => openEdit(row)} style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)",
                        borderRadius: 6, color: "#3b82f6", fontSize: 11, fontWeight: 600,
                        padding: "4px 10px", cursor: "pointer",
                      }}>
                        <Pencil size={11} /> Edit
                      </button>
                      <button onClick={() => setDeleteTarget(row)} style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
                        borderRadius: 6, color: "#f87171", fontSize: 11, fontWeight: 600,
                        padding: "4px 10px", cursor: "pointer",
                      }}>
                        <Trash2 size={11} /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && (
        <Pagination page={page} totalPages={data.totalPages} total={data.total} limit={limit} onPage={goPage} />
      )}

      {/* Modals */}
      {modal && (
        <Modal
          title={modal === "add" ? "Tambah User" : "Edit User"}
          onClose={closeModal}
          onSubmit={handleSave}
          form={form}
          setForm={setForm}
          loading={saving}
        />
      )}
      {formError && modal && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1001 }}>
          <div className="alert alert-error">{formError}</div>
        </div>
      )}
      {deleteTarget && (
        <ConfirmModal
          name={deleteTarget.nama}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
    </div>
  );
}
