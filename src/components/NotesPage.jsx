import { lazy, Suspense, useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { getAllHighlights, deleteHighlight, updateHighlightNote, getAllArticleTags } from "../lib/supabase";
import { allHighlightsToMarkdown, copyToClipboard, downloadFile } from "../lib/exportUtils.js";
import { HIGHLIGHT_COLORS } from "./SelectionToolbar";
import { Spinner, EmptyState } from "./UI";
import { isProUser } from "../lib/plan";

const ContentViewer = lazy(() => import("./ContentViewer"));

// ── Color dot ─────────────────────────────────────────────────
function ColorDot({ colorId }) {
  const colorDef = HIGHLIGHT_COLORS.find(c => c.id === colorId) || HIGHLIGHT_COLORS[0];
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: colorDef.border, flexShrink: 0 }} />;
}

export default function NotesPage() {
  const { T } = useTheme();
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const isPro = isProUser(user);

  const [highlights, setHighlights] = useState([]);
  const [articleTags, setArticleTags]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState("highlights"); // "highlights" | "notes" | "tags"
  const [search, setSearch]             = useState("");
  const [editingNote, setEditingNote]   = useState(null); // highlight id
  const [editNoteVal, setEditNoteVal]   = useState("");
  const [viewingItem, setViewingItem]   = useState(null);
  const [feedback, setFeedback]         = useState(null);
  const [deleting, setDeleting]         = useState(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getAllHighlights(user.id),
      isPro ? getAllArticleTags(user.id) : Promise.resolve([]),
    ])
      .then(([h, t]) => { setHighlights(h); setArticleTags(t); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // ── Filtered highlights ───────────────────────────────────
  function getFiltered() {
    let items = highlights;
    if (tab === "notes") items = items.filter(h => h.note?.trim());
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(h =>
        h.passage?.toLowerCase().includes(q) ||
        h.note?.toLowerCase().includes(q) ||
        h.article_title?.toLowerCase().includes(q)
      );
    }
    return items;
  }

  const filtered = getFiltered();

  // Group highlights by article
  const grouped = new Map();
  filtered.forEach(h => {
    const key = h.article_url || "";
    if (!grouped.has(key)) {
      grouped.set(key, { title: h.article_title || h.article_url || "Untitled", url: h.article_url, items: [] });
    }
    grouped.get(key).items.push(h);
  });

  // Group tags by article
  const tagsByArticle = new Map();
  articleTags.forEach(t => {
    if (!tagsByArticle.has(t.article_url)) {
      tagsByArticle.set(t.article_url, { title: t.article_title || t.article_url || "Untitled", url: t.article_url, tags: [] });
    }
    const art = tagsByArticle.get(t.article_url);
    if (!art.tags.includes(t.tag)) art.tags.push(t.tag);
  });

  const filteredTagsArticles = search.trim()
    ? [...tagsByArticle.values()].filter(a =>
        a.title?.toLowerCase().includes(search.toLowerCase()) ||
        a.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      )
    : [...tagsByArticle.values()];

  const totalNotes = highlights.filter(h => h.note?.trim()).length;

  // ── Actions ───────────────────────────────────────────────
  async function handleDelete(id) {
    setDeleting(id);
    try {
      await deleteHighlight(id);
      setHighlights(prev => prev.filter(h => h.id !== id));
    } finally { setDeleting(null); }
  }

  async function handleSaveNote(id) {
    await updateHighlightNote(id, editNoteVal);
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, note: editNoteVal } : h));
    setEditingNote(null);
  }

  async function handleExportAll(asFile) {
    const md = allHighlightsToMarkdown(getFiltered());
    if (!md) return;
    if (asFile) {
      downloadFile(md, `feedbox-notes-${new Date().toISOString().slice(0, 10)}.md`);
    } else {
      const ok = await copyToClipboard(md);
      setFeedback(ok ? "✓ Copied" : "Failed");
      setTimeout(() => setFeedback(null), 2200);
    }
  }

  const tabs = [
    { id: "highlights", label: "Highlights", count: highlights.length },
    { id: "notes",      label: "Notes",      count: totalNotes },
    ...(isPro ? [{ id: "tags", label: "Tags", count: tagsByArticle.size }] : []),
  ];

  const isEmpty = tab === "tags" ? filteredTagsArticles.length === 0 : filtered.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", background: T.bg }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: `1px solid ${T.border}`, flexShrink: 0, padding: isMobile ? "12px 16px 0" : "0 20px" }}>

        {/* Title + search + export */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, height: isMobile ? "auto" : 52, paddingBottom: isMobile ? 10 : 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: "-.01em" }}>Notes</span>
          {!loading && (
            <span style={{ fontSize: 11, fontWeight: 600, background: T.accent, color: "#fff", padding: "1px 7px", borderRadius: 10, flexShrink: 0 }}>
              {tab === "tags" ? filteredTagsArticles.length : filtered.length}
            </span>
          )}

          {/* Desktop search */}
          {!isMobile && (
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search highlights & notes…"
              style={{ flex: 1, maxWidth: 300, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: "7px 12px", fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none" }}
              onFocus={e => { e.target.style.borderColor = T.accent; }}
              onBlur={e => { e.target.style.borderColor = T.border; }}
            />
          )}

          <div style={{ flex: 1 }} />

          {/* Export — desktop only */}
          {!isMobile && filtered.length > 0 && tab !== "tags" && (
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={() => handleExportAll(false)} style={{
                background: feedback ? T.accentSurface : T.surface2,
                border: `1px solid ${feedback ? T.accent : T.border}`,
                borderRadius: 8, padding: "5px 12px", cursor: "pointer",
                fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                color: feedback ? T.accent : T.textSecondary,
              }}>
                {feedback || "Copy MD"}
              </button>
              <button onClick={() => handleExportAll(true)} style={{
                background: T.surface2, border: `1px solid ${T.border}`,
                borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                fontSize: 11, color: T.textSecondary, fontFamily: "inherit",
              }}>↓ .md</button>
            </div>
          )}
        </div>

        {/* Mobile search */}
        {isMobile && (
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            style={{ width: "100%", boxSizing: "border-box", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 12px", fontSize: 14, color: T.text, fontFamily: "inherit", outline: "none", marginBottom: 10 }}
            onFocus={e => { e.target.style.borderColor = T.accent; }}
            onBlur={e => { e.target.style.borderColor = T.border; }}
          />
        )}

        {/* Tab bar */}
        <div style={{ display: "flex", marginBottom: -1 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: isMobile ? "9px 14px" : "8px 16px",
              background: "none", border: "none",
              borderBottom: `2px solid ${tab === t.id ? T.accent : "transparent"}`,
              color: tab === t.id ? T.accent : T.textTertiary,
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              cursor: "pointer", fontFamily: "inherit",
              transition: "color .15s, border-color .15s", whiteSpace: "nowrap",
            }}>
              {t.label}
              {t.count > 0 && (
                <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.65 }}>({t.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "14px 14px 90px" : "16px 20px 40px" }}>

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <Spinner size={28} />
          </div>
        )}

        {!loading && isEmpty && (
          <EmptyState
            icon={tab === "tags" ? "🏷️" : "✍️"}
            title={
              search ? "No matches"
                : tab === "notes" ? "No notes yet"
                : tab === "tags" ? "No tagged articles"
                : "No highlights yet"
            }
            subtitle={
              search ? `Nothing matched "${search}"`
                : tab === "tags" ? "Open an article and add tags to organise your reading."
                : "Open an article and select text to create your first highlight."
            }
          />
        )}

        {/* ── Tags view ── */}
        {!loading && tab === "tags" && !isEmpty && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredTagsArticles.map(({ title, url, tags }) => (
              <div key={url} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {title}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => setViewingItem({ url, title, source: "" })}
                      style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 8px", fontSize: 11, color: T.textSecondary, cursor: "pointer", fontFamily: "inherit", transition: "all .12s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; }}
                    >Re-read</button>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: T.textTertiary, textDecoration: "none", lineHeight: "22px" }}
                      onMouseEnter={e => { e.currentTarget.style.color = T.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.color = T.textTertiary; }}
                    >↗</a>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {tags.map(tag => (
                    <span key={tag} onClick={() => setSearch(tag)}
                      style={{ padding: "3px 10px", borderRadius: 20, background: T.accentSurface, border: `1px solid ${T.accent}30`, color: T.accent, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "background .12s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = T.accentSurface; e.currentTarget.style.color = T.accent; }}
                    >#{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Highlights / Notes view ── */}
        {!loading && tab !== "tags" && !isEmpty && [...grouped.values()].map(({ title, url, items: groupItems }) => (
          <div key={url || title} style={{ marginBottom: 24 }}>

            {/* Article header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {title}
              </div>
              <span style={{ fontSize: 11, color: T.textTertiary, flexShrink: 0 }}>
                {groupItems.length} highlight{groupItems.length !== 1 ? "s" : ""}
              </span>
              {url && (
                <button onClick={() => setViewingItem({ url, title, source: "" })}
                  style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 8px", fontSize: 11, color: T.textSecondary, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, transition: "all .12s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; }}
                >Re-read</button>
              )}
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: T.textTertiary, textDecoration: "none", flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.color = T.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.color = T.textTertiary; }}
                >↗</a>
              )}
            </div>

            {/* Highlight cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groupItems.map(h => {
                const colorDef = HIGHLIGHT_COLORS.find(c => c.id === h.color) || HIGHLIGHT_COLORS[0];
                const isEditing = editingNote === h.id;
                return (
                  <div key={h.id} style={{
                    background: T.card, border: `1px solid ${T.border}`,
                    borderLeft: `3px solid ${colorDef.border}`,
                    borderRadius: 9, padding: "12px 14px 10px 14px",
                    position: "relative",
                  }}
                    onMouseEnter={e => { const btn = e.currentTarget.querySelector(".del-btn"); if (btn) btn.style.opacity = "1"; }}
                    onMouseLeave={e => { const btn = e.currentTarget.querySelector(".del-btn"); if (btn) btn.style.opacity = isMobile ? "0.5" : "0"; }}
                  >
                    {/* Passage */}
                    <p style={{ fontSize: 13.5, color: T.text, lineHeight: 1.7, fontStyle: "italic", margin: "0 0 8px", paddingRight: 28 }}>
                      "{h.passage}"
                    </p>

                    {/* Note editor / display */}
                    {isEditing ? (
                      <div style={{ marginBottom: 6 }}>
                        <textarea
                          autoFocus
                          value={editNoteVal}
                          onChange={e => setEditNoteVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSaveNote(h.id);
                            if (e.key === "Escape") setEditingNote(null);
                          }}
                          style={{ width: "100%", boxSizing: "border-box", background: T.surface2, border: `1.5px solid ${T.accent}`, borderRadius: 7, padding: "8px 10px", fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 64 }}
                        />
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <button onClick={() => handleSaveNote(h.id)} style={{ background: T.accent, border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Save</button>
                          <button onClick={() => setEditingNote(null)} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 12, color: T.textSecondary, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                        </div>
                      </div>
                    ) : h.note ? (
                      <div onClick={() => { setEditingNote(h.id); setEditNoteVal(h.note); }}
                        style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.6, background: T.surface, borderRadius: 7, padding: "8px 10px", marginBottom: 6, cursor: "text" }}>
                        <strong style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: T.textTertiary, display: "block", marginBottom: 3 }}>
                          Note <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— tap to edit</span>
                        </strong>
                        {h.note}
                      </div>
                    ) : (
                      <button onClick={() => { setEditingNote(h.id); setEditNoteVal(""); }}
                        style={{ background: "none", border: `1px dashed ${T.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 12, color: T.textTertiary, cursor: "pointer", fontFamily: "inherit", marginBottom: 6 }}>
                        + Add a note…
                      </button>
                    )}

                    {/* Meta row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <ColorDot colorId={h.color} />
                      <span style={{ fontSize: 11, color: T.textTertiary, flex: 1 }}>
                        {h.created_at ? new Date(h.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                      </span>
                    </div>

                    {/* Delete button — top right, hidden on desktop until hover */}
                    <button
                      className="del-btn"
                      onClick={() => handleDelete(h.id)}
                      disabled={deleting === h.id}
                      title="Delete highlight"
                      style={{
                        position: "absolute", top: 10, right: 10,
                        background: "none", border: "none",
                        padding: "3px 6px", cursor: "pointer", borderRadius: 5,
                        color: T.textTertiary, fontSize: 14,
                        opacity: isMobile ? 0.5 : 0,
                        transition: "opacity .12s, color .12s",
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = T.textTertiary; }}
                    >
                      {deleting === h.id ? "…" : "✕"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Mobile export bar — shown at bottom when highlights exist */}
        {isMobile && !loading && filtered.length > 0 && tab !== "tags" && (
          <div style={{ display: "flex", gap: 8, paddingTop: 8, paddingBottom: 4 }}>
            <button onClick={() => handleExportAll(false)} style={{ flex: 1, background: feedback ? T.accentSurface : T.surface2, border: `1px solid ${feedback ? T.accent : T.border}`, borderRadius: 10, padding: "10px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", color: feedback ? T.accent : T.textSecondary }}>
              {feedback || "Copy all as Markdown"}
            </button>
            <button onClick={() => handleExportAll(true)} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 13, color: T.textSecondary, fontFamily: "inherit" }}>↓</button>
          </div>
        )}
      </div>

      {/* ── ContentViewer overlay ── */}
      {viewingItem && (
        <Suspense fallback={null}>
          <ContentViewer item={viewingItem} onClose={() => setViewingItem(null)} />
        </Suspense>
      )}
    </div>
  );
}
