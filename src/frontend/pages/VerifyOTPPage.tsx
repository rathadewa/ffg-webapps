import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setError("");
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...digits];
    pasted.split("").forEach((c, i) => (next[i] = c));
    setDigits(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (digits.join("").length < 6) { setError("Masukkan 6 digit kode OTP."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    navigate("/dashboard");
  };

  return (
    <div className="auth-container">
      <ThemeToggle />
      <div className="auth-card">
        <Logo />
        <div className="auth-header">
          <h1 className="auth-title">Verifikasi identitas</h1>
          <p className="auth-subtitle">
            Masukkan 6 digit kode dari <strong>Google Authenticator</strong> untuk akun FFG WebApps.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="otp-container" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (refs.current[i] = el)}
                className="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Memverifikasi…" : "Verifikasi"}
          </button>
        </form>

        <div className="auth-link" style={{ marginTop: 16 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/login"); }}>
            ← Kembali ke login
          </a>
        </div>
      </div>
    </div>
  );
}
