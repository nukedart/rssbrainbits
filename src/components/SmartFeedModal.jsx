import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { SHAPE } from "../lib/tokens";
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mob, setMob] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onMq = e => setMob(e.matches);
    const onKey = e => { if (e.key === "Escape") onClose(); };
    mq.addEventListener("change", onMq);
    document.addEventListener("keydown", onKey);
    return () => { mq.removeEventListener("change", onMq); document.removeEventListener("keydown", onKey); };
  }, [onClose]);

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

  async function handleSave() {
    if (saving) return;
    if (!name.trim())       { setError("Give this bucket a name."); return; }
    if (!keywords.length)   { setError("Add at least one keyword."); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), keywords, color, feed_ids: feedIds?.length ? feedIds : null, match_mode: matchMode });
    } finally {
      setSaving(false);
    }
  }

  const selectedColor = COLORS.find(c => c.id === color) || COLORS[0];

  return (
    <div style={{
      position: "fixed", inset: 0, background: T.overlay, zIndex: 1100,
      display: "flex", alignItems: mob ? "flex-end" : "center", justifyContent: "center", padding: mob ? 0 : 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="smart-feed-modal-title" style={{
        background: T.card, borderRadius: mob ? "24px 24px 0 0" : 24,
        padding: mob ? "12px 24px calc(22px + env(safe-area-inset-bottom))" : "26px 26px 22px",
        width: "100%", maxWidth: mob ? "none" : "min(460px, 95vw)", maxHeight: "92vh", overflowY: "auto",
        border: `1px solid ${T.border}`,
        boxShadow: SHAPE.shadowFloat,
        animation: mob ? "slideUp .22s ease" : "fadeInScale .18s ease",
      }}>
        <div aria-hidden="true" style={{ display: mob ? "block" : "none", width: 36, height: 4, borderRadius: 2, background: T.border, margin: "0 auto 16px" }} />
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
          <div style={{ flex: 1 }}>
            <h2 id="smart-feed-modal-title" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: T.text, margin: 0 }}>
              {isEdit ? "Edit Smart Feed" : "New Smart Feed"}
            </h2>
            <p style={{ fontSize: 13, color: T.textTertiary, margin: "4px 0 0" }}>
              Articles matching any keyword appear here automatically
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", color: T.textSecondary, fontSize: 22, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="sf-name" style={{ fontSize: 13, fontWeight: 500, color: T.textTertiary, display: "block", marginBottom: 8 }}>Name</label>
          <input
            id="sf-name"
            value={name} onChange={e => { setName(e.target.value); setError(""); }}
            placeholder="e.g. AI Research, Climate, My Startup…"
            style={{ width: "100%", boxSizing: "border-box", height: 48, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "0 14px", fontSize: 16, color: T.text, fontFamily: "inherit", outline: "none" }}
            onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accent}33`; }}
            onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
            autoFocus
          />
        </div>

        {/* Keywords */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="sf-keywords" style={{ fontSize: 13, fontWeight: 500, color: T.textTertiary, display: "block", marginBottom: 8 }}>Keywords</label>
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
              id="sf-keywords"
              value={kwInput}
              onChange={e => setKwInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addKeyword(); } }}
              placeholder="Type keyword, press Enter to add…"
              style={{ flex: 1, minWidth: 0, height: 48, boxSizing: "border-box", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "0 14px", fontSize: 16, color: T.text, fontFamily: "inherit", outline: "none" }}
              onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accent}33`; }}
              onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
            />
            <button onClick={addKeyword} style={{ background: T.accent, border: "none", borderRadius: 14, height: 48, padding: "0 18px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: T.accentText, fontFamily: "inherit" }}>
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
              <label style={{ fontSize: 13, fontWeight: 500, color: T.textTertiary, flex: 1 }}>Search scope</label>
              <button onClick={() => { setFeedIds(null); setShowFeedPicker(false); }} style={{ fontSize: 11, fontWeight: 600, color: !feedIds ? T.accentText : T.textTertiary, background: !feedIds ? T.accentSurface : "transparent", border: `1px solid ${!feedIds ? T.accent : T.border}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", marginRight: 5 }}>All feeds</button>
              <button onClick={() => setShowFeedPicker(v => !v)} aria-expanded={showFeedPicker} style={{ fontSize: 11, fontWeight: 600, color: feedIds ? T.accentText : T.textSecondary, background: feedIds ? T.accentSurface : T.surface2, border: `1px solid ${feedIds ? T.accent : T.border}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" }}>
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

          <label style={{ fontSize: 13, fontWeight: 500, color: T.textTertiary, display: "block", marginBottom: 10 }}>Color</label>
          <div style={{ display: "flex", gap: 8 }}>
            {COLORS.map(c => (
              <button key={c.id} onClick={() => setColor(c.id)} style={{
                width: 28, height: 28, borderRadius: "50%", border: `2.5px solid ${color === c.id ? c.dot : "transparent"}`,
                background: c.bg, cursor: "pointer", transition: "border-color .12s, box-shadow .12s",
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
        <div style={{ display: "flex", gap: 8, alignItems: "center", borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
          {isEdit && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)} style={{ background: "none", border: "none", borderRadius: 14, height: 48, padding: "0 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: T.danger, fontFamily: "inherit" }}>
              Delete
            </button>
          )}
          {isEdit && confirmDelete && (
            <button onClick={() => { onDelete(feed.id); onClose(); }} style={{ background: `${T.danger}22`, border: `1px solid ${T.danger}`, borderRadius: 14, height: 48, padding: "0 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: T.danger, fontFamily: "inherit" }}>
              Confirm delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose} style={{ height: 48, borderRadius: 14, background: "transparent", border: "none" }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} style={{ height: 48, borderRadius: 14, padding: "0 22px" }}>
            {saving ? "Saving…" : (isEdit ? "Save changes" : "Create bucket")}
          </Button>
        </div>
      </div>
    </div>
  );
}
