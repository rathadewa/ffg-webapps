import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context";
import { Copy, Check, QrCode, Key } from "lucide-react";
import QRCode from "qrcode";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

const ISSUER = "FFG Web Apps";

export default function Setup2FAPage() {
  const navigate = useNavigate();
  const { setLoggedIn }         = useContext(AuthContext);
  const [tab, setTab]           = useState<"qr" | "key">("qr");
  const [qrUrl, setQrUrl]       = useState("");
  const [secret, setSecret]     = useState("");
  const [copied, setCopied]     = useState(false);
  const [digits, setDigits]     = useState(Array(6).fill(""));
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("session_token");
    if (!token) return;
    fetch("/api/users/2fa-secret", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json: { data?: { secret: string; nik: number } }) => {
        if (!json.data) return;
        const { secret: s, nik } = json.data;
        setSecret(s);
        const uri = `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(`${nik}`)}?secret=${s}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30`;
        QRCode.toDataURL(uri, { width: 180, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
          .then(setQrUrl)
          .catch(console.error);
      })
      .catch(console.error);
  }, []);

  const handleChange = (i: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...digits]; next[i] = val;
    setDigits(next); setError("");
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...digits];
    pasted.split("").forEach((c, idx) => (next[idx] = c));
    setDigits(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) { setError("Masukkan 6 digit kode OTP."); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("session_token");
      const res = await fetch("/api/users/2fa-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const json = await res.json() as { data?: string; error?: string };
      if (!res.ok) { setError(json.error ?? "Kode OTP tidak valid."); return; }
      setLoggedIn(true);
      navigate("/dashboard");
    } catch {
      setError("Gagal mengaktifkan 2FA. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-auth">
      <ThemeToggle />

      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <Logo />
        </div>

        <div className="auth-head">
          <h1 style={{ fontSize: 20 }}>Setup autentikasi dua faktor</h1>
          <p>Pindai QR Code atau masukkan kunci rahasia ke Google Authenticator, lalu konfirmasi dengan kode OTP.</p>
        </div>

        <div className="tabs">
          {(["qr", "key"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`tab${tab === t ? " active" : ""}`}
            >
              {t === "qr" ? <><QrCode size={14} /> Scan QR</> : <><Key size={14} /> Kunci Rahasia</>}
            </button>
          ))}
        </div>

        <div className="panel">
          {tab === "qr" ? (
            <>
              {qrUrl ? (
                <img src={qrUrl} alt="QR Code 2FA" style={{ width: 160, height: 160, borderRadius: 12, background: "#fff", padding: 8 }} />
              ) : (
                <div style={{ width: 160, height: 160, background: "var(--bg-raised)", borderRadius: 12, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-faint)", fontSize: 12 }}>
                  Memuat…
                </div>
              )}
              <p className="panel-hint">
                Buka <strong>Google Authenticator</strong> → tekan <strong>+</strong> → Scan QR Code
              </p>
            </>
          ) : (
            <>
              <p className="panel-label">Kunci Rahasia (Secret Key)</p>
              <div className="panel-secret">{secret || "Memuat…"}</div>
              <button type="button" onClick={copySecret} className="btn btn-ghost btn-sm">
                {copied
                  ? <><Check size={12} style={{ color: "var(--ok)" }} /> Tersalin</>
                  : <><Copy size={12} /> Salin kunci</>}
              </button>
              <p className="panel-hint">
                Google Authenticator → <strong>+</strong> → Masukkan kunci pengaturan → <strong>Berbasis waktu</strong>
              </p>
            </>
          )}
        </div>

        <div className="divider">
          <span className="divider-line" />
          <span className="divider-text">Konfirmasi kode OTP</span>
          <span className="divider-line" />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="otp-row" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                className="otp-box"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
              />
            ))}
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Mengaktifkan…" : "Aktifkan 2FA"}
          </button>
        </form>
      </div>
    </div>
  );
}
