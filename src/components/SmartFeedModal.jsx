import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { Button } from "./UI";

const COLORS = [
  { id: "blue",   bg: "#EBF1FD", text: "#1A4FB8", dot: "#2F6FED" },
  { id: "teal",   bg: "rgba(172,207,174,0.12)", text: "#accfae", dot: "#accfae" },
  { id: "amber",  bg: "#FDF3E3", text: "#7A5E26", dot: "#AA8439" },
  { id: "red",    bg: "#FEF2F2", text: "#991B1B", dot: "#EF4444" },
  { id: "purple", bg: "#F0EEF8", text: "#5B4FA0", dot: "#8B5CF6" },
  { id: "green",  bg: "#ECFDF5", text: "#166534", dot: "#22C55E" },
];

export default function SmartFeedModal({ feed = null, feeds = [], onSave, onDelete, onClose }) {
  const { T } = useTheme();
  const isEdit = !!feed;

  const [name,      setName]      = useState(feed?.name       || "");
  const [kwInput,   setKwInput]   = useState("");
  const [keywords,  setKeywords]  = useState(feed?.keywords  || []);
  const [color,     setColor]     = useState(feed?.color     || "teal");
  const [feedIds,   setFeedIds]   = useState(feed?.feed_ids  || null);
  const [matchMode, setMatchMode] = useState(feed?.match_mode || "any"); // "any" | "all"
  const [showFeedPicker, setShowFeedPicker] = useState(false);
  const [error,     setError]     = useState("");

  function addKeyword() {
    const kw = kwInput.trim().toLowerCase();
    if (!kw) return;
    if (keywords.includes(kw)) { setKwInput(""); return; }
    setKeywords(prev => [...prev, kw]);
    setKwInput("");
  }

  function removeKeyword(kw) {
    setKeywords(prev => prev.filter(k => k !== kw));
  }

  function handleSave() {
    if (!name.trim())       { setError("Give this bucket a name."); return; }
    if (!keywords.length)   { setError("Add at least one keyword."); return; }
    onSave({ name: name.trim(), keywords, color, feed_ids: feedIds?.length ? feedIds : null, match_mode: matchMode });
  }

  const selectedColor = COLORS.find(c => c.id === color) || COLORS[0];

  return (
    <div style={{
      position: "fixed", inset: 0, background: T.overlay, zIndex: 1100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: T.card, borderRadius: 18, padding: "26px 26px 22px",
        width: "100%", maxWidth: "min(460px, 95vw)",
        border: `1px solid ${T.border}`,
        boxShadow: "0 24px 80px rgba(0,0,0,.22)",
        animation: "fadeInScale .18s ease",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: selectedColor.bg, border: `1.5px solid ${selectedColor.dot}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginRight: 12, flexShrink: 0 }}>
            🏷
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>
              {isEdit ? "Edit Smart Feed" : "New Smart Feed"}
            </h2>
            <p style={{ fontSize: 12, color: T.textSecondary, margin: "2px 0 0" }}>
              Articles matching any keyword appear here automatically
            </p>
          </div>
          <button onClick={onClose} style={{ background: T.surface2, border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: T.textSecondary, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 7 }}>Name</label>
          <input
            value={name} onChange={e => { setName(e.target.value); setError(""); }}
            placeholder="e.g. AI Research, Climate, My Startup…"
            style={{ width: "100%", boxSizing: "border-box", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 13px", fontSize: 14, color: T.text, fontFamily: "inherit", outline: "none" }}
            onFocus={e => { e.target.style.borderColor = T.accent; }}
            onBlur={e => { e.target.style.borderColor = T.border; }}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
            autoFocus
          />
        </div>

        {/* Keywords */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 7 }}>Keywords</label>
          {/* Existing chips */}
          {keywords.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {keywords.map(kw => (
                <span key={kw} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: selectedColor.bg, color: selectedColor.text, fontSize: 12, fontWeight: 600, border: `1px solid ${selectedColor.dot}40` }}>
                  {kw}
                  <button onClick={() => removeKeyword(kw)} style={{ background: "none", border: "none", cursor: "pointer", color: selectedColor.text, fontSize: 14, padding: 0, lineHeight: 1, opacity: 0.6 }}>×</button>
                </span>
              ))}
            </div>
          )}
          {/* Input */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={kwInput}
              onChange={e => setKwInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addKeyword(); } }}
              placeholder="Type keyword, press Enter to add…"
              style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "8px 12px", fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none" }}
              onFocus={e => { e.target.style.borderColor = T.accent; }}
              onBlur={e => { e.target.style.borderColor = T.border; }}
            />
            <button onClick={addKeyword} style={{ background: T.accent, border: "none", borderRadius: 9, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "inherit" }}>
              Add
            </button>
          </div>
          <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 8, lineHeight: 1.7 }}>
            <span style={{ color: T.accent, fontWeight: 600 }}>apple</span> — contains &nbsp;·&nbsp;
            <span style={{ color: T.accent, fontWeight: 600 }}>"apple watch"</span> — exact phrase &nbsp;·&nbsp;
            <span style={{ color: T.accent, fontWeight: 600 }}>-android</span> — exclude &nbsp;·&nbsp;
            <span style={{ color: T.accent, fontWeight: 600 }}>AI OR ML</span> — either
          </div>

          {/* Match mode — only meaningful when 2+ keywords */}
          {keywords.filter(k => !k.startsWith("-")).length >= 2 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 11, color: T.textTertiary }}>Articles must match:</span>
              {[{ value: "any", label: "ANY keyword" }, { value: "all", label: "ALL keywords" }].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setMatchMode(opt.value)}
                  style={{
                    fontSize: 11, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                    padding: "3px 10px", borderRadius: 6, border: `1px solid ${matchMode === opt.value ? T.accent : T.border}`,
                    background: matchMode === opt.value ? T.accentSurface : T.surface2,
                    color: matchMode === opt.value ? T.accent : T.textSecondary,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: 20 }}>
          {/* ── Feed scope picker ── */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".06em", flex: 1 }}>Search scope</label>
              <button onClick={() => { setFeedIds(null); setShowFeedPicker(false); }} style={{ fontSize: 11, fontWeight: 600, color: !feedIds ? T.accentText : T.textTertiary, background: !feedIds ? T.accentSurface : "transparent", border: `1px solid ${!feedIds ? T.accent : T.border}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", marginRight: 5 }}>All feeds</button>
              <button onClick={() => setShowFeedPicker(v => !v)} style={{ fontSize: 11, fontWeight: 600, color: feedIds ? T.accentText : T.textSecondary, background: feedIds ? T.accentSurface : T.surface2, border: `1px solid ${feedIds ? T.accent : T.border}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" }}>
                {feedIds ? `${feedIds.length} feed${feedIds.length !== 1 ? "s" : ""}` : "Pick feeds"}
              </button>
            </div>
            {showFeedPicker && feeds.length > 0 && (
              <div style={{ background: T.surface2, borderRadius: 10, border: `1px solid ${T.border}`, maxHeight: 160, overflowY: "auto", padding: "6px 0" }}>
                {feeds.filter(f => f.type === "rss").map(f => {
                  const checked = feedIds?.includes(f.id) || false;
                  return (
                    <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.surface; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => {
                        setFeedIds(prev => {
                          const cur = prev || [];
                          return checked ? cur.filter(id => id !== f.id) : [...cur, f.id];
                        });
                      }} style={{ accentColor: T.accent, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name || f.url}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {feedIds && feedIds.length > 0 && (
              <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 5 }}>
                Only searches: {feeds.filter(f => feedIds.includes(f.id)).map(f => f.name || f.url).join(", ")}
              </div>
            )}
          </div>

          <label style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 8 }}>Color</label>
          <div style={{ display: "flex", gap: 8 }}>
            {COLORS.map(c => (
              <button key={c.id} onClick={() => setColor(c.id)} style={{
                width: 28, height: 28, borderRadius: "50%", border: `2.5px solid ${color === c.id ? c.dot : "transparent"}`,
                background: c.bg, cursor: "pointer", transition: "all .12s",
                boxShadow: color === c.id ? `0 0 0 2px ${T.card}, 0 0 0 4px ${c.dot}` : "none",
                position: "relative",
              }}>
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.dot, display: "block" }} />
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ fontSize: 13, color: T.danger, padding: "8px 12px", background: `${T.danger}15`, borderRadius: 8, marginBottom: 14 }}>{error}</div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          {isEdit && (
            <button onClick={() => { onDelete(feed.id); onClose(); }} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: T.danger, fontFamily: "inherit" }}>
              Delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            {isEdit ? "Save changes" : "Create bucket"}
          </Button>
        </div>
      </div>
    </div>
  );
}
