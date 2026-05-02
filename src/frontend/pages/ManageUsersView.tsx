import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Plus, Pencil, Trash2, X, UserCheck, UserX,
  ChevronLeft, ChevronRight, Shield, Users, User as UserIcon,
} from "lucide-react";
import { BASE_PATH } from "../config";

type UserRole = "Superuser" | "Administrator" | "Agent" | "Teknisi";
const ALL_ROLES: UserRole[]   = ["Superuser", "Administrator", "Agent", "Teknisi"];
const ADMIN_ROLES: UserRole[] = ["Administrator", "Agent", "Teknisi"];

const ADMIN_GROUP: UserRole[] = ["Superuser", "Administrator"];
const FIELD_GROUP: UserRole[] = ["Agent", "Teknisi"];
const FIELD_ROLES = new Set<UserRole>(["Agent", "Teknisi"]);

const PAGE_SIZE = 10;

interface User {
  id:         number;
  name:       string;
  email:      string;
  nik:        number | null;
  role:       UserRole;
  twoFaSetup: boolean;
  createdAt:  string;
  distrik:    string | null;
  hsa:        string | null;
  sto:        string | null;
  idTelegram: string | null;
}

interface FormData {
  name:       string;
  email:      string;
  nik:        string;
  password:   string;
  role:       UserRole;
  distrik:    string;
  hsa:        string;
  sto:        string;
  idTelegram: string;
}

const EMPTY_FORM: FormData = {
  name: "", email: "", nik: "", password: "", role: "Agent",
  distrik: "", hsa: "", sto: "", idTelegram: "",
};

const ROLE_BADGE: Record<UserRole, string> = {
  Superuser:     "badge badge-purple",
  Administrator: "badge badge-error",
  Agent:         "badge badge-success",
  Teknisi:       "badge",
};

const EMPTY = <span style={{ color: "var(--fg-faint)" }}>—</span>;

function authHeader() {
  const token = localStorage.getItem("session_token") ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

/* ── Pagination ────────────────────────────────────────────── */
function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, total);
  if (totalPages <= 1 && total <= PAGE_SIZE) return null;
  return (
    <div className="pagination">
      <span className="pagination-info">
        {total === 0 ? "Tidak ada data" : `${from}–${to} dari ${total} pengguna`}
      </span>
      <div className="pagination-btns">
        <button className="pg-btn" onClick={() => onPage(page - 1)} disabled={page <= 1}><ChevronLeft size={12} /></button>
        <span className="pg-label">Hal {page} / {totalPages}</span>
        <button className="pg-btn" onClick={() => onPage(page + 1)} disabled={page >= totalPages}><ChevronRight size={12} /></button>
      </div>
    </div>
  );
}

/* ── Field wrapper ─────────────────────────────────────────── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {hint && <span style={{ color: "var(--fg-faint)", fontWeight: 400, marginLeft: 4 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/* ── Create / Edit Modal ───────────────────────────────────── */
function UserModal({
  mode, initial, onClose, onSaved,
}: { mode: "create" | "edit"; initial?: User; onClose: () => void; onSaved: () => void }) {
  const isSuperuser    = localStorage.getItem("user_role") === "Superuser";
  const availableRoles = isSuperuser ? ALL_ROLES : ADMIN_ROLES;

  const [form, setForm] = useState<FormData>(
    initial
      ? {
          name:       initial.name,
          email:      initial.email,
          nik:        String(initial.nik ?? ""),
          password:   "",
          role:       initial.role,
          distrik:    initial.distrik    ?? "",
          hsa:        initial.hsa        ?? "",
          sto:        initial.sto        ?? "",
          idTelegram: initial.idTelegram ?? "",
        }
      : EMPTY_FORM
  );
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  const isFieldRole = FIELD_ROLES.has(form.role);

  const setField = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setError("");
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Nama dan email wajib diisi."); return;
    }
    if (mode === "create" && !form.password) {
      setError("Password wajib diisi untuk pengguna baru."); return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name:  form.name.trim(),
        email: form.email.trim(),
        role:  form.role,
      };
      if (form.nik)      body.nik      = Number(form.nik);
      if (form.password) body.password = form.password;
      if (isFieldRole) {
        body.distrik    = form.distrik.trim()    || undefined;
        body.hsa        = form.hsa.trim()        || undefined;
        body.sto        = form.sto.trim()        || undefined;
        body.idTelegram = form.idTelegram.trim() || undefined;
      }

      const url    = mode === "create" ? `${BASE_PATH}/api/users/admin` : `${BASE_PATH}/api/users/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res    = await fetch(url, { method, headers: authHeader(), body: JSON.stringify(body) });
      const json   = await res.json() as { data?: string; error?: string };
      if (!res.ok) { setError(json.error ?? "Gagal menyimpan."); return; }
      onSaved();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {/* Header — sama gaya card-head */}
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "var(--accent-subtle)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <UserIcon size={15} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                {mode === "create" ? "Tambah Pengguna Baru" : "Edit Pengguna"}
              </h2>
              <p style={{ fontSize: 11, color: "var(--fg-faint)", margin: 0 }}>
                {mode === "create" ? "Isi detail pengguna baru" : `ID #${initial?.id} · ${initial?.role}`}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={14} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            {/* Nama + Role */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Nama Lengkap">
                <input className="field-input" type="text" placeholder="Nama lengkap" value={form.name} onChange={setField("name")} />
              </Field>
              <Field label="Role">
                <select className="field-input" value={form.role} onChange={setField("role")}>
                  {availableRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            {/* Email + NIK */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Email">
                <input className="field-input" type="email" placeholder="email@example.com" value={form.email} onChange={setField("email")} />
              </Field>
              <Field label="NIK" hint="(opsional)">
                <input className="field-input" type="number" placeholder="123456" value={form.nik} onChange={setField("nik")} />
              </Field>
            </div>

            {/* Password */}
            <Field label="Password" hint={mode === "edit" ? "(kosongkan jika tidak diubah)" : undefined}>
              <input
                className="field-input" type="password"
                placeholder={mode === "edit" ? "••••••••" : "Min. 8 karakter"}
                value={form.password} onChange={setField("password")}
              />
            </Field>

            {/* Field khusus Agent / Teknisi */}
            {isFieldRole && (
              <>
                <div style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: 14,
                  fontSize: 11, fontWeight: 700,
                  color: "var(--fg-faint)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}>
                  Informasi Lapangan
                </div>

                {/* Distrik + HSA */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Distrik">
                    <input className="field-input" type="text" placeholder="Nama distrik" value={form.distrik} onChange={setField("distrik")} />
                  </Field>
                  <Field label="HSA">
                    <input className="field-input" type="text" placeholder="Nama HSA" value={form.hsa} onChange={setField("hsa")} />
                  </Field>
                </div>

                {/* STO + ID Telegram */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="STO">
                    <input className="field-input" type="text" placeholder="Nama STO" value={form.sto} onChange={setField("sto")} />
                  </Field>
                  <Field label="ID Telegram">
                    <input className="field-input" type="text" placeholder="@username" value={form.idTelegram} onChange={setField("idTelegram")} />
                  </Field>
                </div>
              </>
            )}
          </div>

          <div className="modal-foot">
            <button type="button" className="btn-ghost-sm" onClick={onClose}>Batal</button>
            <button type="submit" className="btn-submit" disabled={saving}>
              {saving ? "Menyimpan…" : mode === "create" ? "Tambah Pengguna" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Delete Confirm ────────────────────────────────────────── */
function DeleteModal({ user, onClose, onDeleted }: { user: User; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res  = await fetch(`${BASE_PATH}/api/users/${user.id}`, { method: "DELETE", headers: authHeader() });
      const json = await res.json() as { data?: string; error?: string };
      if (!res.ok) { setError(json.error ?? "Gagal menghapus."); return; }
      onDeleted();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Hapus Pengguna</h2>
          <button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={14} /></button>
        </div>
        <div className="confirm-body">
          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
          Apakah kamu yakin ingin menghapus pengguna{" "}
          <span className="confirm-name">{user.name}</span>?{" "}
          Tindakan ini tidak dapat dibatalkan.
        </div>
        <div className="modal-foot">
          <button className="btn-ghost-sm" onClick={onClose}>Batal</button>
          <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Menghapus…" : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Action buttons ────────────────────────────────────────── */
function ActionCell({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="btn-actions-cell">
      <button className="btn-action btn-action-edit" onClick={onEdit}><Pencil size={11} /> Edit</button>
      <button className="btn-action btn-action-delete" onClick={onDelete}><Trash2 size={11} /> Hapus</button>
    </div>
  );
}

/* ── Main View ─────────────────────────────────────────────── */
export default function ManageUsersView() {
  const [users,    setUsers]    = useState<User[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<"create" | "edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<User | null>(null);

  const [adminPage, setAdminPage] = useState(1);

  const [fieldSearch, setFieldSearch] = useState("");
  const [fieldHsa,    setFieldHsa]    = useState("");
  const [fieldSto,    setFieldSto]    = useState("");
  const [fieldPage,   setFieldPage]   = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("session_token") ?? "";
      const res   = await fetch(`${BASE_PATH}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
      const json  = await res.json() as { data?: User[] };
      if (json.data) setUsers(json.data);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const adminUsers = useMemo(() => users.filter((u) => ADMIN_GROUP.includes(u.role)), [users]);
  const fieldUsers = useMemo(() => users.filter((u) => FIELD_GROUP.includes(u.role)), [users]);

  const hsaOptions = useMemo(
    () => [...new Set(fieldUsers.map((u) => u.hsa).filter(Boolean) as string[])].sort(),
    [fieldUsers]
  );
  const stoOptions = useMemo(
    () => [...new Set(fieldUsers.map((u) => u.sto).filter(Boolean) as string[])].sort(),
    [fieldUsers]
  );

  const filteredField = useMemo(() => fieldUsers.filter((u) => {
    const q = fieldSearch.toLowerCase();
    return (
      (!q       || u.name.toLowerCase().includes(q)) &&
      (!fieldHsa || u.hsa === fieldHsa) &&
      (!fieldSto || u.sto === fieldSto)
    );
  }), [fieldUsers, fieldSearch, fieldHsa, fieldSto]);

  useEffect(() => { setFieldPage(1); }, [fieldSearch, fieldHsa, fieldSto]);

  const pagedAdmin = adminUsers.slice((adminPage - 1) * PAGE_SIZE, adminPage * PAGE_SIZE);
  const pagedField = filteredField.slice((fieldPage - 1) * PAGE_SIZE, fieldPage * PAGE_SIZE);

  const openEdit   = (u: User) => { setSelected(u); setModal("edit"); };
  const openDelete = (u: User) => { setSelected(u); setModal("delete"); };
  const closeModal = () => { setModal(null); setSelected(null); };
  const afterSave  = () => { closeModal(); fetchUsers(); };

  const selectStyle: React.CSSProperties = {
    background: "var(--bg-input)", border: "1px solid var(--border)",
    borderRadius: 8, color: "var(--fg)", fontSize: 12, padding: "7px 10px",
    outline: "none", cursor: "pointer",
  };

  return (
    <>
      {/* ── Page header ───────────────────────────────────── */}
      <div className="page-head">
        <div className="page-head-left">
          <span className="page-head-title">Kelola Pengguna</span>
          <span className="page-head-sub">{users.length} pengguna terdaftar</span>
        </div>
        <button className="btn-add" onClick={() => setModal("create")}>
          <Plus size={15} /> Tambah Pengguna
        </button>
      </div>

      {/* ── Tabel 1: Administrator & Superuser ────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <div>
            <p className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Shield size={14} style={{ color: "var(--accent)" }} />
              Administrator &amp; Superuser
            </p>
            <p className="card-sub">{adminUsers.length} pengguna</p>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="table-empty">Memuat data…</div>
          ) : adminUsers.length === 0 ? (
            <div className="table-empty">Belum ada pengguna di grup ini.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {["#", "Nama", "Email", "NIK", "Role", "2FA", "Bergabung", "Aksi"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedAdmin.map((u) => (
                  <tr key={u.id}>
                    <td className="td-id">{u.id}</td>
                    <td className="td-name">{u.name}</td>
                    <td className="td-email">{u.email}</td>
                    <td className="td-nik">{u.nik ?? EMPTY}</td>
                    <td><span className={ROLE_BADGE[u.role] ?? "badge"}>{u.role}</span></td>
                    <td>
                      {u.twoFaSetup
                        ? <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><UserCheck size={11} /> Aktif</span>
                        : <span className="badge badge-warning" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><UserX size={11} /> Belum</span>}
                    </td>
                    <td className="td-date">{formatDate(u.createdAt)}</td>
                    <td><ActionCell onEdit={() => openEdit(u)} onDelete={() => openDelete(u)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pager page={adminPage} total={adminUsers.length} onPage={setAdminPage} />
      </div>

      {/* ── Tabel 2: Agent & Teknisi ───────────────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Users size={14} style={{ color: "var(--accent)" }} />
                Agent &amp; Teknisi
              </p>
              <p className="card-sub">{filteredField.length} dari {fieldUsers.length} pengguna</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div className="search-wrap" style={{ minWidth: 180, maxWidth: 240 }}>
              <Search size={13} />
              <input
                className="search-input" type="text" placeholder="Cari nama…"
                value={fieldSearch} onChange={(e) => setFieldSearch(e.target.value)}
              />
            </div>

            <select style={selectStyle} value={fieldHsa} onChange={(e) => setFieldHsa(e.target.value)}>
              <option value="">Semua HSA</option>
              {hsaOptions.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>

            <select style={selectStyle} value={fieldSto} onChange={(e) => setFieldSto(e.target.value)}>
              <option value="">Semua STO</option>
              {stoOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            {(fieldSearch || fieldHsa || fieldSto) && (
              <button
                onClick={() => { setFieldSearch(""); setFieldHsa(""); setFieldSto(""); }}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
                  borderRadius: 8, color: "#f87171", fontSize: 11, fontWeight: 600,
                  padding: "6px 10px", cursor: "pointer",
                }}
              >
                <X size={12} /> Reset Filter
              </button>
            )}
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="table-empty">Memuat data…</div>
          ) : pagedField.length === 0 ? (
            <div className="table-empty">
              {fieldSearch || fieldHsa || fieldSto
                ? "Tidak ada pengguna yang cocok dengan filter."
                : "Belum ada pengguna di grup ini."}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {["#", "Nama", "Email", "NIK", "Role", "Distrik", "HSA", "STO", "ID Telegram", "2FA", "Bergabung", "Aksi"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedField.map((u) => (
                  <tr key={u.id}>
                    <td className="td-id">{u.id}</td>
                    <td className="td-name">{u.name}</td>
                    <td className="td-email">{u.email}</td>
                    <td className="td-nik">{u.nik ?? EMPTY}</td>
                    <td><span className={ROLE_BADGE[u.role] ?? "badge"}>{u.role}</span></td>
                    <td style={{ fontSize: 12 }}>{u.distrik    ?? EMPTY}</td>
                    <td style={{ fontSize: 12 }}>{u.hsa        ?? EMPTY}</td>
                    <td style={{ fontSize: 12 }}>{u.sto        ?? EMPTY}</td>
                    <td style={{ fontSize: 12 }}>{u.idTelegram ?? EMPTY}</td>
                    <td>
                      {u.twoFaSetup
                        ? <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><UserCheck size={11} /> Aktif</span>
                        : <span className="badge badge-warning" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><UserX size={11} /> Belum</span>}
                    </td>
                    <td className="td-date">{formatDate(u.createdAt)}</td>
                    <td><ActionCell onEdit={() => openEdit(u)} onDelete={() => openDelete(u)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pager page={fieldPage} total={filteredField.length} onPage={setFieldPage} />
      </div>

      {/* ── Modals ────────────────────────────────────────── */}
      {modal === "create" && <UserModal mode="create" onClose={closeModal} onSaved={afterSave} />}
      {modal === "edit"   && selected && <UserModal mode="edit" initial={selected} onClose={closeModal} onSaved={afterSave} />}
      {modal === "delete" && selected && <DeleteModal user={selected} onClose={closeModal} onDeleted={afterSave} />}
    </>
  );
}
