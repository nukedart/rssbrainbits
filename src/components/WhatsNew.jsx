import { useRef } from "react";
import { useDialog } from "../hooks/useDialog";
import { useTheme } from "../hooks/useTheme";
import { SHAPE } from "../lib/tokens";

const BULLETS = [
  "A new reader — tap Aa to set type, spacing and theme.",
  "Denser lists — source, title and excerpt at a glance.",
  "Paper and Slate themes, built for long reading.",
  "Faster launch and more reliable sync across devices.",
];

export default function WhatsNew({ isMobile, onDismiss, onChooseTheme }) {
  const { T } = useTheme();
  const ref = useRef(null);
  useDialog(ref, { onClose: onDismiss });

  const pos = isMobile
    ? { bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        boxShadow: SHAPE.shadowFloatUp, paddingBottom: "max(20px, env(safe-area-inset-bottom))",
        animation: "slideInUp .25s cubic-bezier(.22,.68,0,1.12)" }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(440px, calc(100vw - 32px))",
        borderRadius: 24, boxShadow: SHAPE.shadowFloat };

  return (
    <>
      <div
        onClick={onDismiss}
        style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,.45)", animation: "fadeIn .18s ease" }}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        style={{ position: "fixed", zIndex: 901, background: T.card, color: T.text, padding: "0 24px 24px", ...pos }}
      >
        {isMobile && (
          <div style={{ padding: "12px 0 8px", display: "flex", justifyContent: "center" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: T.border }} />
          </div>
        )}
        <h2 id="whats-new-title" style={{ margin: isMobile ? "8px 0 4px" : "28px 0 4px", fontSize: 28, fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.02em", color: T.text }}>
          Feedbox 2.0
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: 15, color: T.textSecondary }}>A calmer place to read.</p>
        <ul style={{ margin: "0 0 20px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          {BULLETS.map(b => (
            <li key={b} style={{ fontSize: 15, lineHeight: 1.45, color: T.text }}>{b}</li>
          ))}
        </ul>
        <button
          onClick={onChooseTheme}
          style={{ width: "100%", minHeight: 48, border: "none", borderRadius: 14, background: T.accent, color: T.accentText, fontSize: 16, fontWeight: 600, cursor: "pointer" }}
        >
          Choose a theme
        </button>
        <button
          onClick={onDismiss}
          style={{ width: "100%", minHeight: 44, marginTop: 8, border: "none", background: "transparent", color: T.textSecondary, fontSize: 15, cursor: "pointer" }}
        >
          Got it
        </button>
      </div>
    </>
  );
}
