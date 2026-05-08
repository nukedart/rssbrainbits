// ── CardsPage — Ryan Holiday notecard theme browser ───────────
// Shows highlights grouped by their theme tags.
// Bucket view → click a theme → card list for that theme.
import { useState, useEffect, useMemo } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { Spinner } from "../components/UI";
import { getAllHighlights, addHighlight, updateHighlightNote, updateHighlightTags } from "../lib/supabase";
import { HIGHLIGHT_COLORS } from "../components/SelectionToolbar";

// Consistent color avatar derived from theme name
const AVATAR_COLORS = ["#2F6FED","#AA8439","#65D5C4","#8B5CF6","#EF4444","#22C55E","#F97316","#EC4899"];
function themeAvatar(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFFFFFF;
  return { letter: (name[0] || "?").toUpperCase(), color: AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] };
}

// Shared scroll-direction dispatcher
function navDirScroll(e) {
  const el = e.currentTarget, top = el.scrollTop, prev = el._lastScrollTop ?? 0;
  el._lastScrollTop = top;
  if (top < 60) { window.dispatchEvent(new CustomEvent("fb-nav-dir", { detail: "up" })); return; }
  if (Math.abs(top - prev) < 4) return;
  window.dispatchEvent(new CustomEvent("fb-nav-dir", { detail: top > prev ? "down" : "up" }));
}

export default function CardsPage() {
  const { T } = useTheme();
  const { user } = useAuth();
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [editingId, setEditingId] = useState(null);   // which card's note is open
  const [editNote, setEditNote] = useState("");
  const [tagInputs, setTagInputs] = useState({});     // highlightId → draft tag string
  const [showNewCard, setShowNewCard] = useState(false);
  const [sortAZ, setSortAZ] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [newCard, setNewCard] = useState({ passage: "", note: "", color: "yellow", tagDraft: "" });

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

  function handleNewCardKey(e) {
    if (e.key === "Escape") setShowNewCard(false);
  }

  async function createCard() {
    const passage = newCard.passage.trim();
    if (!passage) return;
    const tags = newCard.tagDraft.trim()
      ? [...new Set(newCard.tagDraft.split(",").map(t => t.trim().toLowerCase()).filter(Boolean))]
      : [];
    const record = { passage, note: newCard.note.trim(), color: newCard.color, tags };
    setShowNewCard(false);
    setNewCard({ passage: "", note: "", color: "yellow", tagDraft: "" });
    try {
      const saved = await addHighlight(user.id, record);
      setHighlights(prev => [saved, ...prev]);
    } catch {}
  }

  useEffect(() => {
    if (!user) return;
    getAllHighlights(user.id)
      .then(setHighlights)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // theme → highlight[] map, sorted + filtered
  const buckets = useMemo(() => {
    const map = {};
    highlights.forEach(h => {
      (h.tags || []).forEach(tag => {
        if (!map[tag]) map[tag] = [];
        map[tag].push(h);
      });
    });
    let entries = Object.entries(map);
    if (filterQuery.trim()) {
      const q = filterQuery.trim().toLowerCase();
      entries = entries.filter(([t]) => t.toLowerCase().includes(q));
    }
    return entries.sort((a, b) => sortAZ
      ? a[0].localeCompare(b[0])
      : b[1].length - a[1].length);
  }, [highlights, sortAZ, filterQuery]);

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
      <div onScroll={navDirScroll} style={{ flex: 1, overflowY: "auto", background: T.bg, minHeight: 0, animation: "fadeIn .15s ease" }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {cards.map(h => {
              const col = HIGHLIGHT_COLORS.find(c => c.id === h.color) || HIGHLIGHT_COLORS[0];
              const allTags = h.tags || [];
              const isEditing = editingId === h.id;
              return (
                <div key={h.id} style={{
                  background: T.card, borderRadius: 12,
                  border: `1px solid ${isEditing ? T.accent : T.border}`,
                  overflow: "hidden",
                  transition: "border-color .15s",
                }}>
                  {/* Passage — color-tinted background, serif font */}
                  <div style={{
                    padding: "16px 18px 14px",
                    background: col.bg + "22",
                    borderBottom: `1px solid ${col.bg}44`,
                  }}>
                    <div style={{
                      fontSize: 15, color: T.text, lineHeight: 1.7,
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontStyle: "italic", fontWeight: 500,
                    }}>
                      "{h.passage}"
                    </div>
                  </div>

                  <div style={{ padding: "12px 18px 14px" }}>
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
                          width: "100%", boxSizing: "border-box", fontSize: 13, color: T.text,
                          background: T.surface, border: `1px solid ${T.accent}`, borderRadius: 8,
                          padding: "8px 10px", marginBottom: 10, lineHeight: 1.55, resize: "vertical",
                          fontFamily: "inherit", outline: "none", minHeight: 64,
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => { setEditingId(h.id); setEditNote(h.note || ""); }}
                        title="Click to annotate"
                        style={{
                          fontSize: 13, borderRadius: 8, padding: h.note ? "8px 10px" : "7px 10px",
                          marginBottom: 10, lineHeight: 1.55, cursor: "text", minHeight: 36,
                          color: h.note ? T.textSecondary : T.textTertiary,
                          background: h.note ? T.surface : "transparent",
                          border: `1px dashed ${h.note ? "transparent" : T.border}`,
                          fontStyle: h.note ? "normal" : "italic",
                        }}
                      >
                        {h.note || "+ Add annotation"}
                      </div>
                    )}

                    {/* Source — clickable */}
                    {h.article_title && (
                      <a
                        href={h.article_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block", fontSize: 11, color: T.textTertiary,
                          marginBottom: allTags.length ? 10 : 0,
                          textDecoration: "none", transition: "color .12s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = T.accent}
                        onMouseLeave={e => e.currentTarget.style.color = T.textTertiary}
                      >
                        ↗ {h.article_title}
                      </a>
                    )}

                    {/* Tags */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                      {allTags.map(t => (
                        <span key={t} style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          fontSize: 11, padding: "2px 6px 2px 8px", borderRadius: 20,
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
                          fontSize: 11, padding: "2px 6px", borderRadius: 20, border: `1px dashed ${T.border}`,
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
    <div onScroll={navDirScroll} style={{ flex: 1, overflowY: "auto", background: T.bg, minHeight: 0, animation: "fadeIn .15s ease" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: "-.02em" }}>Cards</div>
            <div style={{ fontSize: 13, color: T.textTertiary, marginTop: 4 }}>
              {totalTagged} tagged highlight{totalTagged !== 1 ? "s" : ""} · {buckets.length} theme{buckets.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            onClick={() => setShowNewCard(true)}
            aria-label="New card"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: T.accent, color: T.accentText, border: "none",
              borderRadius: 10, padding: "8px 14px", cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              flexShrink: 0, transition: "opacity .12s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New card
          </button>
        </div>

        {/* ── New Card Modal ── */}
        {showNewCard && (
          <div
            onClick={e => { if (e.target === e.currentTarget) setShowNewCard(false); }}
            onKeyDown={handleNewCardKey}
            style={{
              position: "fixed", inset: 0, zIndex: 800,
              background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 20, animation: "fadeIn .15s ease",
            }}
          >
            <div style={{
              background: T.card, borderRadius: 16, padding: "24px",
              width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,.3)",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>New card</div>

              {/* Passage */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>Passage</div>
                <textarea
                  autoFocus
                  value={newCard.passage}
                  onChange={e => setNewCard(p => ({ ...p, passage: e.target.value }))}
                  placeholder="The passage or quote you want to remember…"
                  style={{
                    width: "100%", boxSizing: "border-box", minHeight: 90, resize: "vertical",
                    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
                    padding: "10px 12px", fontSize: 14, color: T.text, lineHeight: 1.6,
                    fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic",
                    outline: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = T.accent}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>

              {/* Annotation */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>Annotation <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></div>
                <textarea
                  value={newCard.note}
                  onChange={e => setNewCard(p => ({ ...p, note: e.target.value }))}
                  placeholder="Your thoughts in your own words…"
                  style={{
                    width: "100%", boxSizing: "border-box", minHeight: 64, resize: "vertical",
                    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
                    padding: "10px 12px", fontSize: 13, color: T.text, lineHeight: 1.55,
                    fontFamily: "inherit", outline: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = T.accent}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>

              {/* Tags + Color row */}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>Tags</div>
                  <input
                    value={newCard.tagDraft}
                    onChange={e => setNewCard(p => ({ ...p, tagDraft: e.target.value }))}
                    placeholder="stoicism, leadership…"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
                      padding: "8px 10px", fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none",
                    }}
                    onFocus={e => e.target.style.borderColor = T.accent}
                    onBlur={e => e.target.style.borderColor = T.border}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>Color</div>
                  <div style={{ display: "flex", gap: 6, paddingTop: 4 }}>
                    {HIGHLIGHT_COLORS.map(c => (
                      <button key={c.id} onClick={() => setNewCard(p => ({ ...p, color: c.id }))}
                        aria-label={c.label}
                        style={{
                          width: 24, height: 24, borderRadius: 6, border: `2px solid ${newCard.color === c.id ? c.border : "transparent"}`,
                          background: c.bg, cursor: "pointer", transition: "border-color .1s",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button onClick={() => setShowNewCard(false)} style={{
                  background: T.surface2, border: "none", borderRadius: 8, padding: "8px 16px",
                  cursor: "pointer", color: T.textSecondary, fontSize: 13, fontFamily: "inherit",
                }}>Cancel</button>
                <button
                  onClick={createCard}
                  disabled={!newCard.passage.trim()}
                  style={{
                    background: newCard.passage.trim() ? T.accent : T.surface2,
                    color: newCard.passage.trim() ? T.accentText : T.textTertiary,
                    border: "none", borderRadius: 8, padding: "8px 20px",
                    cursor: newCard.passage.trim() ? "pointer" : "default",
                    fontSize: 13, fontWeight: 600, fontFamily: "inherit", transition: "all .15s",
                  }}
                >Save card</button>
              </div>
            </div>
          </div>
        )}

        {/* Filter + sort bar */}
        {(buckets.length > 0 || untagged.length > 0) && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
            <input
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="Filter themes…"
              style={{
                flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: "7px 12px", fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
            />
            <button
              onClick={() => setSortAZ(v => !v)}
              title={sortAZ ? "Sort by count" : "Sort A→Z"}
              style={{
                background: sortAZ ? T.accentSurface : T.surface, border: `1px solid ${sortAZ ? T.accent : T.border}`,
                borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: sortAZ ? T.accent : T.textSecondary,
                fontSize: 12, fontWeight: 600, fontFamily: "inherit", flexShrink: 0, transition: "all .12s",
              }}
            >{sortAZ ? "A→Z" : "#"}</button>
          </div>
        )}

        {buckets.length === 0 && untagged.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 8 }}>No cards yet</div>
            <div style={{ fontSize: 13, color: T.textTertiary, lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
              Open any article and highlight a passage. Add a theme tag like "stoicism" or "leadership" in the note panel to create your first card.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {buckets.map(([theme, cards]) => {
              const av = themeAvatar(theme);
              const preview = cards[0]?.passage?.slice(0, 72) + (cards[0]?.passage?.length > 72 ? "…" : "");
              return (
                <button key={theme} onClick={() => setSelectedTheme(theme)} style={{
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 14, padding: "16px 16px 14px",
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  transition: "border-color .12s, box-shadow .12s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = av.color; e.currentTarget.style.boxShadow = `0 0 0 1px ${av.color}44`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}
                >
                  {/* Letter avatar */}
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, marginBottom: 12,
                    background: av.color + "22", border: `1px solid ${av.color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 700, color: av.color,
                    fontFamily: "inherit",
                  }}>{av.letter}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{theme}</div>
                  <div style={{ fontSize: 11, color: T.textTertiary, marginBottom: preview ? 8 : 0 }}>
                    {cards.length} card{cards.length !== 1 ? "s" : ""}
                  </div>
                  {preview && (
                    <div style={{
                      fontSize: 11, color: T.textTertiary, lineHeight: 1.5,
                      fontStyle: "italic", overflow: "hidden",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    }}>"{preview}"</div>
                  )}
                </button>
              );
            })}
            {untagged.length > 0 && (
              <button onClick={() => setSelectedTheme("__untagged__")} style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 14, padding: "16px 16px 14px",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                transition: "border-color .12s", opacity: 0.7,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.textTertiary; e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.opacity = "0.7"; }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10, marginBottom: 12,
                  background: T.surface2, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 15, color: T.textTertiary,
                }}>?</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, marginBottom: 4 }}>Untagged</div>
                <div style={{ fontSize: 11, color: T.textTertiary }}>{untagged.length} highlight{untagged.length !== 1 ? "s" : ""}</div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
