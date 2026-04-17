import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

interface FormState { name: string; email: string; nik: string; password: string; confirmPassword: string; }
type Errors = Partial<Record<keyof FormState, string>>;

const INITIAL: FormState = { name: "", email: "", nik: "", password: "", confirmPassword: "" };

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.name.trim())                              e.name = "Nama lengkap harus diisi.";
  if (!f.email.trim())                             e.email = "Email harus diisi.";
  else if (!/\S+@\S+\.\S+/.test(f.email))         e.email = "Format email tidak valid.";
  if (!f.nik.trim())                               e.nik = "NIK harus diisi.";
  else if (!/^\d+$/.test(f.nik))                  e.nik = "NIK harus berupa angka.";
  if (!f.password)                                 e.password = "Password harus diisi.";
  else if (f.password.length < 6)                 e.password = "Minimal 6 karakter.";
  if (!f.confirmPassword)                          e.confirmPassword = "Konfirmasi password harus diisi.";
  else if (f.password !== f.confirmPassword)      e.confirmPassword = "Password tidak cocok.";
  return e;
}

const FIELDS: { key: keyof FormState; label: string; type: string; placeholder: string }[] = [
  { key: "name",            label: "Nama Lengkap",        type: "text",     placeholder: "Nama lengkap Anda" },
  { key: "email",           label: "Email",               type: "email",    placeholder: "email@domain.com" },
  { key: "nik",             label: "NIK",                 type: "text",     placeholder: "Nomor Induk Kependudukan" },
  { key: "password",        label: "Password",            type: "password", placeholder: "Min. 6 karakter" },
  { key: "confirmPassword", label: "Konfirmasi Password", type: "password", placeholder: "Ulangi password" },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSuccess(true);
    setTimeout(() => navigate("/login"), 1500);
  };

  return (
    <div className="auth-container">
      <ThemeToggle />
      <div className="auth-card wide">
        <Logo />
        <div className="auth-header">
          <h1 className="auth-title">Buat akun baru</h1>
          <p className="auth-subtitle">Isi data diri Anda untuk mendaftar</p>
        </div>

        {success && <div className="alert alert-success">Registrasi berhasil! Mengalihkan ke halaman login…</div>}

        <form onSubmit={handleSubmit} noValidate>
          {FIELDS.map(({ key, label, type, placeholder }) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}</label>
              <input
                className="form-input"
                type={type}
                placeholder={placeholder}
                value={form[key]}
                onChange={handleChange(key)}
                disabled={success}
              />
              {errors[key] && <p className="form-error">{errors[key]}</p>}
            </div>
          ))}
          <div style={{ marginTop: 20 }}>
            <button className="btn btn-primary" type="submit" disabled={loading || success}>
              {loading ? "Mendaftarkan…" : "Daftar Sekarang"}
            </button>
          </div>
        </form>

        <div className="auth-link">
          Sudah punya akun? <Link to="/login">Masuk</Link>
        </div>
      </div>
    </div>
  );
}
