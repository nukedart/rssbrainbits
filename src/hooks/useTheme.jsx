import { createContext, useContext, useEffect, useState } from "react";
import { LIGHT, DARK } from "../lib/tokens";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("fb-theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const T = isDark ? DARK : LIGHT;

  useEffect(() => {
    localStorage.setItem("fb-theme", isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, T }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
