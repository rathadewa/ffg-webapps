import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BASE_PATH } from "./config";
import { ThemeContext, AuthContext } from "./context";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyOTPPage from "./pages/VerifyOTPPage";
import Verify2FAPage from "./pages/Verify2FAPage";
import Setup2FAPage from "./pages/Setup2FAPage";
import DashboardPage from "./pages/DashboardPage";

const SESSION_DURATION = 60 * 60 * 1000; // 1 jam
const ADMIN_ROLES = ["Administrator", "Manager"];

export function isSessionValid(): boolean {
  if (localStorage.getItem("is_logged_in") !== "true") return false;
  const expires = Number(localStorage.getItem("session_expires") ?? "0");
  return Date.now() < expires;
}

export function getUserRole(): string | null {
  return localStorage.getItem("user_role");
}

export function isAdminOrManager(): boolean {
  return ADMIN_ROLES.includes(getUserRole() ?? "");
}

export function clearSession() {
  localStorage.removeItem("is_logged_in");
  localStorage.removeItem("session_token");
  localStorage.removeItem("session_expires");
  localStorage.removeItem("user_role");
}

export function startSession(token: string) {
  localStorage.removeItem("is_logged_in"); // pastikan 2FA wajib diselesaikan dulu
  localStorage.setItem("session_token", token);
  localStorage.setItem("session_expires", String(Date.now() + SESSION_DURATION));
}

// Hanya bisa diakses jika sudah login — jika belum, redirect ke /login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isSessionValid() ? <>{children}</> : <Navigate to="/login" replace />;
}

// Hanya bisa diakses jika sudah login DAN punya role admin/manager.
// Jika role belum ada di localStorage (pertama kali), fetch dulu sebelum memutuskan.
function AdminRoute({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(getUserRole() !== null);
  const [allowed, setAllowed] = React.useState(isAdminOrManager());

  React.useEffect(() => {
    if (ready) return;
    const token = localStorage.getItem("session_token");
    if (!token) { setReady(true); return; }
    fetch(`${BASE_PATH}/api/users/current`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json: { data?: { role: string } }) => {
        if (json.data?.role) {
          localStorage.setItem("user_role", json.data.role);
          setAllowed(ADMIN_ROLES.includes(json.data.role));
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [ready]);

  if (!isSessionValid()) return <Navigate to="/login" replace />;
  if (!ready) return null;
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Hanya bisa diakses jika BELUM login — jika sudah login, redirect ke /dashboard
function GuestRoute({ children }: { children: React.ReactNode }) {
  return isSessionValid() ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
        <BrowserRouter basename={BASE_PATH}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Guest routes — redirect ke /dashboard jika sudah login */}
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />

            {/* Admin-only routes — hanya Administrator & Manager */}
            <Route path="/register" element={<AdminRoute><RegisterPage /></AdminRoute>} />

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
