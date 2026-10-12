import { createContext, useContext, useEffect, useState } from "react";
import { NOCTURNE, DISTILLED, LIGHT, CREAM, INK, SEPIA, PAPER, SLATE } from "../lib/tokens";

const ThemeContext = createContext(null);

const THEMES = { nocturne: NOCTURNE, distilled: DISTILLED, light: LIGHT, cream: CREAM, ink: INK, sepia: SEPIA, paper: PAPER, slate: SLATE };
const DARK_THEMES = new Set(["nocturne", "distilled", "ink", "slate"]);
const EDITORIAL_THEMES = new Set(["cream", "ink", "sepia"]);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    let saved = localStorage.getItem("fb-theme");
    // One-time migration to the minimal redesign: keep light/dark preference, switch to Paper/Slate
    if (THEMES[saved] && !localStorage.getItem("fb-theme-paper-v1")) {
      localStorage.setItem("fb-theme-paper-v1", "1");
      saved = DARK_THEMES.has(saved) ? "slate" : "paper";
      localStorage.setItem("fb-theme", saved);
    }
    if (THEMES[saved]) return saved;
    if (saved === "dark") return "nocturne";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "slate" : "paper";
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

  // Newsreader for the Paper/Slate minimal themes
  useEffect(() => {
    const id = "fb-newsreader-font";
    let link = document.getElementById(id);
    if (theme === "paper" || theme === "slate") {
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap";
        document.head.appendChild(link);
      }
    } else {
      link?.remove();
    }
  }, [theme]);

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
    document.documentElement.style.setProperty("--accent", T.accent);
    if (T.readerFont) {
      document.documentElement.style.setProperty("--reader-font-family", T.readerFont);
    }
  }, [theme, isDark, T.accent, T.readerFont]);

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, T, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
