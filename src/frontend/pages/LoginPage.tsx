import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim() || !password) {
      setError("Email/NIK dan password harus diisi.");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);

    // Cek apakah user sudah punya token Google Authenticator (sudah pernah setup 2FA)
    const hasAuthToken = sessionStorage.getItem("2fa_setup") === "done";

    if (hasAuthToken) {
      // Sudah punya token → langsung minta kode 6 digit saja
      navigate("/verify-2fa");
    } else {
      // Belum punya token → perlu scan QR Code dulu
      navigate("/setup-2fa");
    }
  };

  return (
    <div className="auth-container">
      <ThemeToggle />
      <div className="auth-card">
        <Logo />
        <div className="auth-header">
          <h1 className="auth-title">Masuk ke akun Anda</h1>
          <p className="auth-subtitle">Gunakan email atau NIK beserta password Anda</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Email atau NIK</label>
            <input
              className="form-input"
              type="text"
              placeholder="email@domain.com atau NIK"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Memeriksa…" : "Masuk"}
          </button>
        </form>

        <div className="auth-link">
          Belum punya akun? <Link to="/register">Daftar</Link>
        </div>
      </div>
    </div>
  );
}
