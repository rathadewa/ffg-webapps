import React, { useContext } from "react";
import { ThemeContext } from "../context";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return (
    <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === "dark" ? "☀️" : "🌙"}
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
