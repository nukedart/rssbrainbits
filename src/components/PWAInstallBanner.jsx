// ── PWA Install Banner ────────────────────────────────────────
// Shows a subtle "Add to Home Screen" prompt when the browser
// fires beforeinstallprompt (Chrome/Edge/Android).
// iOS Safari doesn't fire this event — shows manual instructions instead.
import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useBreakpoint } from "../hooks/useBreakpoint";

export default function PWAInstallBanner() {
  const { T } = useTheme();
  const { isMobile } = useBreakpoint();
  const [prompt, setPrompt]       = useState(null);   // beforeinstallprompt event
  const [show, setShow]           = useState(false);
  const [isIOS, setIsIOS]         = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Dismissed previously
    if (localStorage.getItem("fb-pwa-dismissed")) return;

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // Show iOS manual instructions after a short delay
      setTimeout(() => setShow(true), 3000);
      return;
    }

    // Chrome/Android: capture the install prompt
    function onPrompt(e) {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem("fb-pwa-dismissed", "1");
  }

  async function install() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setShow(false);
  }

  if (installed || !show) return null;

  // Only show on mobile — desktop install is less important
  if (!isMobile && !isIOS) return null;

  return (
    <div style={{
      position: "fixed", bottom: 76, left: 12, right: 12, zIndex: 800,
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 20, padding: "16px",
      boxShadow: "0 12px 40px rgba(0,0,0,.22)",
      animation: "slideUp .3s cubic-bezier(.34,1.56,.64,1)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: isIOS ? 12 : 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", flexShrink: 0, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/feedbox-logo.png" alt="" style={{ width: 36, height: 36, filter: "brightness(10) saturate(0)" }} onError={e => { e.target.style.display="none"; }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: "-.01em" }}>Feedbox</div>
          <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 1 }}>
            {isIOS ? "Add to your Home Screen" : "Install for offline reading"}
          </div>
          <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
            {[1,2,3,4,5].map(i => (
              <svg key={i} width="11" height="11" viewBox="0 0 16 16" fill={T.accent}><path d="M8 1l1.9 3.9L14 5.6l-3 2.9.7 4.1L8 10.5l-3.7 2.1.7-4.1-3-2.9 4.1-.7z"/></svg>
            ))}
            <span style={{ fontSize: 10, color: T.textTertiary, marginLeft: 4 }}>Calm reading</span>
          </div>
        </div>
        <button onClick={dismiss} style={{ background: T.surface2, border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", color: T.textTertiary, fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>×</button>
      </div>
      {isIOS ? (
        <div style={{ background: T.surface2, borderRadius: 12, padding: "10px 14px", fontSize: 12, color: T.textSecondary, lineHeight: 1.6 }}>
          Tap <strong style={{ color: T.text }}>↑ Share</strong> in Safari, then <strong style={{ color: T.text }}>Add to Home Screen</strong>
        </div>
      ) : (
        <button onClick={install} style={{
          width: "100%", padding: "12px 0", background: T.accent, color: T.accentText,
          border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit", letterSpacing: "-.01em",
          WebkitTapHighlightColor: "transparent",
        }}
          onMouseEnter={e => e.currentTarget.style.opacity=".88"}
          onMouseLeave={e => e.currentTarget.style.opacity="1"}
        >Install App</button>
      )}
    </div>
  );
}
