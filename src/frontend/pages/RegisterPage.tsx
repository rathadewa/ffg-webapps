import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

interface FormState {
  name: string; email: string; nik: string; password: string; confirmPassword: string;
}
type Errors = Partial<Record<keyof FormState, string>>;

const INITIAL: FormState = { name: "", email: "", nik: "", password: "", confirmPassword: "" };

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.name.trim())                         e.name            = "Nama lengkap harus diisi.";
  if (!f.email.trim())                        e.email           = "Email harus diisi.";
  else if (!/\S+@\S+\.\S+/.test(f.email))    e.email           = "Format email tidak valid.";
  if (!f.nik.trim())                          e.nik             = "NIK harus diisi.";
  else if (!/^\d+$/.test(f.nik))             e.nik             = "NIK harus berupa angka.";
  if (!f.password)                            e.password        = "Password harus diisi.";
  else if (f.password.length < 6)            e.password        = "Minimal 6 karakter.";
  if (!f.confirmPassword)                     e.confirmPassword = "Konfirmasi password harus diisi.";
  else if (f.password !== f.confirmPassword) e.confirmPassword = "Password tidak cocok.";
  return e;
}

const FIELDS: { key: keyof FormState; label: string; type: string; placeholder: string }[] = [
  { key: "name",            label: "Nama Lengkap",        type: "text",     placeholder: "Nama lengkap Anda" },
  { key: "email",           label: "Email",               type: "email",    placeholder: "email@domain.com" },
  { key: "nik",             label: "NIK",                 type: "text",     placeholder: "Nomor Induk Kependudukan" },
  { key: "password",        label: "Password",            type: "password", placeholder: "Min. 6 karakter" },
  { key: "confirmPassword", label: "Konfirmasi Password", type: "password", placeholder: "Ulangi password Anda" },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm]         = useState<FormState>(INITIAL);
  const [errors, setErrors]     = useState<Errors>({});
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const handleChange = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, nik: Number(form.nik), password: form.password }),
      });
      const json = await res.json() as { data?: string; error?: string };
      if (!res.ok) { setErrors({ nik: json.error ?? "Registrasi gagal." }); return; }
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      setErrors({ name: "Tidak dapat terhubung ke server." });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-auth" style={{ backgroundImage: "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(52,211,153,0.15) 0%, transparent 65%)" }}>
        <div className="login-ray" aria-hidden="true" />
        <div className="login-orbit" aria-hidden="true">
          <div className="lo-ring lo-ring-1"><span className="lo-dot" /></div>
          <div className="lo-ring lo-ring-2"><span className="lo-dot" /></div>
          <div className="lo-ring lo-ring-3"><span className="lo-dot" /></div>
          <div className="lo-ring lo-ring-4" />
        </div>
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div className="auth-icon" style={{ background: "rgba(52,211,153,0.1)", borderColor: "rgba(52,211,153,0.2)", color: "var(--ok)" }}>
            <CheckCircle size={28} />
          </div>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Registrasi berhasil!</h2>
          <p style={{ fontSize: 14, color: "var(--fg-dim)" }}>Mengalihkan ke halaman login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-auth">
      <div className="login-ray" aria-hidden="true" />
      <div className="login-orbit" aria-hidden="true">
        <div className="lo-ring lo-ring-1"><span className="lo-dot" /></div>
        <div className="lo-ring lo-ring-2"><span className="lo-dot" /></div>
        <div className="lo-ring lo-ring-3"><span className="lo-dot" /></div>
        <div className="lo-ring lo-ring-4" />
      </div>
      <ThemeToggle />

      <div className="auth-card">
        <div className="auth-logo">
          <Logo />
        </div>

        <div className="auth-head">
          <h1>Buat akun baru</h1>
          <p>Isi data diri Anda untuk mendaftar</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="form">
          {FIELDS.map(({ key, label, type, placeholder }) => {
            const isPass = key === "password";
            const isConf = key === "confirmPassword";
            const show   = isPass ? showPass : isConf ? showConf : false;
            const toggle = isPass
              ? () => setShowPass((v) => !v)
              : isConf ? () => setShowConf((v) => !v) : null;

            return (
              <div key={key} className="field">
                <label className="field-label">{label}</label>
                <div className="field-wrap">
                  <input
                    className={`field-input${toggle ? " with-icon" : ""}`}
                    type={(isPass || isConf) ? (show ? "text" : "password") : type}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={handleChange(key)}
                  />
                  {toggle && (
                    <button
                      type="button"
                      onClick={toggle}
                      className="field-icon-btn"
                      aria-label={show ? "Sembunyikan" : "Tampilkan"}
                    >
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
                {errors[key] && <p className="field-error">{errors[key]}</p>}
              </div>
            );
          })}

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Mendaftarkan…" : "Daftar Sekarang"}
          </button>
        </form>

        <div className="auth-foot">
          Sudah punya akun?{" "}
          <Link to="/login">Masuk</Link>
        </div>
      </div>
    </div>
  );
}
