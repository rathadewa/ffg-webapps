import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeContext, AuthContext } from "./context";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyOTPPage from "./pages/VerifyOTPPage";
import Verify2FAPage from "./pages/Verify2FAPage";
import Setup2FAPage from "./pages/Setup2FAPage";
import DashboardPage from "./pages/DashboardPage";

const SESSION_DURATION = 60 * 60 * 1000; // 1 jam

export function isSessionValid(): boolean {
  if (localStorage.getItem("is_logged_in") !== "true") return false;
  const expires = Number(localStorage.getItem("session_expires") ?? "0");
  return Date.now() < expires;
}

export function clearSession() {
  localStorage.removeItem("is_logged_in");
  localStorage.removeItem("session_token");
  localStorage.removeItem("session_expires");
}

export function startSession(token: string) {
  localStorage.setItem("session_token", token);
  localStorage.setItem("session_expires", String(Date.now() + SESSION_DURATION));
}

// Hanya bisa diakses jika sudah login — jika belum, redirect ke /login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isSessionValid() ? <>{children}</> : <Navigate to="/login" replace />;
}

// Hanya bisa diakses jika BELUM login — jika sudah login, redirect ke /dashboard
function GuestRoute({ children }: { children: React.ReactNode }) {
  return isSessionValid() ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });

  const [isLoggedIn, setLoggedIn] = useState(() => isSessionValid());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const handleSetLoggedIn = (value: boolean) => {
    if (value) {
      localStorage.setItem("is_logged_in", "true");
    } else {
      clearSession();
    }
    setLoggedIn(value);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, setLoggedIn: handleSetLoggedIn }}>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Guest routes — redirect ke /dashboard jika sudah login */}
            <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

            {/* 2FA flow — bagian dari proses login, belum butuh auth penuh */}
            <Route path="/setup-2fa"   element={<Setup2FAPage />} />
            <Route path="/verify-2fa"  element={<Verify2FAPage />} />
            <Route path="/verify-otp"  element={<VerifyOTPPage />} />

            {/* Protected routes — redirect ke /login jika belum login */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
