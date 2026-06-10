// ── CardsPage — Ryan Holiday notecard theme browser ───────────
// Shows highlights grouped by their theme tags.
// Bucket view → click a theme → card list for that theme.
import { useState, useEffect, useMemo } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { Spinner } from "../components/UI";
import TagsInput from "../components/TagsInput";
import { getAllHighlights, addHighlight, updateHighlightNote, updateHighlightTags, deleteHighlight, getHighlightReviews } from "../lib/supabase";
import { HIGHLIGHT_COLORS } from "../components/SelectionToolbar";

const AVATAR_COLORS = ["#2F6FED","#AA8439","#65D5C4","#8B5CF6","#EF4444","#22C55E","#F97316","#EC4899"];
function themeAvatar(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFFFFFF;
  return { letter: (name[0] || "?").toUpperCase(), color: AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] };
}

function navDirScroll(e) {
  const el = e.currentTarget;
  const top = el.scrollTop;
  const delta = top - (el._lastTop ?? top);
  el._lastTop = top;
  if (top < 80) { el._acc = 0; window.dispatchEvent(new CustomEvent("fb-nav-dir", { detail: "up" })); return; }
  if (Math.abs(delta) < 1) return;
  el._acc = (el._acc ?? 0) + delta;
  if (el._acc > 60) { el._acc = 0; window.dispatchEvent(new CustomEvent("fb-nav-dir", { detail: "down" })); }
  else if (el._acc < -60) { el._acc = 0; window.dispatchEvent(new CustomEvent("fb-nav-dir", { detail: "up" })); }
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M5 4V2.5h6V4M6 7v5M10 7v5M3 4l1 9.5h8L13 4"/>
    </svg>
  );
}

export default function CardsPage() {
  const { T } = useTheme();
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const [highlights, setHighlights] = useState([]);
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editNote, setEditNote] = useState("");
  const [showNewCard, setShowNewCard] = useState(false);
  const [sortAZ, setSortAZ] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [cardSearch, setCardSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [newCard, setNewCard] = useState({ passage: "", note: "", color: "yellow", tags: [] });

  const allExistingTags = useMemo(() =>
    [...new Set(highlights.flatMap(h => h.tags || []))].sort(),
  [highlights]);

  const dueSet = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const s = new Set();
    highlights.forEach(h => {
      const r = reviews[h.id];
      if (!r || r.next_review <= today) s.add(h.id);
    });
    return s;
  }, [highlights, reviews]);

  async function saveNote(h) {
    const note = editNote.trim();
    setHighlights(prev => prev.map(x => x.id === h.id ? { ...x, note } : x));
    setEditingId(null);
    try { await updateHighlightNote(h.id, note); } catch {}
  }

  async function updateTags(h, tags) {
    setHighlights(prev => prev.map(x => x.id === h.id ? { ...x, tags } : x));
    try { await updateHighlightTags(h.id, tags); } catch {}
  }

  async function handleDeleteCard(id) {
    setHighlights(prev => prev.filter(x => x.id !== id));
    try { await deleteHighlight(id); } catch {}
  }

  async function createCard() {
    const passage = newCard.passage.trim();
    if (!passage) return;
    const record = { passage, note: newCard.note.trim(), color: newCard.color, tags: newCard.tags };
    setShowNewCard(false);
    setNewCard({ passage: "", note: "", color: "yellow", tags: [] });
    try {
      const saved = await addHighlight(user.id, record);
      setHighlights(prev => [saved, ...prev]);
    } catch {}
  }

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    const lines = [`# Feedbox Highlights`, `*Exported ${today} · ${highlights.length} highlight${highlights.length !== 1 ? "s" : ""} · ${buckets.length} theme${buckets.length !== 1 ? "s" : ""}*`, ""];
    buckets.forEach(([tag, cards]) => {
      lines.push(`## ${tag}`, "");
      cards.forEach(h => {
        lines.push(`> ${(h.passage || "").replace(/\n/g, "\n> ")}`, "");
        if (h.note) lines.push(`**Note:** ${h.note}`, "");
        if ((h.tags || []).length > 1) lines.push(`*Tags: ${h.tags.join(", ")}*`, "");
        lines.push("---", "");
      });
    });
    if (untagged.length) {
      lines.push("## Untagged", "");
      untagged.forEach(h => {
        lines.push(`> ${(h.passage || "").replace(/\n/g, "\n> ")}`, "");
        if (h.note) lines.push(`**Note:** ${h.note}`, "");
        lines.push("---", "");
      });
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `feedbox-highlights-${today}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  useEffect(() => {
    if (!user) return;
    Promise.all([getAllHighlights(user.id), getHighlightReviews(user.id)])
      .then(([hs, rs]) => {
        setHighlights(hs);
        const map = {};
        rs.forEach(r => { map[r.highlight_id] = r; });
        setReviews(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

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

  const globalResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return null;
    return highlights.filter(h =>
      (h.passage || "").toLowerCase().includes(q) ||
      (h.note || "").toLowerCase().includes(q) ||
      (h.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [highlights, globalSearch]);

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <Spinner size={24} />
    </div>
  );

  // ── Card list view (theme selected) ──────────────────────────
  if (selectedTheme) {
    const allCards = selectedTheme === "__untagged__"
      ? untagged
      : buckets.find(([t]) => t === selectedTheme)?.[1] || [];

    const cards = cardSearch.trim()
      ? allCards.filter(h => {
          const q = cardSearch.toLowerCase();
          return (h.passage || "").toLowerCase().includes(q) || (h.note || "").toLowerCase().includes(q);
        })
      : allCards;

    const themeLabel = selectedTheme === "__untagged__" ? "Untagged" : selectedTheme;
    const av = selectedTheme === "__untagged__" ? null : themeAvatar(selectedTheme);

    return (
      <div onScroll={navDirScroll} style={{ flex: 1, overflowY: "auto", background: T.bg, minHeight: 0 }}>
        <div style={{ maxWidth: 740, margin: "0 auto", padding: isMobile ? "16px 14px 100px" : "28px 24px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <button onClick={() => { setSelectedTheme(null); setCardSearch(""); }} style={{
              background: "none", border: "none", cursor: "pointer", color: T.textTertiary,
              fontSize: 13, fontFamily: "inherit", padding: "0 0 8px", display: "flex", alignItems: "center", gap: 4,
            }}
              onMouseEnter={e => e.currentTarget.style.color = T.accent}
              onMouseLeave={e => e.currentTarget.style.color = T.textTertiary}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5"/></svg>
              Cards
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {av && (
                <div style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  background: av.color + "18", border: `1.5px solid ${av.color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: av.color,
                }}>
                  {av.letter}
                </div>
              )}
              <div>
                <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: T.text, letterSpacing: "-.02em" }}>
                  {themeLabel}
                </div>
                <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 1 }}>
                  {allCards.length} card{allCards.length !== 1 ? "s" : ""}
                  {cardSearch && cards.length !== allCards.length ? ` · ${cards.length} matching` : ""}
                </div>
              </div>
            </div>
          </div>

          {/* Search within theme */}
          {allCards.length > 3 && (
            <div style={{ marginBottom: 16, position: "relative" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: T.textTertiary, pointerEvents: "none" }}>
                <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l3.5 3.5"/>
              </svg>
              <input
                value={cardSearch}
                onChange={e => setCardSearch(e.target.value)}
                placeholder="Search passages and notes…"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
                  padding: "9px 12px 9px 32px", fontSize: 13, color: T.text, fontFamily: "inherit",
                  outline: "none", transition: "border-color .12s",
                }}
                onFocus={e => e.target.style.borderColor = T.accent}
                onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>
          )}

          {/* Card stack */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {cards.map(h => {
              const col = HIGHLIGHT_COLORS.find(c => c.id === h.color) || HIGHLIGHT_COLORS[0];
              const isEditing = editingId === h.id;
              return (
                <CardItem
                  key={h.id}
                  h={h}
                  col={col}
                  reviewEntry={reviews[h.id]}
                  isEditing={isEditing}
                  editNote={editNote}
                  allExistingTags={allExistingTags}
                  T={T}
                  onEditStart={() => { setEditingId(h.id); setEditNote(h.note || ""); }}
                  onEditChange={setEditNote}
                  onEditSave={() => saveNote(h)}
                  onEditCancel={() => setEditingId(null)}
                  onUpdateTags={(tags) => updateTags(h, tags)}
                  onTagClick={t => { setSelectedTheme(t); setCardSearch(""); }}
                  onDelete={() => handleDeleteCard(h.id)}
                />
              );
            })}
          </div>

          {cards.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.textTertiary, fontSize: 13 }}>
              {cardSearch ? "No cards match your search." : "No cards in this theme yet."}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Bucket view (all themes) ──────────────────────────────────
  return (
    <div onScroll={navDirScroll} style={{ flex: 1, overflowY: "auto", background: T.bg, minHeight: 0 }}>
      <div style={{ maxWidth: 740, margin: "0 auto", padding: isMobile ? "16px 14px 100px" : "28px 24px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: T.text, letterSpacing: "-.02em" }}>Cards</div>
            <div style={{ fontSize: 13, color: T.textTertiary, marginTop: 3 }}>
              {totalTagged} highlight{totalTagged !== 1 ? "s" : ""} · {buckets.length} theme{buckets.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {highlights.length > 0 && (
              <button
                onClick={handleExport}
                title="Export highlights as Markdown"
                style={{ display:"flex", alignItems:"center", gap:5, background:"transparent", color:T.textTertiary, border:`1px solid ${T.border}`, borderRadius:10, padding:"7px 12px", cursor:"pointer", fontSize:13, fontFamily:"inherit", transition:"color .12s, border-color .12s" }}
                onMouseEnter={e => { e.currentTarget.style.color=T.text; e.currentTarget.style.borderColor=T.borderStrong; }}
                onMouseLeave={e => { e.currentTarget.style.color=T.textTertiary; e.currentTarget.style.borderColor=T.border; }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v9M4 8l4 4 4-4M2 14h12"/></svg>
                {!isMobile && "Export"}
              </button>
            )}
          <button
            onClick={() => setShowNewCard(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: T.accent, color: T.accentText, border: "none",
              borderRadius: 10, padding: "8px 14px", cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit", flexShrink: 0,
              transition: "opacity .12s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 1v10M1 6h10"/></svg>
            New card
          </button>
          </div>
        </div>

        {/* Global search */}
        <div style={{ marginBottom: 16, position: "relative" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: T.textTertiary, pointerEvents: "none" }}>
            <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l3.5 3.5"/>
          </svg>
          <input
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            placeholder="Search all highlights and notes…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: T.surface, border: `1px solid ${globalSearch ? T.accent : T.border}`, borderRadius: 10,
              padding: "9px 12px 9px 32px", fontSize: 13, color: T.text, fontFamily: "inherit",
              outline: "none", transition: "border-color .12s",
            }}
            onFocus={e => e.target.style.borderColor = T.accent}
            onBlur={e => { if (!globalSearch) e.target.style.borderColor = T.border; }}
          />
          {globalSearch && (
            <button onClick={() => setGlobalSearch("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:T.textTertiary, fontSize:16, lineHeight:1, padding:2 }}>×</button>
          )}
        </div>

        {/* New Card Modal */}
        {showNewCard && (
          <div
            onClick={e => { if (e.target === e.currentTarget) setShowNewCard(false); }}
            onKeyDown={e => { if (e.key === "Escape") setShowNewCard(false); }}
            style={{
              position: "fixed", inset: 0, zIndex: 800,
              background: "rgba(0,0,0,.45)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 20, animation: "fadeIn .15s ease",
            }}
          >
            <div style={{
              background: T.card, borderRadius: 18, padding: "24px",
              width: "100%", maxWidth: 500, boxShadow: "0 24px 64px rgba(0,0,0,.3)",
              display: "flex", flexDirection: "column", gap: 16,
            }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.text, letterSpacing: "-.02em" }}>New card</div>

              {/* Passage */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 7 }}>Passage</div>
                <textarea
                  autoFocus
                  value={newCard.passage}
                  onChange={e => setNewCard(p => ({ ...p, passage: e.target.value }))}
                  placeholder="The passage or quote you want to remember…"
                  style={{
                    width: "100%", boxSizing: "border-box", minHeight: 96, resize: "vertical",
                    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
                    padding: "10px 13px", fontSize: 15, color: T.text, lineHeight: 1.65,
                    fontFamily: "var(--reader-font-family)", fontStyle: "italic",
                    outline: "none", transition: "border-color .12s",
                  }}
                  onFocus={e => e.target.style.borderColor = T.accent}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>

              {/* Annotation */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 7 }}>
                  Annotation <span style={{ fontWeight: 400, textTransform: "none", opacity: .7 }}>— optional</span>
                </div>
                <textarea
                  value={newCard.note}
                  onChange={e => setNewCard(p => ({ ...p, note: e.target.value }))}
                  placeholder="Your synthesis in your own words…"
                  style={{
                    width: "100%", boxSizing: "border-box", minHeight: 72, resize: "vertical",
                    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
                    padding: "10px 13px", fontSize: 13, color: T.text, lineHeight: 1.6,
                    fontFamily: "inherit", outline: "none", transition: "border-color .12s",
                  }}
                  onFocus={e => e.target.style.borderColor = T.accent}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>

              {/* Tags */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 7 }}>Tags</div>
                <TagsInput
                  tags={newCard.tags}
                  onAdd={tag => setNewCard(p => ({ ...p, tags: [...new Set([...p.tags, tag])] }))}
                  onRemove={tag => setNewCard(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))}
                  allTags={allExistingTags}
                />
              </div>

              {/* Color */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 7 }}>Highlight color</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {HIGHLIGHT_COLORS.map(c => (
                    <button key={c.id} onClick={() => setNewCard(p => ({ ...p, color: c.id }))}
                      aria-label={c.label}
                      style={{
                        width: 28, height: 28, borderRadius: 8,
                        border: `2.5px solid ${newCard.color === c.id ? c.border : "transparent"}`,
                        background: c.bg, cursor: "pointer", transition: "border-color .12s, box-shadow .12s",
                        boxShadow: newCard.color === c.id ? `0 0 0 2px ${T.bg}, 0 0 0 4px ${c.border}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
                <button onClick={() => setShowNewCard(false)} style={{
                  background: T.surface2, border: "none", borderRadius: 9, padding: "9px 18px",
                  cursor: "pointer", color: T.textSecondary, fontSize: 13, fontFamily: "inherit",
                }}>Cancel</button>
                <button
                  onClick={createCard}
                  disabled={!newCard.passage.trim()}
                  style={{
                    background: newCard.passage.trim() ? T.accent : T.surface2,
                    color: newCard.passage.trim() ? T.accentText : T.textTertiary,
                    border: "none", borderRadius: 9, padding: "9px 22px",
                    cursor: newCard.passage.trim() ? "pointer" : "default",
                    fontSize: 13, fontWeight: 600, fontFamily: "inherit", transition: "background .15s, color .15s",
                  }}
                >Save card</button>
              </div>
            </div>
          </div>
        )}

        {/* Global search results */}
        {globalResults && (
          <div>
            <div style={{ fontSize: 12, color: T.textTertiary, marginBottom: 14 }}>
              {globalResults.length} result{globalResults.length !== 1 ? "s" : ""} for "{globalSearch}"
            </div>
            {globalResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: T.textTertiary, fontSize: 13 }}>No highlights match your search.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {globalResults.map(h => {
                  const col = HIGHLIGHT_COLORS.find(c => c.id === h.color) || HIGHLIGHT_COLORS[0];
                  const isEditing = editingId === h.id;
                  return (
                    <CardItem
                      key={h.id}
                      h={h}
                      col={col}
                      reviewEntry={reviews[h.id]}
                      isEditing={isEditing}
                      editNote={editNote}
                      allExistingTags={allExistingTags}
                      T={T}
                      onEditStart={() => { setEditingId(h.id); setEditNote(h.note || ""); }}
                      onEditChange={setEditNote}
                      onEditSave={() => saveNote(h)}
                      onEditCancel={() => setEditingId(null)}
                      onUpdateTags={(tags) => updateTags(h, tags)}
                      onTagClick={t => { setGlobalSearch(""); setSelectedTheme(t); setCardSearch(""); }}
                      onDelete={() => handleDeleteCard(h.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Filter + sort bar */}
        {!globalResults && (buckets.length > 0 || untagged.length > 0) && (
          <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.textTertiary, pointerEvents: "none" }}>
                <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l3.5 3.5"/>
              </svg>
              <input
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                placeholder="Filter themes…"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
                  padding: "9px 12px 9px 30px", fontSize: 13, color: T.text, fontFamily: "inherit",
                  outline: "none", transition: "border-color .12s",
                }}
                onFocus={e => e.target.style.borderColor = T.accent}
                onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>
            <button
              onClick={() => setSortAZ(v => !v)}
              title={sortAZ ? "Sort by count" : "Sort A→Z"}
              style={{
                background: sortAZ ? T.accentSurface : T.surface, border: `1px solid ${sortAZ ? T.accent : T.border}`,
                borderRadius: 10, padding: "9px 14px", cursor: "pointer", color: sortAZ ? T.accent : T.textSecondary,
                fontSize: 12, fontWeight: 600, fontFamily: "inherit", flexShrink: 0, transition: "background .12s, color .12s, border-color .12s",
                whiteSpace: "nowrap",
              }}
            >{sortAZ ? "A→Z" : "By count"}</button>
          </div>
        )}

        {/* Empty state / bucket grid — hidden during global search */}
        {!globalResults && buckets.length === 0 && untagged.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 38, marginBottom: 14 }}>🗂</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8, letterSpacing: "-.01em" }}>No cards yet</div>
            <div style={{ fontSize: 13, color: T.textTertiary, lineHeight: 1.7, maxWidth: 320, margin: "0 auto 20px" }}>
              Open any article, select a passage to highlight, then add theme tags like "stoicism" or "leadership" to build your knowledge map.
            </div>
            <button onClick={() => setShowNewCard(true)} style={{
              background: T.accentSurface, color: T.accent, border: `1px solid ${T.accent}44`,
              borderRadius: 10, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 600,
              fontFamily: "inherit",
            }}>+ Create your first card</button>
          </div>
        ) : !globalResults ? (
          <>
            {/* Theme grid */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 160 : 200}px, 1fr))`, gap: isMobile ? 10 : 12 }}>
              {buckets.map(([theme, cards]) => {
                const av = themeAvatar(theme);
                const preview = cards[0]?.passage?.slice(0, 90) + (cards[0]?.passage?.length > 90 ? "…" : "");
                const sources = new Set(cards.map(c => c.article_url).filter(Boolean)).size;
                const dueCount = cards.filter(c => dueSet.has(c.id)).length;
                return (
                  <button key={theme} onClick={() => setSelectedTheme(theme)} style={{
                    background: T.card, border: `1px solid ${T.border}`,
                    borderRadius: 16, padding: 0, overflow: "hidden",
                    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    transition: "border-color .15s, box-shadow .15s", display: "flex", flexDirection: "column",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = av.color; e.currentTarget.style.boxShadow = `0 4px 20px ${av.color}1a`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <div style={{ height: 4, background: av.color + "88", flexShrink: 0 }} />
                    <div style={{ padding: isMobile ? "16px" : "18px", flex: 1, display: "flex", flexDirection: "column" }}>
                      {/* Large count — primary visual */}
                      <div style={{ fontSize: 44, fontWeight: 800, color: av.color, letterSpacing: "-.05em", lineHeight: 1, marginBottom: 10 }}>
                        {cards.length}
                      </div>
                      {/* Theme name */}
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: "-.01em", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {theme}
                      </div>
                      {/* Meta: sources + due */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: preview ? 10 : 0 }}>
                        {sources > 0 && (
                          <span style={{ fontSize: 11, color: T.textTertiary }}>
                            {sources} source{sources !== 1 ? "s" : ""}
                          </span>
                        )}
                        {dueCount > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, background: T.accentSurface, color: T.accent, padding: "2px 8px", borderRadius: 20 }}>
                            {dueCount} due
                          </span>
                        )}
                      </div>
                      {/* Preview quote */}
                      {preview && (
                        <div style={{
                          fontSize: 11, color: T.textTertiary, lineHeight: 1.55,
                          fontStyle: "italic", overflow: "hidden", marginTop: "auto",
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        }}>"{preview}"</div>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Untagged tile */}
              {untagged.length > 0 && (
                <button onClick={() => setSelectedTheme("__untagged__")} style={{
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 16, padding: 0, overflow: "hidden",
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  transition: "border-color .15s", display: "flex", flexDirection: "column", opacity: 0.55,
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.textTertiary; e.currentTarget.style.opacity = "1"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.opacity = "0.55"; }}
                >
                  <div style={{ padding: isMobile ? "16px" : "18px" }}>
                    <div style={{ fontSize: 44, fontWeight: 800, color: T.textTertiary, letterSpacing: "-.05em", lineHeight: 1, marginBottom: 10 }}>
                      {untagged.length}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.textSecondary, letterSpacing: "-.01em" }}>Untagged</div>
                    <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 4 }}>no theme yet</div>
                  </div>
                </button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Review status chip helper ─────────────────────────────────
function reviewChip(entry, T) {
  const today = new Date().toISOString().slice(0, 10);
  if (!entry) return { label: "New", color: T.textTertiary, bg: T.surface2 };
  if (entry.next_review <= today) return { label: "Due", color: T.accent, bg: T.accentSurface };
  const days = Math.round((new Date(entry.next_review) - new Date(today)) / 86400000);
  const label = days < 7 ? `In ${days}d` : days < 30 ? `In ${Math.round(days / 7)}w` : `In ${Math.round(days / 30)}mo`;
  return { label, color: T.textTertiary, bg: T.surface2 };
}

// ── Card item component ───────────────────────────────────────
function CardItem({ h, col, isEditing, editNote, allExistingTags, reviewEntry, T, onEditStart, onEditChange, onEditSave, onEditCancel, onUpdateTags, onTagClick, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const chip = reviewChip(reviewEntry, T);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.card, borderRadius: 16,
        border: `1px solid ${isEditing ? T.accent : hovered ? T.borderStrong || col.border + "55" : T.border}`,
        overflow: "hidden", transition: "border-color .15s",
        position: "relative",
      }}
    >
      {/* Passage — tinted with highlight color, left accent border */}
      <div style={{
        padding: "18px 20px 16px",
        background: col.bg + "55",
        borderLeft: `3px solid ${col.border}`,
        position: "relative",
      }}>
        <div style={{
          fontSize: 16, color: T.text, lineHeight: 1.72,
          fontFamily: "var(--reader-font-family)",
          fontStyle: "italic", fontWeight: 400,
          WebkitFontSmoothing: "antialiased",
          paddingRight: hovered ? 36 : 0,
          transition: "padding-right .12s",
        }}>
          "{h.passage}"
        </div>

        {/* Delete — top-right of passage, hover reveal */}
        {hovered && (
          <button
            onClick={onDelete}
            title="Delete card"
            style={{
              position: "absolute", top: 10, right: 10,
              background: T.surface2, border: "none", borderRadius: 7,
              width: 28, height: 28, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.textSecondary, transition: "background .12s, color .12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.danger + "22"; e.currentTarget.style.color = T.danger; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.color = T.textSecondary; }}
          >
            <TrashIcon />
          </button>
        )}
      </div>

      {/* Annotation + tags + footer */}
      <div style={{ padding: "14px 20px 16px" }}>
        {/* Annotation editor */}
        {isEditing ? (
          <textarea
            autoFocus
            value={editNote}
            onChange={e => onEditChange(e.target.value)}
            onBlur={onEditSave}
            onKeyDown={e => { if (e.key === "Escape") onEditCancel(); if (e.key === "Enter" && e.metaKey) onEditSave(); }}
            placeholder="Your annotation in your own words…"
            style={{
              width: "100%", boxSizing: "border-box", fontSize: 13, color: T.text,
              background: T.surface, border: `1px solid ${T.accent}`, borderRadius: 9,
              padding: "9px 11px", marginBottom: 12, lineHeight: 1.6, resize: "vertical",
              fontFamily: "inherit", outline: "none", minHeight: 72,
            }}
          />
        ) : (
          <div
            onClick={onEditStart}
            title="Click to annotate"
            style={{
              fontSize: 13, borderRadius: 9, padding: h.note ? "9px 11px" : "8px 11px",
              marginBottom: 12, lineHeight: 1.6, cursor: "text", minHeight: 38,
              color: h.note ? T.textSecondary : T.textTertiary,
              background: h.note ? T.surface : "transparent",
              border: `1px ${h.note ? "solid" : "dashed"} ${h.note ? T.border : T.border + "88"}`,
              fontStyle: h.note ? "normal" : "italic",
              transition: "background .12s",
            }}
          >
            {h.note || <span style={{ opacity: .55 }}>+ Add annotation…</span>}
          </div>
        )}

        {/* Tags */}
        <TagsInput
          tags={h.tags || []}
          onAdd={tag => onUpdateTags([...new Set([...(h.tags || []), tag])])}
          onRemove={tag => onUpdateTags((h.tags || []).filter(t => t !== tag))}
          allTags={allExistingTags}
          onTagClick={onTagClick}
        />

        {/* Footer: source link + review chip */}
        {(h.article_title || chip.label) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            {h.article_title ? (
              <a
                href={h.article_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 11, color: T.textTertiary, textDecoration: "none",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  flex: 1, minWidth: 0, transition: "color .12s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = T.accent}
                onMouseLeave={e => e.currentTarget.style.color = T.textTertiary}
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2.5h4.5V7M9.5 6.5l4-4M7 3H3.5A1 1 0 0 0 2.5 4v8.5A1 1 0 0 0 3.5 13.5H12A1 1 0 0 0 13 12.5V9"/></svg>
                {h.article_title}
              </a>
            ) : <span />}
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: ".04em",
              padding: "3px 9px", borderRadius: 20, flexShrink: 0,
              background: chip.bg, color: chip.color, marginLeft: 8,
            }}>{chip.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
