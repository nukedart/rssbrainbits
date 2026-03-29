import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { HIGHLIGHT_COLORS } from "./SelectionToolbar";
import { highlightsToMarkdown, copyToClipboard, downloadFile } from "../lib/exportUtils.js";

export default function HighlightsDrawer({ highlights, onSelectHighlight, onClose, onUpdateTags, articleTitle, articleUrl }) {
  const { T } = useTheme();
  const [feedback, setFeedback] = useState(null);
  const [editingTagId, setEditingTagId] = useState(null);
  const [tagInput, setTagInput] = useState("");

  function commitTag(h) {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (tag && !(h.tags || []).includes(tag)) {
      onUpdateTags(h.id, [...(h.tags || []), tag]);
    }
    setTagInput("");
    setEditingTagId(null);
  }

  function removeTag(h, tag) {
    onUpdateTags(h.id, (h.tags || []).filter(t => t !== tag));
  }

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
                    {onUpdateTags && (
                      <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8, alignItems: "center" }}>
                        {(h.tags || []).map(tag => (
                          <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "2px 7px 2px 8px", borderRadius: 20, background: T.accentSurface, color: T.accent, border: `1px solid ${T.accent}44` }}>
                            {tag}
                            <button onClick={() => removeTag(h, tag)} style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, padding: 0, lineHeight: 1, fontSize: 12, display: "flex", alignItems: "center" }}>×</button>
                          </span>
                        ))}
                        {editingTagId === h.id ? (
                          <input
                            autoFocus
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") commitTag(h); if (e.key === "Escape") { setTagInput(""); setEditingTagId(null); } }}
                            onBlur={() => { commitTag(h); }}
                            placeholder="theme…"
                            style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, border: `1px dashed ${T.accent}`, background: T.accentSurface, color: T.text, outline: "none", width: 72, fontFamily: "inherit" }}
                          />
                        ) : (
                          <button onClick={() => setEditingTagId(h.id)} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, border: `1px dashed ${T.border}`, background: "transparent", color: T.textTertiary, cursor: "pointer", fontFamily: "inherit" }}>+ theme</button>
                        )}
                      </div>
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
