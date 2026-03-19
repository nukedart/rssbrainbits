import { useState, useEffect, useRef, useCallback } from "react";
import { useSwipe } from "../hooks/useSwipe.js";
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
import { track } from "../lib/analytics";

export default function ContentViewer({ item, onClose, onNext, onPrev }) {
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
  const [retryKey, setRetryKey] = useState(0);
  const [exportFeedback, setExportFeedback]   = useState(null);
  const [readProgress, setReadProgress]         = useState(0);
  const [shareFeedback, setShareFeedback]       = useState(null);
  const scrollContainerRef = useRef(null);

  const articleRef = useRef(null);
  const lastSavedProgressRef = useRef(0);
  const yt = item?.url ? parseYouTubeUrl(item.url) : { isYouTube: false };

  // ── Fetch article ──────────────────────────────────────────
  useEffect(() => {
    if (!item || yt.isYouTube) return;

    // Short-circuit: if feed has fetch_full_content and RSS provided fullText, use it
    if (item.fetchFullContent && item.fullText && item.fullText.length > 200) {
      setContent({
        title: item.title,
        description: item.description || "",
        bodyText: item.fullText,
        image: item.image || null,
        url: item.url,
      });
      setLoading(false);
      return;
    }

    setLoading(true); setError(null);
    fetchArticleContent(item.url)
      .then(async (result) => {
        setContent(result);
        // Auto-upgrade: if content is truncated (< 300 chars), silently retry
        if ((result.bodyText?.length || 0) < 300 && item.url) {
          try {
            const full = await fetchArticleContent(item.url);
            if ((full.bodyText?.length || 0) > (result.bodyText?.length || 0)) {
              setContent(full);
            }
          } catch { /* silent fail */ }
        }
      })
      .catch((e) => setError(classifyArticleError(e.message)))
      .finally(() => setLoading(false));
  }, [item?.url, retryKey]);

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
    track("article_highlighted", { color, passage_length: passage.length, source: item.source });
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
    if (Math.abs(pct - lastSavedProgressRef.current) >= 5) {
      lastSavedProgressRef.current = pct;
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
    track("highlights_exported", { format: asFile ? "file" : "clipboard", count: highlights.length });
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
    track("ai_summary_triggered", { source: item?.source });
    const result = await summarizeContent(text, content?.title || item?.title);
    setSummary(result);
    setSummarizing(false);
  }

  // ── Swipe gestures (mobile) ──────────────────────────────
  const swipeHandlers = useSwipe({
    // Swipe right from left edge = go back (close)
    onSwipeRight: () => { if (isMobile) onClose(); },
    edgeOnly: true,
    edgePx: 40,
    threshold: 50,
    // Swipe left = next article
    onSwipeLeft: () => { if (isMobile && onNext) onNext(); },
  });

  if (!item) return null;

  return (
    <div
      {...(isMobile ? swipeHandlers : {})}
      style={{
        position: "fixed", inset: 0, background: T.bg, zIndex: 500,
        borderLeft: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >

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
          width: isMobile ? 38 : 32, height: isMobile ? 38 : 32,
          cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", color: T.textSecondary,
          fontSize: isMobile ? 20 : 18, fontFamily: "inherit", flexShrink: 0,
          WebkitTapHighlightColor: "transparent",
        }}>←</button>

        {/* Mobile prev/next arrows */}
        {isMobile && onPrev && (
          <button onClick={onPrev} title="Previous article"
            style={{ background: T.surface2, border: "none", borderRadius: 8, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textSecondary, fontSize: 16, flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>‹</button>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 14 : 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.source || "Feedbox"}
          </div>
        </div>

        {isMobile && onNext && (
          <button onClick={onNext} title="Next article"
            style={{ background: T.surface2, border: "none", borderRadius: 8, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textSecondary, fontSize: 16, flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>›</button>
        )}

        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {/* Aa — font controls */}
          {!yt.isYouTube && content && (
            <button onClick={() => setShowReaderControls(v => !v)} title="Reading preferences"
              style={{ background: showReaderControls ? T.accentSurface : "transparent", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: showReaderControls ? T.accentText : T.textTertiary, fontFamily: "inherit", flexShrink: 0, transition: "all .12s" }}
              onMouseEnter={e => { if (!showReaderControls) { e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.textSecondary; }}}
              onMouseLeave={e => { if (!showReaderControls) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textTertiary; }}}
            >Aa</button>
          )}

          {/* Save */}
          <button onClick={handleSave} disabled={saved}
            style={{ background: saved ? T.accentSurface : "transparent", border: "none", borderRadius: 8, padding: "6px 10px", cursor: saved ? "default" : "pointer", fontSize: 12, fontWeight: 600, color: saved ? T.accentText : T.textTertiary, fontFamily: "inherit", transition: "all .12s", flexShrink: 0 }}
            onMouseEnter={e => { if (!saved) { e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.textSecondary; }}}
            onMouseLeave={e => { if (!saved) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textTertiary; }}}
          >{saved ? "✓ Saved" : "Save"}</button>

          {/* ··· overflow menu */}
          <OverflowMenu
            T={T}
            item={item}
            content={content}
            yt={yt}
            saved={saved}
            highlights={highlights}
            tags={tags}
            showTags={showTags}
            setShowTags={setShowTags}
            showDrawer={showDrawer}
            setShowDrawer={setShowDrawer}
            handleShare={handleShare}
            shareFeedback={shareFeedback}
            handleExportHighlights={handleExportHighlights}
            exportFeedback={exportFeedback}
          />
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



      {/* ── Aa reader controls — pinned below header, always visible when open ── */}
      {showReaderControls && (
        <div style={{
          flexShrink: 0, borderBottom: `1px solid ${T.border}`,
          background: T.card, padding: "10px 16px",
          display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center",
          animation: "slideDown .15s ease",
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
      )}

      {/* ── Main content — scroll container ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: "auto", position: "relative" }}
      >
        <div style={{ maxWidth: "var(--reader-line-width)", margin: "0 auto", padding: isMobile ? "20px 18px 140px" : "40px 32px 120px", width: "100%" }}>

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
          <div style={{ textAlign: "center", padding: "40px 20px", maxWidth: 360, margin: "0 auto" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>Couldn't load article</div>
            <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 20, lineHeight: 1.6 }}>{error}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <Button onClick={() => { setRetryKey(k => k + 1); }}>↺ Retry</Button>
              <Button variant="secondary" onClick={() => window.open(item.url, "_blank")}>Open in browser ↗</Button>
            </div>
          </div>
        )}

        {/* Article content */}
        {!yt.isYouTube && content && (
          <div>
            {content.image && (
              <img src={content.image} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 20, maxHeight: 320, objectFit: "cover" }} />
            )}
            <h1 style={{ fontSize: 26, fontWeight: 600, color: T.text, margin: "0 0 10px", lineHeight: 1.25, letterSpacing: "-.02em" }}>
              {content.title || item.title}
            </h1>
            {item.source && <div style={{ fontSize: 12, fontWeight: 500, color: T.accent, marginBottom: 4, letterSpacing: ".01em" }}>{item.source}</div>}
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
            <div ref={articleRef} style={{ fontSize: "var(--reader-font-size)", color: T.text, lineHeight: 1.9, wordBreak: "break-word", fontFamily: "var(--reader-font-family)", letterSpacing: "-.005em" }}>
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

// ── Article error classifier ──────────────────────────────────
function classifyArticleError(msg = "") {
  if (msg.includes("block") || msg.includes("Could not reach"))
    return "This site blocks external requests. Try opening it directly in your browser.";
  if (msg.includes("timed out") || msg.includes("abort") || msg.includes("Timeout"))
    return "The request timed out. The site may be slow or temporarily unavailable.";
  if (msg.includes("404") || msg.includes("Not Found"))
    return "Article not found (404) — the URL may have changed or been deleted.";
  if (msg.includes("403") || msg.includes("Forbidden") || msg.includes("401"))
    return "Access denied — this article may require a subscription or login.";
  if (msg.includes("Invalid") || msg.includes("parse"))
    return "Couldn't parse the page content.";
  return msg || "Something went wrong loading this article.";
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

// ── SummaryBlock ──────────────────────────────────────────────
function SummaryBlock({ summary, summarizing, onSummarize, T }) {
  if (summary) {
    // Parse bullet points — handles •, -, *, **bold**: prefix, numbered lists
    const bullets = summary
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => l
        .replace(/^[•\-\*]\s*/, "")           // strip leading bullet chars
        .replace(/^\d+\.\s*/, "")              // strip numbered list prefix
        .replace(/^\*\*[^*]+\*\*:\s*/, "")     // strip **Bold label**: prefix
        .replace(/\*\*([^*]+)\*\*/g, "$1")     // strip remaining **bold** markers
        .trim()
      )
      .filter(l => l.length > 10);

    return (
      <div style={{ background: T.accentSurface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: T.accentText, marginBottom: 12 }}>
          ✨ AI Summary
        </div>
        {bullets.length > 0 ? (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {bullets.map((point, i) => (
              <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: T.accent, fontWeight: 700, fontSize: 16, lineHeight: "1.5", flexShrink: 0, marginTop: 1 }}>•</span>
                <span style={{ fontSize: 14, color: T.text, lineHeight: 1.65 }}>{point}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{summary}</div>
        )}
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


// ── Overflow menu — secondary article actions ─────────────────
function OverflowMenu({ T, item, content, yt, highlights, tags, showTags, setShowTags, showDrawer, setShowDrawer, handleShare, shareFeedback, handleExportHighlights, exportFeedback }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const menuItem = (label, action, accent = false) => (
    <button
      key={label}
      onClick={() => { action(); setOpen(false); }}
      style={{ display:"flex", alignItems:"center", width:"100%", padding:"8px 16px", background:"none", border:"none", cursor:"pointer", fontSize:13, color: accent ? T.accent : T.text, fontFamily:"inherit", textAlign:"left", gap:8, transition:"background .1s" }}
      onMouseEnter={e => e.currentTarget.style.background=T.surface2}
      onMouseLeave={e => e.currentTarget.style.background="transparent"}
    >{label}</button>
  );

  return (
    <div ref={ref} style={{ position:"relative", flexShrink:0 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ background: open ? T.surface2 : "transparent", border:"none", borderRadius:8, padding:"6px 8px", cursor:"pointer", fontSize:16, color: open ? T.textSecondary : T.textTertiary, fontFamily:"inherit", lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center", width:34, height:32, transition:"all .12s" }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.textSecondary; }}}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textTertiary; }}}
      >···</button>
      {open && (
        <div style={{ position:"absolute", right:0, top:"calc(100% + 4px)", zIndex:200, background:T.card, border:`1px solid ${T.border}`, borderRadius:12, boxShadow:"0 4px 24px rgba(0,0,0,.14)", minWidth:180, padding:"4px 0", animation:"fadeInScale .12s ease" }}>
          {menuItem(shareFeedback || "Share…", handleShare)}
          {item?.url && menuItem("Open in browser ↗", () => window.open(item.url, "_blank"))}
          <div style={{ height:1, background:T.border, margin:"4px 0" }} />
          {menuItem(showTags ? "Hide tags" : `Tags${tags.length > 0 ? ` (${tags.length})` : ""}`, () => setShowTags(v => !v))}
          {!yt?.isYouTube && menuItem(`Highlights${highlights.length > 0 ? ` (${highlights.length})` : ""}`, () => setShowDrawer(true))}
          {!yt?.isYouTube && highlights.length > 0 && menuItem(exportFeedback || "Copy highlights as MD", () => handleExportHighlights(false), true)}
          {!yt?.isYouTube && highlights.length > 0 && menuItem("Download highlights .md", () => handleExportHighlights(true))}
        </div>
      )}
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
