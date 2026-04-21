import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Pencil, Trash2, X, UserCheck, UserX } from "lucide-react";
import { BASE_PATH } from "../config";

type UserRole = "Administrator" | "Manager" | "Agent" | "Teknisi";
const ROLES: UserRole[] = ["Administrator", "Manager", "Agent", "Teknisi"];

interface User {
  id: number;
  name: string;
  email: string;
  nik: number;
  role: UserRole;
  twoFaSetup: boolean;
  createdAt: string;
}

interface FormData {
  name: string;
  email: string;
  nik: string;
  password: string;
  role: UserRole;
}

const EMPTY_FORM: FormData = { name: "", email: "", nik: "", password: "", role: "Agent" };

const ROLE_BADGE: Record<UserRole, string> = {
  Administrator: "badge badge-error",
  Manager:       "badge badge-warning",
  Agent:         "badge badge-success",
  Teknisi:       "badge",
};

function authHeader() {
  const token = localStorage.getItem("session_token") ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

/* ── Create / Edit Modal ───────────────────────────────────── */
function UserModal({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormData>(
    initial
      ? { name: initial.name, email: initial.email, nik: String(initial.nik), password: "", role: initial.role }
      : EMPTY_FORM
  );
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);

  const setField = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.nik.trim()) {
      setError("Nama, email, dan NIK wajib diisi."); return;
    }
    if (mode === "create" && !form.password) {
      setError("Password wajib diisi untuk pengguna baru."); return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name:  form.name.trim(),
        email: form.email.trim(),
        nik:   Number(form.nik),
        role:  form.role,
      };
      if (form.password) body.password = form.password;

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
        <div className="modal-head">
          <h2>{mode === "create" ? "Tambah Pengguna Baru" : "Edit Pengguna"}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={14} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="field">
              <label className="field-label">Nama Lengkap</label>
              <input className="field-input" type="text" placeholder="John Doe" value={form.name} onChange={setField("name")} />
            </div>
            <div className="field">
              <label className="field-label">Email</label>
              <input className="field-input" type="email" placeholder="john@example.com" value={form.email} onChange={setField("email")} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label className="field-label">NIK</label>
                <input className="field-input" type="number" placeholder="123456" value={form.nik} onChange={setField("nik")} />
              </div>
              <div className="field">
                <label className="field-label">Role</label>
                <select className="field-input" value={form.role} onChange={setField("role")}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field-label">
                Password
                {mode === "edit" && <span style={{ color: "var(--fg-faint)", fontWeight: 400 }}> (kosongkan jika tidak diubah)</span>}
              </label>
              <input
                className="field-input"
                type="password"
                placeholder={mode === "edit" ? "••••••••" : "Min. 8 karakter"}
                value={form.password}
                onChange={setField("password")}
              />
            </div>
          </div>

          <div className="modal-foot">
            <button type="button" className="btn-ghost-sm" onClick={onClose}>Batal</button>
            <button type="submit" className="btn-submit" disabled={saving}>
              {saving
                ? "Menyimpan…"
                : mode === "create" ? "Tambah Pengguna" : "Simpan Perubahan"}
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
  const [error, setError]       = useState("");

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
          Tindakan ini tidak dapat dibatalkan dan semua sesi aktif pengguna akan ikut dihapus.
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

/* ── Main View ─────────────────────────────────────────────── */
export default function ManageUsersView() {
  const [users, setUsers]       = useState<User[]>([]);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<"create" | "edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("session_token") ?? "";
      const res   = await fetch(`${BASE_PATH}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
      const json  = await res.json() as { data?: User[] };
      if (json.data) setUsers(json.data);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      String(u.nik).includes(q)
    );
  });

  const openEdit   = (u: User) => { setSelected(u); setModal("edit"); };
  const openDelete = (u: User) => { setSelected(u); setModal("delete"); };
  const closeModal = () => { setModal(null); setSelected(null); };
  const afterSave  = () => { closeModal(); fetchUsers(); };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      <div className="page-head">
        <div className="page-head-left">
          <span className="page-head-title">Kelola Pengguna</span>
          <span className="page-head-sub">{users.length} pengguna terdaftar</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="search-wrap">
            <Search size={14} />
            <input
              className="search-input"
              type="text"
              placeholder="Cari nama, email, atau NIK…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-add" onClick={() => setModal("create")}>
            <Plus size={15} />
            Tambah Pengguna
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          {loading ? (
            <div className="table-empty">Memuat data…</div>
          ) : filtered.length === 0 ? (
            <div className="table-empty">
              {search ? "Tidak ada pengguna yang cocok dengan pencarian." : "Belum ada pengguna terdaftar."}
            </div>
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
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td className="td-id">{u.id}</td>
                    <td className="td-name">{u.name}</td>
                    <td className="td-email">{u.email}</td>
                    <td className="td-nik">{u.nik}</td>
                    <td>
                      <span className={ROLE_BADGE[u.role] ?? "badge"}>{u.role}</span>
                    </td>
                    <td>
                      {u.twoFaSetup
                        ? <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><UserCheck size={11} /> Aktif</span>
                        : <span className="badge badge-warning" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><UserX size={11} /> Belum</span>}
                    </td>
                    <td className="td-date">{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="btn-actions-cell">
                        <button className="btn-action btn-action-edit" onClick={() => openEdit(u)}>
                          <Pencil size={11} /> Edit
                        </button>
                        <button className="btn-action btn-action-delete" onClick={() => openDelete(u)}>
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
      </div>

      {modal === "create" && (
        <UserModal mode="create" onClose={closeModal} onSaved={afterSave} />
      )}
      {modal === "edit" && selected && (
        <UserModal mode="edit" initial={selected} onClose={closeModal} onSaved={afterSave} />
      )}
      {modal === "delete" && selected && (
        <DeleteModal user={selected} onClose={closeModal} onDeleted={afterSave} />
      )}
    </>
  );
}
