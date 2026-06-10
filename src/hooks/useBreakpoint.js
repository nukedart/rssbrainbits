import { useState, useEffect } from "react";

// Breakpoints
// mobile:  < 768px  — bottom nav, no sidebar, full-screen panels
// tablet:  768–1023px — icon sidebar, no sources panel
// desktop: ≥ 1024px — full sidebar, all panels visible

function getBreakpoint(w) {
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function useBreakpoint() {
  const [bp, setBp] = useState(() =>
    getBreakpoint(typeof window !== "undefined" ? window.innerWidth : 1280)
  );

  useEffect(() => {
    function onResize() {
      setBp(prev => { const next = getBreakpoint(window.innerWidth); return prev === next ? prev : next; });
    }
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return {
    isMobile:  bp === "mobile",
    isTablet:  bp === "tablet",
    isDesktop: bp === "desktop",
  };
}
