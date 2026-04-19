import { useState, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { AuthContext } from "../context";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

export default function Verify2FAPage() {
  const navigate = useNavigate();
  const { setLoggedIn }       = useContext(AuthContext);
  const [digits, setDigits]   = useState(Array(6).fill(""));
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

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

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) { setError("Masukkan 6 digit kode dari Google Authenticator."); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("session_token");
      const res = await fetch("/api/users/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const json = await res.json() as { data?: string; error?: string };
      if (!res.ok) { setError(json.error ?? "Kode OTP tidak valid."); return; }
      setLoggedIn(true);
      navigate("/dashboard");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-auth">
      <div className="login-ray" aria-hidden="true" />
      <ThemeToggle />

      <div className="auth-card">
        <div className="auth-logo">
          <Logo />
        </div>

        <div className="auth-center">
          <div className="auth-icon">
            <ShieldCheck size={26} />
          </div>
          <h1>Verifikasi dua faktor</h1>
          <p>
            Masukkan kode 6 digit dari{" "}
            <strong style={{ color: "var(--fg)", fontWeight: 600 }}>Google Authenticator</strong>
          </p>
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
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Memverifikasi…" : "Verifikasi & Masuk"}
          </button>
        </form>

        <div className="auth-foot">
          <button className="auth-back-btn" onClick={() => navigate("/login")}>
            ← Kembali ke login
          </button>
        </div>
      </div>
    </div>
  );
}
