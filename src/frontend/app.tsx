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

// Hanya bisa diakses jika sudah login — jika belum, redirect ke /login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = sessionStorage.getItem("is_logged_in") === "true";
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
}

// Hanya bisa diakses jika BELUM login — jika sudah login, redirect ke /dashboard
function GuestRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = sessionStorage.getItem("is_logged_in") === "true";
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });

  const [isLoggedIn, setLoggedIn] = useState(
    () => sessionStorage.getItem("is_logged_in") === "true"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const handleSetLoggedIn = (value: boolean) => {
    if (value) {
      sessionStorage.setItem("is_logged_in", "true");
    } else {
      sessionStorage.removeItem("is_logged_in");
      sessionStorage.removeItem("2fa_setup");
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
