// ── CardsPage — Ryan Holiday notecard theme browser ───────────
// Shows highlights grouped by their theme tags.
// Bucket view → click a theme → card list for that theme.
import { useState, useEffect, useMemo } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { Spinner } from "../components/UI";
import { getAllHighlights, updateHighlightNote, updateHighlightTags } from "../lib/supabase";
import { HIGHLIGHT_COLORS } from "../components/SelectionToolbar";

export default function CardsPage() {
  const { T } = useTheme();
  const { user } = useAuth();
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [editingId, setEditingId] = useState(null);   // which card's note is open
  const [editNote, setEditNote] = useState("");
  const [tagInputs, setTagInputs] = useState({});     // highlightId → draft tag string

  async function saveNote(h) {
    const note = editNote.trim();
    setHighlights(prev => prev.map(x => x.id === h.id ? { ...x, note } : x));
    setEditingId(null);
    try { await updateHighlightNote(h.id, note); } catch {}
  }

  async function removeTag(h, tag) {
    const tags = (h.tags || []).filter(t => t !== tag);
    setHighlights(prev => prev.map(x => x.id === h.id ? { ...x, tags } : x));
    try { await updateHighlightTags(h.id, tags); } catch {}
  }

  async function commitTag(h) {
    const raw = (tagInputs[h.id] || "").trim().toLowerCase();
    if (!raw) return;
    const tags = [...new Set([...(h.tags || []), raw])];
    setHighlights(prev => prev.map(x => x.id === h.id ? { ...x, tags } : x));
    setTagInputs(prev => ({ ...prev, [h.id]: "" }));
    try { await updateHighlightTags(h.id, tags); } catch {}
  }

  useEffect(() => {
    if (!user) return;
    getAllHighlights(user.id)
      .then(setHighlights)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // theme → highlight[] map, sorted by count desc
  const buckets = useMemo(() => {
    const map = {};
    highlights.forEach(h => {
      (h.tags || []).forEach(tag => {
        if (!map[tag]) map[tag] = [];
        map[tag].push(h);
      });
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [highlights]);

  const untagged = useMemo(() =>
    highlights.filter(h => !(h.tags || []).length),
  [highlights]);

  const totalTagged = useMemo(() =>
    new Set(highlights.filter(h => (h.tags || []).length > 0).map(h => h.id)).size,
  [highlights]);

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <Spinner size={24} />
    </div>
  );

  // ── Card list view (theme selected) ───────────────────────
  if (selectedTheme) {
    const cards = selectedTheme === "__untagged__"
      ? untagged
      : buckets.find(([t]) => t === selectedTheme)?.[1] || [];
    return (
      <div style={{ flex: 1, overflowY: "auto", background: T.bg, minHeight: 0 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <button onClick={() => setSelectedTheme(null)} style={{
              background: T.surface2, border: "none", borderRadius: 8, padding: "6px 12px",
              cursor: "pointer", color: T.textSecondary, fontSize: 13, fontFamily: "inherit",
            }}>← All themes</button>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{selectedTheme === "__untagged__" ? "Untagged" : selectedTheme}</div>
              <div style={{ fontSize: 12, color: T.textTertiary }}>{cards.length} card{cards.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cards.map(h => {
              const col = HIGHLIGHT_COLORS.find(c => c.id === h.color) || HIGHLIGHT_COLORS[0];
              const allTags = h.tags || [];
              const isEditing = editingId === h.id;
              return (
                <div key={h.id} style={{
                  background: T.card, borderRadius: 12,
                  border: `1px solid ${isEditing ? T.accent : T.border}`,
                  overflow: "hidden", display: "flex",
                  transition: "border-color .15s",
                }}>
                  <div style={{ width: 4, background: col.border, flexShrink: 0 }} />
                  <div style={{ padding: "14px 16px", flex: 1 }}>
                    {/* Passage — always read-only */}
                    <div style={{ fontSize: 14, color: T.text, lineHeight: 1.65, fontStyle: "italic", marginBottom: 8 }}>
                      "{h.passage}"
                    </div>

                    {/* Note — click to edit */}
                    {isEditing ? (
                      <textarea
                        autoFocus
                        value={editNote}
                        onChange={e => setEditNote(e.target.value)}
                        onBlur={() => saveNote(h)}
                        onKeyDown={e => { if (e.key === "Escape") { setEditingId(null); } }}
                        placeholder="Your annotation…"
                        style={{
                          width: "100%", boxSizing: "border-box", fontSize: 12, color: T.text,
                          background: T.surface, border: `1px solid ${T.accent}`, borderRadius: 8,
                          padding: "7px 10px", marginBottom: 8, lineHeight: 1.5, resize: "vertical",
                          fontFamily: "inherit", outline: "none", minHeight: 60,
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => { setEditingId(h.id); setEditNote(h.note || ""); }}
                        title="Click to edit annotation"
                        style={{
                          fontSize: 12, borderRadius: 8, padding: "7px 10px", marginBottom: 8,
                          lineHeight: 1.5, cursor: "text", minHeight: 34,
                          color: h.note ? T.textSecondary : T.textTertiary,
                          background: h.note ? T.surface : "transparent",
                          border: `1px dashed ${h.note ? "transparent" : T.border}`,
                          fontStyle: h.note ? "normal" : "italic",
                        }}
                      >
                        {h.note || "Add an annotation…"}
                      </div>
                    )}

                    {/* Source */}
                    <div style={{ fontSize: 11, color: T.textTertiary, marginBottom: allTags.length ? 8 : 0 }}>
                      {h.article_title || "Untitled"}
                    </div>

                    {/* Tags — always editable */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                      {allTags.map(t => (
                        <span key={t} style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          fontSize: 10, padding: "2px 6px 2px 8px", borderRadius: 20,
                          background: T.accentSurface, color: T.accent, border: `1px solid ${T.accent}44`,
                        }}>
                          <span onClick={() => setSelectedTheme(t)} style={{ cursor: "pointer" }}>{t}</span>
                          <button onClick={() => removeTag(h, t)} style={{
                            background: "none", border: "none", cursor: "pointer", color: T.accent,
                            fontSize: 11, lineHeight: 1, padding: "0 1px", fontFamily: "inherit",
                          }} aria-label={`Remove tag ${t}`}>×</button>
                        </span>
                      ))}
                      <input
                        value={tagInputs[h.id] || ""}
                        onChange={e => setTagInputs(prev => ({ ...prev, [h.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commitTag(h); } }}
                        onBlur={() => commitTag(h)}
                        placeholder="+ tag"
                        style={{
                          fontSize: 10, padding: "2px 6px", borderRadius: 20, border: `1px dashed ${T.border}`,
                          background: "transparent", color: T.textTertiary, fontFamily: "inherit",
                          outline: "none", width: 44, minWidth: 0,
                        }}
                      />
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

  // ── Bucket view (all themes) ───────────────────────────────
  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg, minHeight: 0 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: "-.02em" }}>Cards</div>
          <div style={{ fontSize: 13, color: T.textTertiary, marginTop: 4 }}>
            {totalTagged} tagged highlight{totalTagged !== 1 ? "s" : ""} · {buckets.length} theme{buckets.length !== 1 ? "s" : ""}
          </div>
        </div>

        {buckets.length === 0 && untagged.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 8 }}>No cards yet</div>
            <div style={{ fontSize: 13, color: T.textTertiary, lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
              Open any article and highlight a passage. Add a theme tag like "stoicism" or "leadership" in the note panel to create your first card.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {buckets.map(([theme, cards]) => (
              <button key={theme} onClick={() => setSelectedTheme(theme)} style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 14, padding: "18px 16px",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                transition: "border-color .12s, background .12s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = T.accentSurface; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; }}
              >
                <div style={{ fontSize: 22, marginBottom: 10 }}>📇</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{theme}</div>
                <div style={{ fontSize: 12, color: T.textTertiary }}>{cards.length} card{cards.length !== 1 ? "s" : ""}</div>
              </button>
            ))}
            {untagged.length > 0 && (
              <button onClick={() => setSelectedTheme("__untagged__")} style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 14, padding: "18px 16px",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                transition: "border-color .12s, background .12s",
                opacity: 0.7,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.textTertiary; e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.opacity = "0.7"; }}
              >
                <div style={{ fontSize: 22, marginBottom: 10 }}>📌</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, marginBottom: 4 }}>Untagged</div>
                <div style={{ fontSize: 12, color: T.textTertiary }}>{untagged.length} highlight{untagged.length !== 1 ? "s" : ""}</div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
