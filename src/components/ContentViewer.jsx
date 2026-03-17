import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { Button, Spinner } from "./UI";
import { fetchArticleContent, summarizeContent, parseYouTubeUrl } from "../lib/fetchers";
import SelectionToolbar, { HIGHLIGHT_COLORS } from "./SelectionToolbar";
import NotePanel from "./NotePanel";
import HighlightsDrawer from "./HighlightsDrawer";
import TagsInput from "./TagsInput";
import {
  saveItem, addHighlight, getHighlights, updateHighlightNote, deleteHighlight,
  getArticleTags, addArticleTag, deleteArticleTag, getAllTags,
  getReadingProgress, setReadingProgress,
} from "../lib/supabase";
import { getReaderPrefs, setReaderPrefs } from "../lib/readerPrefs.js";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { highlightsToMarkdown, copyToClipboard, downloadFile } from "../lib/exportUtils.js";

export default function ContentViewer({ item, onClose }) {
  const { T } = useTheme();
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();

  // Article
  const [content, setContent]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [saved, setSaved]         = useState(false);

  // AI summary
  const [summary, setSummary]         = useState(null);
  const [summarizing, setSummarizing] = useState(false);

  // Highlights
  const [highlights, setHighlights]   = useState([]);
  const [activeNote, setActiveNote]   = useState(null);
  const [showDrawer, setShowDrawer]   = useState(false);

  // Tags
  const [tags, setTags]         = useState([]);
  const [allTags, setAllTags]   = useState([]);
  const [showTags, setShowTags] = useState(false);

  // Reader preferences
  const [readerPrefs, setReaderPrefsState] = useState(() => getReaderPrefs());
  const [showReaderControls, setShowReaderControls] = useState(false);
  const [exportFeedback, setExportFeedback]   = useState(null);
  const [readProgress, setReadProgress]         = useState(0);
  const [shareFeedback, setShareFeedback]       = useState(null);
  const scrollContainerRef = useRef(null);

  const articleRef = useRef(null);
  const yt = item?.url ? parseYouTubeUrl(item.url) : { isYouTube: false };

  // ── Fetch article ──────────────────────────────────────────
  // After the initial fetch, if bodyText is very short (truncated RSS feed),
  // silently attempt a full-text fetch from the article URL.
  useEffect(() => {
    if (!item || yt.isYouTube) return;
    setLoading(true); setError(null);
    fetchArticleContent(item.url)
      .then(async (result) => {
        setContent(result);
        // Auto-upgrade: if content is truncated (< 300 chars), try fetching full text
        const TRUNCATION_THRESHOLD = 300;
        if ((result.bodyText?.length || 0) < TRUNCATION_THRESHOLD && item.url) {
          try {
            const full = await fetchArticleContent(item.url);
            // Only upgrade if we actually got more content
            if ((full.bodyText?.length || 0) > (result.bodyText?.length || 0)) {
              setContent(full);
            }
          } catch {
            // Silent fail — truncated content is still shown
          }
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [item?.url]);

  // ── Load highlights + tags ─────────────────────────────────
  useEffect(() => {
    if (!user || !item?.url) return;
    getHighlights(user.id, item.url).then(setHighlights).catch(console.error);
    // Load saved reading progress
    getReadingProgress(user.id, item.url).then(prog => {
      setReadProgress(prog);
      // Restore scroll position after content loads
      if (prog > 0) {
        setTimeout(() => {
          const el = scrollContainerRef.current;
          if (el) el.scrollTop = (prog / 100) * (el.scrollHeight - el.clientHeight);
        }, 400);
      }
    }).catch(console.error);
    getArticleTags(user.id, item.url).then((rows) => setTags(rows.map((r) => r.tag))).catch(console.error);
    getAllTags(user.id).then(setAllTags).catch(console.error);
  }, [user, item?.url]);

  // ── Highlight actions ──────────────────────────────────────
  const handleHighlight = useCallback(async ({ passage, color, position }) => {
    if (!user) return;
    const newH = await addHighlight(user.id, {
      article_url: item.url, article_title: content?.title || item.title,
      passage, color, position,
    });
    setHighlights((prev) => [...prev, newH]);
  }, [user, item, content]);

  async function handleSaveNote(highlightId, note) {
    await updateHighlightNote(highlightId, note);
    setHighlights((prev) => prev.map((h) => (h.id === highlightId ? { ...h, note } : h)));
  }

  async function handleDeleteHighlight(highlightId) {
    await deleteHighlight(highlightId);
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
  }

  // ── Tag actions ────────────────────────────────────────────
  async function handleAddTag(tag) {
    await addArticleTag(user.id, item.url, content?.title || item.title, tag);
    setTags((prev) => [...prev, tag]);
    if (!allTags.includes(tag)) setAllTags((prev) => [...prev, tag].sort());
  }

  async function handleRemoveTag(tag) {
    const rows = await getArticleTags(user.id, item.url);
    const row = rows.find((r) => r.tag === tag);
    if (row) await deleteArticleTag(row.id);
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  // ── Save ───────────────────────────────────────────────────
  async function handleSave() {
    await saveItem(user.id, { ...item, summary });
    setSaved(true);
  }

  function updatePref(key, val) {
    const updated = setReaderPrefs({ [key]: val });
    setReaderPrefsState({ ...updated });
  }

  // ── Scroll progress tracking ─────────────────────────────
  function handleScroll(e) {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return;
    const pct = Math.round((el.scrollTop / max) * 100);
    setReadProgress(pct);
    // Debounce Supabase write — only save every 5% change
    if (Math.abs(pct - (handleScroll._last || 0)) >= 5) {
      handleScroll._last = pct;
      setReadingProgress(user.id, item.url, pct).catch(console.error);
    }
  }

  // ── Share ─────────────────────────────────────────────────
  async function handleShare() {
    const title = content?.title || item.title || "Article";
    const url   = item.url;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch { /* user cancelled — no feedback needed */ }
    }
    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setShareFeedback("✓ Link copied");
      setTimeout(() => setShareFeedback(null), 2000);
    } catch {
      setShareFeedback("Copy failed");
      setTimeout(() => setShareFeedback(null), 2000);
    }
  }

  async function handleExportHighlights(asFile = false) {
    const md = highlightsToMarkdown(highlights, content?.title || item.title, item.url);
    if (!md) return;
    if (asFile) {
      const slug = (content?.title || item.title || "article").slice(0, 40).replace(/[^a-z0-9]/gi, "-").toLowerCase();
      downloadFile(md, `feedbox-highlights-${slug}.md`);
    } else {
      const ok = await copyToClipboard(md);
      setExportFeedback(ok ? "✓ Copied to clipboard" : "Copy failed");
      setTimeout(() => setExportFeedback(null), 2200);
    }
  }

  // ── AI Summary ─────────────────────────────────────────────
  async function handleSummarize() {
    const text = content?.bodyText || item?.description || "";
    if (!text) return;
    setSummarizing(true);
    const result = await summarizeContent(text, content?.title || item?.title);
    setSummary(result);
    setSummarizing(false);
  }

  if (!item) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: T.bg, zIndex: 500,
      borderLeft: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>

      {/* ── Reading progress bar — always visible track ── */}
      <div style={{ height: 3, background: T.surface2, flexShrink: 0, position: "relative" }}>
        <div style={{
          position: "absolute", inset: 0, right: `${100 - readProgress}%`,
          background: `linear-gradient(90deg, ${T.accent}, ${T.teal || T.accent})`,
          transition: "right .25s ease",
          borderRadius: "0 2px 2px 0",
          opacity: readProgress > 0 ? 1 : 0,
        }} />
      </div>

      {/* ── Top bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: T.card, borderBottom: `1px solid ${T.border}`,
        padding: isMobile ? "10px 12px" : "12px 16px", display: "flex", alignItems: "center", gap: isMobile ? 8 : 10,
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          background: T.surface2, border: "none", borderRadius: 8,
          width: 32, height: 32, cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", color: T.textSecondary,
          fontSize: 18, fontFamily: "inherit", flexShrink: 0,
        }}>←</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.source || "Feedbox"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Tags */}
          <button onClick={() => setShowTags((v) => !v)} style={{
            background: showTags ? T.accentSurface : T.surface2,
            border: "none", borderRadius: 8, padding: "6px 10px",
            cursor: "pointer", fontSize: 12, fontWeight: 600,
            color: showTags ? T.accentText : T.textSecondary, fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <TagIcon size={13} color="currentColor" />
            {tags.length > 0 && <span>{tags.length}</span>}
          </button>

          {/* Highlights — export MD + drawer button */}
          {!yt.isYouTube && highlights.length > 0 && (
            <button onClick={() => handleExportHighlights(false)} title={exportFeedback || "Copy highlights as Markdown"} style={{
              background: exportFeedback ? T.accentSurface : T.surface2,
              border: `1px solid ${exportFeedback ? T.accent : T.border}`,
              borderRadius: 8, padding: "6px 10px",
              cursor: "pointer", fontSize: 11, fontWeight: 600,
              color: exportFeedback ? T.accentText : T.textSecondary, fontFamily: "inherit",
              transition: "all .15s",
            }}>
              {exportFeedback || "↓ MD"}
            </button>
          )}
          {!yt.isYouTube && (
            <button onClick={() => setShowDrawer(true)} style={{
              background: T.surface2, border: "none", borderRadius: 8,
              padding: "6px 10px", cursor: "pointer",
              fontSize: 12, fontWeight: 600, color: T.textSecondary,
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5,
            }}>
              <HighlightIcon size={13} color="currentColor" />
              {highlights.length > 0 && <span style={{ color: T.accent }}>{highlights.length}</span>}
            </button>
          )}

          {/* Reader controls */}
          {!yt.isYouTube && content && (
            <button onClick={() => setShowReaderControls(v => !v)} title="Reading preferences" style={{
              background: showReaderControls ? T.accentSurface : T.surface2,
              border: "none", borderRadius: 8, padding: "6px 10px",
              cursor: "pointer", fontSize: 12, fontWeight: 700,
              color: showReaderControls ? T.accentText : T.textSecondary,
              fontFamily: "inherit", flexShrink: 0,
            }}>Aa</button>
          )}
          <button onClick={handleShare} title={shareFeedback || "Share article"} style={{
            background: shareFeedback ? T.accentSurface : T.surface2,
            border: "none", borderRadius: 8, padding: "6px 10px",
            cursor: "pointer", fontSize: 11, fontWeight: 600, flexShrink: 0,
            color: shareFeedback ? T.accentText : T.textSecondary,
            fontFamily: "inherit", transition: "all .15s",
          }}>
            {shareFeedback || "Share"}
          </button>
          <Button variant="secondary" size="sm" onClick={() => window.open(item.url, "_blank")}>↗</Button>
          <Button size="sm" onClick={handleSave} disabled={saved}>{saved ? "✓" : "Save"}</Button>
        </div>
      </div>

      {/* ── Tags bar ── */}
      {showTags && (
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "10px 16px", flexShrink: 0 }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: T.textTertiary, marginBottom: 8 }}>Tags</div>
            <TagsInput tags={tags} onAdd={handleAddTag} onRemove={handleRemoveTag} allTags={allTags} />
          </div>
        </div>
      )}



      {/* ── Main content — scroll container ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: "auto", position: "relative" }}
      >
        {/* Aa floating reader controls — sticky inside scroll area */}
        {showReaderControls && (
          <div style={{
            position: "sticky", top: 12, zIndex: 20,
            maxWidth: "var(--reader-line-width)", margin: "12px auto 0",
            padding: "0 20px",
          }}>
            <div style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 14, padding: "12px 16px",
              boxShadow: "0 4px 20px rgba(0,0,0,.12)",
              display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 140px" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".06em" }}>Size</span>
                <input type="range" min="14" max="22" step="1" value={readerPrefs.fontSize}
                  onChange={e => updatePref("fontSize", parseInt(e.target.value))}
                  style={{ flex: 1, accentColor: T.accent }} />
                <span style={{ fontSize: 11, color: T.textSecondary, minWidth: 26 }}>{readerPrefs.fontSize}px</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".06em", marginRight: 2 }}>Width</span>
                {["narrow","medium","wide"].map(w => (
                  <button key={w} onClick={() => updatePref("lineWidth", w)} style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${readerPrefs.lineWidth===w?T.accent:T.border}`, background: readerPrefs.lineWidth===w?T.accentSurface:"transparent", color: readerPrefs.lineWidth===w?T.accentText:T.textSecondary, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", textTransform: "capitalize" }}>{w}</button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".06em", marginRight: 2 }}>Font</span>
                {[{id:"sans",label:"Sans"},{id:"serif",label:"Serif"}].map(f => (
                  <button key={f.id} onClick={() => updatePref("fontFamily", f.id)} style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${readerPrefs.fontFamily===f.id?T.accent:T.border}`, background: readerPrefs.fontFamily===f.id?T.accentSurface:"transparent", color: readerPrefs.fontFamily===f.id?T.accentText:T.textSecondary, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>{f.label}</button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".06em" }}>Bionic</span>
                <button onClick={() => updatePref("bionic", !readerPrefs.bionic)} style={{ width: 32, height: 18, borderRadius: 9, border: "none", cursor: "pointer", background: readerPrefs.bionic?T.accent:T.border, position: "relative", transition: "background .2s", flexShrink: 0 }}>
                  <span style={{ position: "absolute", top: 2, left: readerPrefs.bionic?16:2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .18s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
                </button>
              </div>
              <button onClick={() => setShowReaderControls(false)} style={{ marginLeft: "auto", background: T.surface2, border: "none", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.textSecondary, fontSize: 16, fontFamily: "inherit" }}>×</button>
            </div>
          </div>
        )}

        <div style={{ maxWidth: "var(--reader-line-width)", margin: "0 auto", padding: isMobile ? "20px 16px 100px" : "28px 20px 100px", width: "100%" }}>

        {/* YouTube */}
        {yt.isYouTube && (
          <div>
            <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 20, aspectRatio: "16/9" }}>
              <iframe src={`https://www.youtube.com/embed/${yt.videoId}`} title="YouTube video"
                style={{ width: "100%", height: "100%", border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 8px", lineHeight: 1.3 }}>{item.title}</h1>
            {item.source && <div style={{ fontSize: 12, color: T.textTertiary, marginBottom: 20 }}>{item.source}</div>}
            <SummaryBlock summary={summary} summarizing={summarizing} onSummarize={handleSummarize} T={T} />
          </div>
        )}

        {/* Article loading */}
        {!yt.isYouTube && loading && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}><Spinner size={28} /></div>
        )}

        {/* Article error */}
        {!yt.isYouTube && error && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 14, color: T.danger, marginBottom: 16 }}>Couldn't load article content.</div>
            <Button variant="secondary" onClick={() => window.open(item.url, "_blank")}>Open in browser ↗</Button>
          </div>
        )}

        {/* Article content */}
        {!yt.isYouTube && content && (
          <div>
            {content.image && (
              <img src={content.image} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 20, maxHeight: 320, objectFit: "cover" }} />
            )}
            <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, margin: "0 0 8px", lineHeight: 1.3 }}>
              {content.title || item.title}
            </h1>
            {item.source && <div style={{ fontSize: 12, color: T.textTertiary, marginBottom: 4 }}>{item.source}</div>}
            {item.date && (
              <div style={{ fontSize: 12, color: T.textTertiary, marginBottom: 20 }}>
                {new Date(item.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
            )}

            <SummaryBlock summary={summary} summarizing={summarizing} onSummarize={handleSummarize} T={T} />

            {content.description && (
              <p style={{ fontSize: 16, color: T.textSecondary, lineHeight: 1.7, margin: "0 0 24px", fontStyle: "italic" }}>
                {content.description}
              </p>
            )}

            {/* Article body with highlights */}
            <div ref={articleRef} style={{ fontSize: "var(--reader-font-size)", color: T.text, lineHeight: 1.85, wordBreak: "break-word", fontFamily: "var(--reader-font-family)" }}>
              <HighlightedText
                text={content.bodyText}
                highlights={highlights}
                onClickHighlight={setActiveNote}
                bionic={readerPrefs.bionic}
              />
            </div>
          </div>
        )}

        {/* Selection toolbar */}
        {!yt.isYouTube && content && (
          <SelectionToolbar containerRef={articleRef} onHighlight={handleHighlight} />
        )}
        </div>{/* closes inner maxWidth wrapper */}

        {/* ── Scroll to top FAB ── */}
        {readProgress > 8 && (
          <button
            onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            title="Back to top"
            style={{
              position: "sticky", bottom: isMobile ? 74 : 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginLeft: "auto", marginRight: 16, marginBottom: 16,
              width: 38, height: 38, borderRadius: "50%",
              background: T.card, border: `1px solid ${T.border}`,
              boxShadow: "0 2px 12px rgba(0,0,0,.15)",
              cursor: "pointer", fontSize: 18, color: T.textSecondary,
              transition: "all .15s", zIndex: 20,
              animation: "fadeInScale .2s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background=T.accentSurface; e.currentTarget.style.color=T.accent; }}
            onMouseLeave={e => { e.currentTarget.style.background=T.card; e.currentTarget.style.color=T.textSecondary; }}
          >↑</button>
        )}
      </div>{/* closes scrollContainerRef */}

      {/* ── Note panel ── */}
      {activeNote && (
        <NotePanel highlight={activeNote} onSave={handleSaveNote} onDelete={handleDeleteHighlight} onClose={() => setActiveNote(null)} />
      )}

      {/* ── Highlights drawer ── */}
      {showDrawer && (
        <HighlightsDrawer highlights={highlights}
          articleTitle={content?.title || item?.title}
          articleUrl={item?.url}
          onSelectHighlight={(h) => { setActiveNote(h); setShowDrawer(false); }}
          onClose={() => setShowDrawer(false)} />
      )}
    </div>
  );
}

// ── HighlightedText — clean version without TTS word spans ───
function HighlightedText({ text, highlights, onClickHighlight, bionic = false }) {
  if (!text) return null;

  // Bionic: bold first ~45% of each word
  function BionicSpan({ word }) {
    const n = Math.max(1, Math.ceil(word.length * 0.45));
    return <><strong style={{ fontWeight: 700 }}>{word.slice(0, n)}</strong>{word.slice(n)}</>;
  }

  // Render plain text with optional bionic mode (no highlights)
  if (!highlights || highlights.length === 0) {
    if (!bionic) return <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>;
    const tokens = text.split(/(\s+)/);
    return (
      <span style={{ whiteSpace: "pre-wrap" }}>
        {tokens.map((t, i) => /\S/.test(t) ? <BionicSpan key={i} word={t} /> : t)}
      </span>
    );
  }

  const intervals = [];
  highlights.forEach((h) => {
    const idx = text.indexOf(h.passage);
    if (idx !== -1) intervals.push({ start: idx, end: idx + h.passage.length, highlight: h });
  });
  intervals.sort((a, b) => a.start - b.start);

  const segments = [];
  let cursor = 0;
  intervals.forEach(({ start, end, highlight }) => {
    if (start < cursor) return;
    if (start > cursor) segments.push({ type: "text", content: text.slice(cursor, start) });
    segments.push({ type: "highlight", content: text.slice(start, end), highlight });
    cursor = end;
  });
  if (cursor < text.length) segments.push({ type: "text", content: text.slice(cursor) });

  return (
    <span style={{ whiteSpace: "pre-wrap" }}>
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.content}</span>;
        const colorDef = HIGHLIGHT_COLORS.find((c) => c.id === seg.highlight.color) || HIGHLIGHT_COLORS[0];
        return (
          <mark key={i}
            onClick={() => onClickHighlight(seg.highlight)}
            title={seg.highlight.note ? "Note: " + seg.highlight.note : "Click to add a note"}
            style={{
              backgroundColor: colorDef.bg, borderRadius: 3, padding: "1px 0",
              cursor: "pointer", background: colorDef.bg,
              borderBottom: seg.highlight.note ? `2px solid ${colorDef.border}` : "none",
            }}
          >{seg.content}</mark>
        );
      })}
    </span>
  );
}

// ── SummaryBlock — no TTS play button ────────────────────────
function SummaryBlock({ summary, summarizing, onSummarize, T }) {
  if (summary) {
    return (
      <div style={{ background: T.accentSurface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: T.accentText, marginBottom: 10 }}>
          ✨ AI Summary
        </div>
        <div style={{ fontSize: 14, color: T.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{summary}</div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 24 }}>
      <Button variant="secondary" onClick={onSummarize} disabled={summarizing}>
        {summarizing ? "Summarizing…" : "✨ Summarize with AI"}
      </Button>
    </div>
  );
}

// ── Small inline SVG icons ────────────────────────────────────
function TagIcon({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2h5l7 7-5 5-7-7V2z"/>
      <circle cx="5" cy="5" r="1" fill={color} stroke="none"/>
    </svg>
  );
}

function HighlightIcon({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 2.5l3 3-7 7H3.5v-3l7-7z"/>
      <path d="M2 14h4" strokeWidth="1.5"/>
    </svg>
  );
}
