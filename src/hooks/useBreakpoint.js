import { useState, useEffect } from "react";

// Breakpoints
// mobile:  < 768px  — bottom nav, no sidebar, full-screen panels
// tablet:  768–1023px — icon sidebar, no sources panel
// desktop: ≥ 1024px — full sidebar, all panels visible

export function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );

  useEffect(() => {
    function onResize() { setWidth(window.innerWidth); }
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return {
    width,
    isMobile:  width < 768,
    isTablet:  width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  };
}
