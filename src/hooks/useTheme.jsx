import { createContext, useContext, useEffect, useState } from "react";
import { NOCTURNE, DISTILLED, LIGHT } from "../lib/tokens";

const ThemeContext = createContext(null);

const THEMES = { nocturne: NOCTURNE, distilled: DISTILLED, light: LIGHT };

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem("fb-theme");
    if (saved === "nocturne" || saved === "distilled" || saved === "light") return saved;
    // Legacy migration: "dark" → nocturne, "light" → light
    if (saved === "dark") return "nocturne";
    if (saved === "light") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "nocturne" : "light";
  });

  const T = THEMES[theme] || NOCTURNE;
  const isDark = theme !== "light";

  function setTheme(name) {
    if (!THEMES[name]) return;
    setThemeState(name);
  }

  // Legacy toggle: Light ↔ Nocturne
  function setIsDark(dark) {
    setTheme(dark ? "nocturne" : "light");
  }

  useEffect(() => {
    localStorage.setItem("fb-theme", theme);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    // Apply reader font from theme token
    if (T.readerFont) {
      document.documentElement.style.setProperty("--reader-font-family", T.readerFont);
    }
  }, [theme, isDark, T.readerFont]);

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, T, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
