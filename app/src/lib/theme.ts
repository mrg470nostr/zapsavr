const KEY = "zapsavr.theme";

export type Theme = "light" | "dark";

function isTheme(v: string | null): v is Theme {
  return v === "light" || v === "dark";
}

export function getStoredTheme(): Theme | null {
  const v = localStorage.getItem(KEY);
  return isTheme(v) ? v : null;
}

export function getEffectiveTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
  // Keeps the browser chrome (status bar / address bar tint) matching —
  // static media-query meta tags wouldn't react to this in-app toggle.
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f7f1e3" : "#0c1216");
}
