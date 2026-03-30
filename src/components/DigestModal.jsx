import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { summarizeContent } from "../lib/fetchers";

export default function DigestModal({ items = [], onClose }) {
  const { T } = useTheme();
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use up to 20 most recent items
  const recentItems = items.slice(0, 20);

  useEffect(() => { generate(); }, []);

  async function generate() {
    if (!recentItems.length) { setError("No articles to digest."); return; }
    setLoading(true); setError(null);
    const text = recentItems.map((item, i) =>
      `${i + 1}. ${item.source ? `[${item.source}] ` : ""}${item.title}${item.description ? " — " + item.description.slice(0, 200) : ""}`
    ).join("\n");
    try {
      const result = await summarizeContent(text, "Daily News Digest", "keypoints");
      setDigest(result);
    } catch (e) {
      setError("Could not generate digest. Check your AI settings in Settings → AI Integration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1200,
        background: "rgba(0,0,0,.55)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.card, borderRadius: 18, width: "100%", maxWidth: 520,
          boxShadow: "0 24px 64px rgba(0,0,0,.4)",
          display: "flex", flexDirection: "column", maxHeight: "80dvh",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: "-.01em" }}>Daily Digest</div>
            <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 2 }}>AI summary of {recentItems.length} recent articles</div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: T.surface, color: T.textTertiary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", fontSize: 16 }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "40px 0", color: T.textTertiary }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${T.border}`, borderTopColor: T.accent, animation: "spin .8s linear infinite" }} />
              <span style={{ fontSize: 13 }}>Generating your digest…</span>
            </div>
          )}
          {error && (
            <div style={{ fontSize: 13, color: T.danger, background: `${T.danger}18`, borderRadius: 10, padding: "12px 14px", lineHeight: 1.6 }}>
              {error}
            </div>
          )}
          {digest && !loading && (
            <div style={{ lineHeight: 1.8 }}>
              {digest.split("\n").filter(Boolean).map((line, i) => (
                <div key={i} style={{
                  fontSize: 14, color: T.text,
                  padding: "6px 0",
                  borderBottom: i < digest.split("\n").filter(Boolean).length - 1 ? `1px solid ${T.border}` : "none",
                  lineHeight: 1.7,
                }}>
                  {line.startsWith("•") ? (
                    <span>
                      <span style={{ color: T.accent, marginRight: 8, fontWeight: 700 }}>•</span>
                      {line.slice(1).trim()}
                    </span>
                  ) : line}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 22px 16px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
              background: loading ? T.surface2 : T.accent,
              color: loading ? T.textTertiary : T.accentText,
              fontSize: 13, fontWeight: 600, cursor: loading ? "wait" : "pointer",
              fontFamily: "inherit", transition: "background .15s",
            }}
          >
            {loading ? "Generating…" : "Regenerate"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 18px", borderRadius: 10,
              border: `1px solid ${T.border}`, background: "transparent",
              color: T.textSecondary, fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >Close</button>
        </div>
      </div>
    </div>
  );
}
