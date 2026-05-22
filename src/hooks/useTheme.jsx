import { createContext, useContext, useEffect, useState } from "react";
import { NOCTURNE, DISTILLED, LIGHT, CREAM, INK, SEPIA } from "../lib/tokens";

const ThemeContext = createContext(null);

const THEMES = { nocturne: NOCTURNE, distilled: DISTILLED, light: LIGHT, cream: CREAM, ink: INK, sepia: SEPIA };
const DARK_THEMES = new Set(["nocturne", "distilled", "ink"]);
const EDITORIAL_THEMES = new Set(["cream", "ink", "sepia"]);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem("fb-theme");
    if (THEMES[saved]) return saved;
    if (saved === "dark") return "nocturne";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "distilled" : "light";
  });

  const T = THEMES[theme] || NOCTURNE;
  const isDark = DARK_THEMES.has(theme);

  function setTheme(name) {
    if (!THEMES[name]) return;
    setThemeState(name);
  }

  // Legacy toggle: Light ↔ Nocturne
  function setIsDark(dark) {
    setTheme(dark ? "nocturne" : "light");
  }

  // Load Cormorant Garamond only for editorial themes — keeps default themes font-free
  useEffect(() => {
    const id = "fb-cormorant-font";
    let link = document.getElementById(id);
    if (EDITORIAL_THEMES.has(theme)) {
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap";
        document.head.appendChild(link);
      }
    } else {
      link?.remove();
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("fb-theme", theme);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
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
