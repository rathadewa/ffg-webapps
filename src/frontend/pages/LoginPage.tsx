import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { startSession } from "../app";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [showPass, setShowPass]     = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim() || !password) {
      setError("Email/NIK dan password harus diisi.");
      return;
    }
    const isEmail = identifier.includes("@");
    const body = isEmail
      ? { email: identifier.trim(), password }
      : { nik: identifier.trim(), password };
    setLoading(true);
    try {
      const res  = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { data?: { token: string; twoFaSetup: boolean }; error?: string };
      if (!res.ok) { setError(json.error ?? "Login gagal."); return; }
      startSession(json.data!.token);
      navigate(json.data!.twoFaSetup ? "/verify-2fa" : "/setup-2fa");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-auth">
      {/* ── Decorative background ray ── */}
      <div className="login-ray" aria-hidden="true" />

      <ThemeToggle />

      <div className="auth-card">
        <div className="auth-logo">
          <Logo />
        </div>

        <div className="auth-head">
          <h1>Masuk ke akun</h1>
          <p>Gunakan email atau NIK beserta password Anda</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate className="form">
          <div className="field">
            <label className="field-label">Email atau NIK</label>
            <input
              className="field-input"
              type="text"
              placeholder="email@domain.com atau NIK"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
            />
          </div>

          <div className="field">
            <label className="field-label">Password</label>
            <div className="field-wrap">
              <input
                className="field-input with-icon"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="field-icon-btn"
                aria-label={showPass ? "Sembunyikan" : "Tampilkan"}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Memeriksa…" : "Masuk"}
          </button>
        </form>

      </div>
    </div>
  );
}
