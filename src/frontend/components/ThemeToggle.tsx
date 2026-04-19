import { useContext } from "react";
import { Sun, Moon } from "lucide-react";
import { ThemeContext } from "../context";

interface Props { fixed?: boolean }

export default function ThemeToggle({ fixed = true }: Props) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`theme-toggle${fixed ? "" : " theme-toggle-inline"}`}
    >
      {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
