import { useState } from "react";
import { getEffectiveTheme, setTheme } from "../lib/theme";

export function ThemeToggle() {
  const [theme, setThemeState] = useState(getEffectiveTheme());

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    setThemeState(next);
  }

  return (
    <button
      type="button"
      className="iconbtn"
      onClick={toggle}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
