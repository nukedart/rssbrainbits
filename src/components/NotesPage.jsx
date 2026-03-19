import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { getAllHighlights } from "../lib/supabase";
import { allHighlightsToMarkdown, copyToClipboard, downloadFile } from "../lib/exportUtils.js";
import { HIGHLIGHT_COLORS } from "./SelectionToolbar";
import { Spinner, EmptyState } from "./UI";

// ── Color dot for highlight color ─────────────────────────────
function ColorDot({ colorId }) {
  const colorDef = HIGHLIGHT_COLORS.find(c => c.id === colorId) || HIGHLIGHT_COLORS[0];
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: colorDef.border, flexShrink: 0 }} />;
}

export default function NotesPage({ onOpenArticle }) {
  const { T } = useTheme();
  const { user } = useAuth();

  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("all"); // "all" | "notes"
  const [search, setSearch]         = useState("");
  const [feedback, setFeedback]     = useState(null);

  useEffect(() => {
    if (!user) return;
    getAllHighlights(user.id)
      .then(setHighlights)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  async function handleExportAll(asFile) {
    const filtered = getFiltered();
    const md = allHighlightsToMarkdown(filtered);
    if (!md) return;
    if (asFile) {
      downloadFile(md, `feedbox-notes-${new Date().toISOString().slice(0,10)}.md`);
    } else {
      const ok = await copyToClipboard(md);
      setFeedback(ok ? "✓ Copied to clipboard" : "Copy failed");
      setTimeout(() => setFeedback(null), 2200);
    }
  }

  function getFiltered() {
    let items = highlights;
    if (filter === "notes") items = items.filter(h => h.note?.trim());
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

  // Group by article
  const filtered = getFiltered();
  const grouped  = new Map();
  filtered.forEach(h => {
    const key = h.article_url || "";
    if (!grouped.has(key)) {
      grouped.set(key, {
        title: h.article_title || h.article_url || "Untitled article",
        url: h.article_url,
        items: [],
      });
    }
    grouped.get(key).items.push(h);
  });

  const totalNotes = highlights.filter(h => h.note?.trim()).length;

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", background: T.bg }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Toolbar */}
        <div style={{ padding: "0 16px", height: 52, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: "-.01em" }}>Notes</div>
          {!loading && (
            <span style={{ fontSize: 11, fontWeight: 600, background: T.accent, color: "#fff", padding: "1px 7px", borderRadius: 10 }}>
              {filtered.length}
            </span>
          )}

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 340 }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search highlights & notes…"
              style={{ width: "100%", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: "7px 12px", fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none" }}
              onFocus={e => { e.target.style.borderColor = T.accent; }}
              onBlur={e => { e.target.style.borderColor = T.border; }}
            />
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 2, background: T.surface2, borderRadius: 8, padding: 3 }}>
            {[{ id:"all", label:"All" }, { id:"notes", label:`Notes (${totalNotes})` }].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: "4px 10px", borderRadius: 6, border: "none",
                background: filter === f.id ? T.card : "transparent",
                color: filter === f.id ? T.text : T.textTertiary,
                cursor: "pointer", fontSize: 12, fontWeight: 600,
                boxShadow: filter === f.id ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                fontFamily: "inherit", transition: "all .15s",
              }}>{f.label}</button>
            ))}
          </div>

          {/* Export */}
          {filtered.length > 0 && (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => handleExportAll(false)} style={{
                background: feedback ? T.accentSurface : T.surface2,
                border: `1px solid ${feedback ? T.accent : T.border}`,
                borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                color: feedback ? T.accentText : T.textSecondary, transition: "all .15s",
              }}>
                {feedback || "Copy all as MD"}
              </button>
              <button onClick={() => handleExportAll(true)} style={{
                background: T.surface2, border: `1px solid ${T.border}`,
                borderRadius: 8, padding: "6px 10px", cursor: "pointer",
                fontSize: 11, fontWeight: 600, color: T.textSecondary, fontFamily: "inherit",
              }}>↓ .md</button>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
              <Spinner size={28} />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <EmptyState
              icon="✍️"
              title={search ? "No matches" : filter === "notes" ? "No notes yet" : "No highlights yet"}
              subtitle={search ? `Nothing matched "${search}"` : "Open an article and select text to create your first highlight."}
            />
          )}

          {!loading && [...grouped.values()].map(({ title, url, items: groupItems }) => (
            <div key={url || title} style={{ marginBottom: 28 }}>
              {/* Article header */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {title}
                  </div>
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: T.textTertiary, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}
                      onMouseEnter={e => { e.target.style.color = T.accent; }}
                      onMouseLeave={e => { e.target.style.color = T.textTertiary; }}>
                      {url}
                    </a>
                  )}
                </div>
                <span style={{ fontSize: 11, color: T.textTertiary, flexShrink: 0 }}>
                  {groupItems.length} highlight{groupItems.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Highlights in this article */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {groupItems.map(h => {
                  const colorDef = HIGHLIGHT_COLORS.find(c => c.id === h.color) || HIGHLIGHT_COLORS[0];
                  return (
                    <div key={h.id} style={{
                      background: T.card, border: `1px solid ${T.border}`,
                      borderLeft: `3px solid ${colorDef.border}`,
                      borderRadius: 9, padding: "12px 14px 12px 16px",
                    }}>
                      {/* Passage */}
                      <p style={{ fontSize: 13.5, color: T.text, lineHeight: 1.7, fontStyle: "italic", margin: "0 0 8px" }}>
                        "{h.passage}"
                      </p>
                      {/* Note */}
                      {h.note ? (
                        <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.6, background: T.surface, borderRadius: 7, padding: "8px 10px" }}>
                          <strong style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: T.textTertiary, display: "block", marginBottom: 3 }}>Note</strong>
                          {h.note}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: T.textTertiary }}>No note</div>
                      )}
                      {/* Meta */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <ColorDot colorId={h.color} />
                        <span style={{ fontSize: 11, color: T.textTertiary }}>
                          {h.created_at ? new Date(h.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
