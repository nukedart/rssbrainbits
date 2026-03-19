import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { HIGHLIGHT_COLORS } from "./SelectionToolbar";
import { highlightsToMarkdown, copyToClipboard, downloadFile } from "../lib/exportUtils.js";

export default function HighlightsDrawer({ highlights, onSelectHighlight, onClose, articleTitle, articleUrl }) {
  const { T } = useTheme();
  const [feedback, setFeedback] = useState(null);

  async function handleExport(asFile) {
    const md = highlightsToMarkdown(highlights, articleTitle, articleUrl);
    if (!md) return;
    if (asFile) {
      const slug = (articleTitle || "article").slice(0, 40).replace(/[^a-z0-9]/gi, "-").toLowerCase();
      downloadFile(md, `feedbox-highlights-${slug}.md`);
    } else {
      const ok = await copyToClipboard(md);
      setFeedback(ok ? "✓ Copied!" : "Failed");
      setTimeout(() => setFeedback(null), 2000);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 650, background: T.overlay, display: "flex", justifyContent: "flex-end" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: "min(380px, 100vw)", background: T.card, height: "100%",
        overflowY: "auto", boxShadow: "-4px 0 30px rgba(0,0,0,.12)",
        display: "flex", flexDirection: "column", animation: "slideInRight .2s ease",
      }}>
        <div style={{ padding: "20px 18px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, background: T.card, zIndex: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Highlights</div>
            <div style={{ fontSize: 11, color: T.textTertiary }}>{highlights.length} {highlights.length === 1 ? "highlight" : "highlights"}</div>
          </div>
          {highlights.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginRight: 4 }}>
              <button onClick={() => handleExport(false)} title="Copy as Markdown" style={{ background: feedback ? T.accentSurface : T.surface2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: feedback ? T.accentText : T.textSecondary, fontFamily: "inherit", transition: "all .15s" }}>
                {feedback || "Copy MD"}
              </button>
              <button onClick={() => handleExport(true)} title="Download .md file" style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: T.textSecondary, fontFamily: "inherit" }}>
                ↓ .md
              </button>
            </div>
          )}
          <button onClick={onClose} style={{ background: T.surface2, border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: T.textSecondary, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ flex: 1, padding: "12px 0" }}>
          {highlights.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>✍️</div>
              <div style={{ fontSize: 14, color: T.textSecondary, fontWeight: 600, marginBottom: 4 }}>No highlights yet</div>
              <div style={{ fontSize: 13, color: T.textTertiary }}>Select any text in the article to highlight it.</div>
            </div>
          ) : highlights.map((h) => {
            const color = HIGHLIGHT_COLORS.find((c) => c.id === h.color) || HIGHLIGHT_COLORS[0];
            return (
              <div key={h.id} onClick={() => onSelectHighlight(h)}
                style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, cursor: "pointer", transition: "background .1s" }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surface; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 3, borderRadius: 2, flexShrink: 0, background: color.border, alignSelf: "stretch" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, fontStyle: "italic", marginBottom: h.note ? 8 : 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      "{h.passage}"
                    </div>
                    {h.note ? (
                      <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5, background: T.surface, borderRadius: 8, padding: "7px 10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{h.note}</div>
                    ) : (
                      <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 4 }}>Tap to add a note</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
