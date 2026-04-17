import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeContext } from "./context";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyOTPPage from "./pages/VerifyOTPPage";
import Verify2FAPage from "./pages/Verify2FAPage";
import Setup2FAPage from "./pages/Setup2FAPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOTPPage />} />
          <Route path="/verify-2fa" element={<Verify2FAPage />} />
          <Route path="/setup-2fa" element={<Setup2FAPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
