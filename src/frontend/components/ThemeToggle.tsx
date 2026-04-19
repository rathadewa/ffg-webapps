import { useContext } from "react";
import { Sun, Moon } from "lucide-react";
import { ThemeContext } from "../context";

interface Props { fixed?: boolean }

export default function ThemeToggle({ fixed = true }: Props) {
  const { theme, toggleTheme } = useContext(ThemeContext);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);
    const r = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const next = theme === "dark" ? "light" : "dark";

    // Fallback untuk browser yang belum support View Transitions
    if (!("startViewTransition" in document)) {
      toggleTheme();
      return;
    }

    document.documentElement.style.setProperty("--vt-x", `${x}px`);
    document.documentElement.style.setProperty("--vt-y", `${y}px`);
    document.documentElement.style.setProperty("--vt-r", `${r}px`);

    (document as Document & { startViewTransition: (cb: () => void) => void })
      .startViewTransition(() => {
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("theme", next);
        toggleTheme();
      });
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Toggle theme"
      className={`theme-toggle${fixed ? "" : " theme-toggle-inline"}`}
    >
      {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
