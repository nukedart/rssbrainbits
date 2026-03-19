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
      position: "fixed", bottom: 70, left: 12, right: 12, zIndex: 800,
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: "14px 16px",
      boxShadow: "0 8px 32px rgba(0,0,0,.18)",
      display: "flex", alignItems: "flex-start", gap: 12,
      animation: "slideUp .25s ease",
    }}>
      <img src="/feedbox-logo.png" alt="" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 2 }}>
          Add Feedbox to Home Screen
        </div>
        {isIOS ? (
          <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
            Tap <strong style={{ color: T.text }}>Share</strong> (↑) then{" "}
            <strong style={{ color: T.text }}>Add to Home Screen</strong> for the full app experience.
          </div>
        ) : (
          <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
            Install for faster loading and offline reading.
          </div>
        )}
        {!isIOS && (
          <button onClick={install} style={{
            marginTop: 10, background: T.accent, border: "none", borderRadius: 8,
            padding: "7px 16px", color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
          }}>
            Install app
          </button>
        )}
      </div>
      <button onClick={dismiss} style={{
        background: "none", border: "none", cursor: "pointer",
        color: T.textTertiary, fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0,
        WebkitTapHighlightColor: "transparent",
      }}>×</button>
    </div>
  );
}
