import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

const SECRET  = "JBSWY3DPEHPK3PXP";
const ISSUER  = "FFGWebApps";
const ACCOUNT = "user@ffgwebapps.com";

export default function Setup2FAPage() {
  const navigate = useNavigate();
  const [tab, setTab]       = useState<"qr" | "key">("qr");
  const [qrUrl, setQrUrl]   = useState("");
  const [copied, setCopied] = useState(false);
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const otpauthUri = `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(ACCOUNT)}?secret=${SECRET}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30`;

  useEffect(() => {
    QRCode.toDataURL(otpauthUri, { width: 150, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then(setQrUrl)
      .catch(console.error);
  }, []);

  const handleChange = (i: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...digits]; next[i] = val;
    setDigits(next); setError("");
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...digits]; pasted.split("").forEach((c, i) => (next[i] = c));
    setDigits(next); refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const copySecret = () => {
    navigator.clipboard.writeText(SECRET).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (digits.join("").length < 6) { setError("Masukkan 6 digit kode OTP."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    sessionStorage.setItem("2fa_setup", "done");
    navigate("/dashboard");
  };

  return (
    <div className="auth-container">
      <ThemeToggle />
      <div className="auth-card wide">
        <Logo />
        <div className="auth-header">
          <h1 className="auth-title">Setup autentikasi dua faktor</h1>
          <p className="auth-subtitle">Pindai QR Code atau masukkan kunci rahasia ke Google Authenticator, lalu konfirmasi dengan kode OTP.</p>
        </div>

        <div className="tabs">
          <button className={`tab${tab === "qr" ? " active" : ""}`} onClick={() => setTab("qr")}>
            Scan QR Code
          </button>
          <button className={`tab${tab === "key" ? " active" : ""}`} onClick={() => setTab("key")}>
            Kunci Rahasia
          </button>
        </div>

        {tab === "qr" ? (
          <div className="qr-container">
            {qrUrl
              ? <img src={qrUrl} alt="QR Code 2FA" className="qr-img" />
              : <div className="qr-img" style={{ display:"flex", alignItems:"center", justifyContent:"center", color:"#555", fontSize:12 }}>Memuat…</div>
            }
            <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
              Buka Google Authenticator → <strong>+</strong> → Scan QR
            </p>
          </div>
        ) : (
          <div className="qr-container">
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Kunci Rahasia (Secret Key):</p>
            <div className="secret-key">{SECRET}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={copySecret} type="button">
                {copied ? "✓ Tersalin" : "Salin"}
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
              Google Authenticator → <strong>+</strong> → Masukkan kunci pengaturan → Pilih <strong>Berbasis waktu</strong>
            </p>
          </div>
        )}

        <div className="divider">Konfirmasi kode OTP</div>

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
              />
            ))}
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Mengaktifkan…" : "Aktifkan 2FA"}
          </button>
        </form>
      </div>
    </div>
  );
}
