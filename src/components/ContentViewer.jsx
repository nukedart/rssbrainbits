import { useState, useEffect, useRef, useCallback } from "react";
import { useSwipe } from "../hooks/useSwipe.js";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { Button, Spinner } from "./UI";
import { fetchArticleContent, summarizeContent, parseYouTubeUrl, fetchYouTubeTranscript } from "../lib/fetchers";
import SelectionToolbar, { HIGHLIGHT_COLORS } from "./SelectionToolbar";
import NotePanel from "./NotePanel";
import HighlightsDrawer from "./HighlightsDrawer";
import TagsInput from "./TagsInput";
import {
  saveItem, addHighlight, getHighlights, updateHighlightNote, deleteHighlight,
  getArticleTags, addArticleTag, deleteArticleTag, getAllTags,
  getReadingProgress, setReadingProgress, getNotesByArticle,
} from "../lib/supabase";
import ArticleNotesPanel from "./ArticleNotesPanel";
import { getReaderPrefs, setReaderPrefs } from "../lib/readerPrefs.js";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { highlightsToMarkdown, copyToClipboard, downloadFile } from "../lib/exportUtils.js";
import { track } from "../lib/analytics";
import { isProUser } from "../lib/plan";

export default function ContentViewer({ item, onClose, onNext, onPrev, inline = false, currentIdx = -1, totalCount = 0, onExpand }) {
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
  const [summaryStyle, setSummaryStyle] = useState("keypoints"); // keypoints | brief | detailed

  // Highlights
  const [highlights, setHighlights]   = useState([]);
  const [activeNote, setActiveNote]   = useState(null);
  const [showDrawer, setShowDrawer]   = useState(false);

  // Article notes
  const [articleNotes, setArticleNotes]       = useState([]);
  const [showNotesPanel, setShowNotesPanel]   = useState(false);

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
    // Podcast episodes — use RSS description as show notes, no article fetch needed
    if (item.isPodcast && item.audioUrl) return;

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
    getNotesByArticle(user.id, item.url).then(setArticleNotes).catch(() => {});
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
    try { navigator.vibrate?.(8); } catch {}
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
      try { localStorage.setItem(`fb-prog-${encodeURIComponent(item.url)}`, pct); } catch {}
    }
  }

  // ── Share ─────────────────────────────────────────────────
  async function handleShare() {
    try { navigator.vibrate?.(8); } catch {}
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
  async function handleSummarize(style) {
    const text = content?.bodyText || item?.description || "";
    if (!text) return;
    const useStyle = style || summaryStyle;
    setSummarizing(true);
    track("ai_summary_triggered", { source: item?.source, style: useStyle });
    const result = await summarizeContent(text, content?.title || item?.title, useStyle);
    setSummary(result);
    setSummarizing(false);
    // Auto-save the article when a summary is generated
    if (user && result && !result.startsWith("AI summarization")) {
      try { await saveItem(user.id, { ...item, summary: result }); setSaved(true); } catch { /* silent */ }
    }
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
        ...(inline
          ? { position: "relative", flex: 1, height: "100%" }
          : { position: "fixed", inset: 0, zIndex: 500 }
        ),
        background: T.bg,
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
        background: `${T.bg}d8`,
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        borderBottom: `1px solid ${T.border}`,
        padding: isMobile ? "8px 12px" : "10px 16px", display: "flex", alignItems: "center", gap: isMobile ? 8 : 10,
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

        {/* Prev — both mobile and desktop */}
        {onPrev && (
          <button onClick={onPrev} title="Previous article (k)"
            style={{ background: "transparent", border: "none", borderRadius: 8, width: isMobile ? 38 : 28, height: isMobile ? 38 : 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textTertiary, fontSize: isMobile ? 16 : 14, flexShrink: 0, WebkitTapHighlightColor: "transparent", transition: "all .12s" }}
            onMouseEnter={e => { e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.textSecondary; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textTertiary; }}
          >‹</button>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 14 : 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.source || "Feedbox"}
          </div>
          {!isMobile && totalCount > 0 && currentIdx >= 0 && (
            <div style={{ fontSize: 10, color: T.textTertiary, marginTop: 1 }}>
              {currentIdx + 1} of {totalCount}
            </div>
          )}
        </div>

        {/* Next — both mobile and desktop */}
        {onNext && (
          <button onClick={onNext} title="Next article (j)"
            style={{ background: "transparent", border: "none", borderRadius: 8, width: isMobile ? 38 : 28, height: isMobile ? 38 : 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textTertiary, fontSize: isMobile ? 16 : 14, flexShrink: 0, WebkitTapHighlightColor: "transparent", transition: "all .12s" }}
            onMouseEnter={e => { e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.textSecondary; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textTertiary; }}
          >›</button>
        )}

        {/* Expand to full view — only in inline mode */}
        {inline && onExpand && !isMobile && (
          <button
            onClick={onExpand}
            title="Open in full view"
            style={{
              background: "transparent", border: "none", borderRadius: 8,
              width: 28, height: 28, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.textTertiary, flexShrink: 0, transition: "all .12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.color = T.textSecondary; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textTertiary; }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 1.5h4.5V6M9.5 6.5l5-5M6 14.5H1.5V10M6.5 9.5l-5 5"/>
            </svg>
          </button>
        )}

        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {/* Aa — font controls (compact dropdown) */}
          {!yt.isYouTube && content && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowReaderControls(v => !v)} title="Reading preferences"
                style={{ background: showReaderControls ? T.accentSurface : "transparent", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: showReaderControls ? T.accentText : T.textTertiary, fontFamily: "inherit", flexShrink: 0, transition: "all .12s" }}
                onMouseEnter={e => { if (!showReaderControls) { e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.textSecondary; }}}
                onMouseLeave={e => { if (!showReaderControls) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textTertiary; }}}
              >Aa</button>
              {showReaderControls && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 300,
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,.18)",
                  padding: "14px 16px", minWidth: 220,
                  display: "flex", flexDirection: "column", gap: 12,
                  animation: "fadeInScale .15s ease",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".07em", flex: 1 }}>Size</span>
                    <input type="range" min="14" max="22" step="1" value={readerPrefs.fontSize}
                      onChange={e => updatePref("fontSize", parseInt(e.target.value))}
                      style={{ width: 90, accentColor: T.accent }} />
                    <span style={{ fontSize: 11, color: T.textSecondary, minWidth: 24, textAlign: "right" }}>{readerPrefs.fontSize}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".07em", flex: 1 }}>Width</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {["narrow","medium","wide"].map(w => (
                        <button key={w} onClick={() => updatePref("lineWidth", w)} style={{ padding: "3px 7px", borderRadius: 6, border: `1px solid ${readerPrefs.lineWidth===w?T.accent:T.border}`, background: readerPrefs.lineWidth===w?T.accentSurface:"transparent", color: readerPrefs.lineWidth===w?T.accentText:T.textSecondary, cursor: "pointer", fontSize: 10, fontWeight: 600, fontFamily: "inherit", textTransform: "capitalize" }}>{w[0].toUpperCase()}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".07em", flex: 1 }}>Font</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {[{id:"sans",label:"Sans"},{id:"serif",label:"Serif"}].map(f => (
                        <button key={f.id} onClick={() => updatePref("fontFamily", f.id)} style={{ padding: "3px 9px", borderRadius: 6, border: `1px solid ${readerPrefs.fontFamily===f.id?T.accent:T.border}`, background: readerPrefs.fontFamily===f.id?T.accentSurface:"transparent", color: readerPrefs.fontFamily===f.id?T.accentText:T.textSecondary, cursor: "pointer", fontSize: 10, fontWeight: 600, fontFamily: "inherit" }}>{f.label}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".07em", flex: 1 }}>Bionic</span>
                    <button onClick={() => updatePref("bionic", !readerPrefs.bionic)} style={{ width: 32, height: 18, borderRadius: 9, border: "none", cursor: "pointer", background: readerPrefs.bionic?T.accent:T.border, position: "relative", transition: "background .2s", flexShrink: 0 }}>
                      <span style={{ position: "absolute", top: 2, left: readerPrefs.bionic?16:2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .18s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <button onClick={() => setShowNotesPanel(v => !v)} title="Notes on this article"
            style={{ background: showNotesPanel ? T.accentSurface : "transparent", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: showNotesPanel ? T.accentText : T.textTertiary, fontFamily: "inherit", transition: "all .12s", flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}
            onMouseEnter={e => { if (!showNotesPanel) { e.currentTarget.style.background = T.surface2; e.currentTarget.style.color = T.textSecondary; } }}
            onMouseLeave={e => { if (!showNotesPanel) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textTertiary; } }}
          >
            Note
            {articleNotes.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, background: showNotesPanel ? T.accent : T.surface2, color: showNotesPanel ? "#03210b" : T.textSecondary, borderRadius: 8, padding: "1px 5px", minWidth: 14, textAlign: "center" }}>
                {articleNotes.length}
              </span>
            )}
          </button>

          {/* Save */}
          <button onClick={handleSave} disabled={saved}
            style={{ background: saved ? T.accentSurface : "transparent", border: "none", borderRadius: 8, padding: "6px 10px", cursor: saved ? "default" : "pointer", fontSize: 12, fontWeight: 600, color: saved ? T.accentText : T.textTertiary, fontFamily: "inherit", transition: "all .12s", flexShrink: 0 }}
            onMouseEnter={e => { if (!saved) { e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.textSecondary; }}}
            onMouseLeave={e => { if (!saved) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textTertiary; }}}
          >{saved ? "✓ Saved" : "Save"}</button>

          {/* Share — visible button (not buried in overflow) */}
          <button onClick={handleShare} title={shareFeedback || "Share"}
            style={{ background: shareFeedback ? T.accentSurface : "transparent", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: shareFeedback ? T.accentText : T.textTertiary, fontFamily: "inherit", transition: "all .12s", flexShrink: 0, whiteSpace: "nowrap" }}
            onMouseEnter={e => { if (!shareFeedback) { e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.textSecondary; }}}
            onMouseLeave={e => { if (!shareFeedback) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textTertiary; }}}
          >{shareFeedback || "↑ Share"}</button>

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
            {isProUser(user) ? (
              <TagsInput tags={tags} onAdd={handleAddTag} onRemove={handleRemoveTag} allTags={allTags} />
            ) : (
              <div style={{ fontSize: 12, color: T.textSecondary, display: "flex", alignItems: "center", gap: 10 }}>
                <span>Article tags are a Pro feature.</span>
                <a href="/landing" style={{ color: T.accent, fontWeight: 600, textDecoration: "none" }}>Upgrade →</a>
              </div>
            )}
          </div>
        </div>
      )}




      {/* ── Main content — scroll container ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: "auto", position: "relative" }}
      >

        {/* ── YouTube ── */}
        {yt.isYouTube && (
          <div style={{ maxWidth: "min(1100px, 96vw)", margin: "0 auto", padding: isMobile ? "20px 18px 140px" : "32px 40px 120px", width: "100%" }}>
            <YouTubeView item={item} videoId={yt.videoId} summary={summary} summarizing={summarizing} onSummarize={handleSummarize} onHighlight={handleHighlight} T={T} isMobile={isMobile} />
          </div>
        )}

        {/* ── Podcast episode view ── */}
        {!yt.isYouTube && item?.isPodcast && item?.audioUrl && !loading && (
          <div style={{ maxWidth: "var(--reader-line-width)", margin: "0 auto", padding: isMobile ? "20px 18px 140px" : "40px 32px 120px", width: "100%" }}>
            <PodcastEpisodeView item={item} summary={summary} summarizing={summarizing} onSummarize={handleSummarize} T={T} />
          </div>
        )}

        {/* Article loading */}
        {!yt.isYouTube && loading && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={28} /></div>
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

        {/* ── Article content — editorial layout ── */}
        {!yt.isYouTube && content && (
          <div>

            {/* ── Hero section — full bleed ── */}
            <div style={{
              position: "relative",
              minHeight: isMobile ? 260 : 360,
              overflow: "hidden",
              flexShrink: 0,
            }}>
              {/* Background: image or atmospheric gradient */}
              {content.image ? (
                <img
                  src={content.image} alt=""
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
                  onError={e => { e.target.style.display = "none"; }}
                />
              ) : (
                <div style={{
                  position: "absolute", inset: 0,
                  background: `radial-gradient(ellipse at 50% -10%, ${T.accent}22 0%, transparent 65%), ${T.surface}`,
                }} />
              )}
              {/* Gradient overlay — blends hero into page bg */}
              <div style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.42) 52%, ${T.bg} 92%)`,
              }} />
              {/* Title + source overlaid on hero */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: isMobile ? "28px 20px 20px" : "36px 48px 24px",
                textAlign: "center",
              }}>
                {(item.source || item.date) && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: ".14em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.55)",
                    marginBottom: 10,
                  }}>
                    {[item.source, item.date ? new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null].filter(Boolean).join("  ·  ")}
                  </div>
                )}
                <h1 style={{
                  fontFamily: "var(--reader-font-family)",
                  fontSize: isMobile ? 24 : 32,
                  fontWeight: 700,
                  color: "#ffffff",
                  margin: "0 auto",
                  lineHeight: 1.18,
                  letterSpacing: "-.025em",
                  textShadow: "0 2px 28px rgba(0,0,0,0.55)",
                  maxWidth: 600,
                }}>
                  {content.title || item.title}
                </h1>
              </div>
            </div>

            {/* ── Content column ── */}
            <div style={{
              maxWidth: "var(--reader-line-width)",
              margin: "0 auto",
              padding: isMobile ? "4px 18px 140px" : "4px 32px 120px",
              width: "100%",
            }}>

              {/* AI Summarize */}
              <SummaryBlock summary={summary} summarizing={summarizing} onSummarize={handleSummarize} summaryStyle={summaryStyle} onStyleChange={setSummaryStyle} T={T} />

              {content.description && (
                <p style={{ fontSize: 16, color: T.textSecondary, lineHeight: 1.7, margin: "0 0 28px", fontStyle: "italic" }}>
                  {content.description}
                </p>
              )}

              {/* Article body */}
              <div ref={articleRef} style={{ fontSize: "var(--reader-font-size)", color: T.text, lineHeight: 1.9, wordBreak: "break-word", fontFamily: "var(--reader-font-family)", letterSpacing: "-.005em" }}>
                {content.bodyHtml && !readerPrefs.bionic ? (
                  <>
                    <style>{`
                      .fb-article-body h1,.fb-article-body h2,.fb-article-body h3,.fb-article-body h4{margin:1.4em 0 .5em;font-weight:700;line-height:1.3}
                      .fb-article-body h1{font-size:1.5em}.fb-article-body h2{font-size:1.25em}.fb-article-body h3{font-size:1.1em}.fb-article-body h4{font-size:1em}
                      .fb-article-body p{margin:0 0 1em}.fb-article-body p:first-child{margin-top:0}
                      .fb-article-body ul,.fb-article-body ol{margin:0 0 1em;padding-left:1.6em}
                      .fb-article-body li{margin-bottom:.35em}
                      .fb-article-body img{max-width:100%;height:auto;border-radius:8px;margin:1em 0;display:block}
                      .fb-article-body a{color:var(--accent,#4f8ef7);text-decoration:underline;text-underline-offset:2px}
                      .fb-article-body blockquote{border-left:3px solid currentColor;margin:1em 0;padding:.5em 1em;opacity:.75}
                      .fb-article-body code{background:rgba(128,128,128,.15);border-radius:3px;padding:.1em .35em;font-family:ui-monospace,monospace;font-size:.88em}
                      .fb-article-body pre{background:rgba(128,128,128,.12);border-radius:8px;padding:1em;overflow-x:auto;margin:0 0 1em}
                      .fb-article-body pre code{background:none;padding:0}
                      .fb-article-body figure{margin:1em 0}.fb-article-body figcaption{font-size:.85em;opacity:.6;margin-top:.3em}
                      .fb-article-body table{border-collapse:collapse;width:100%;margin:0 0 1em;font-size:.9em}
                      .fb-article-body th,.fb-article-body td{border:1px solid rgba(128,128,128,.25);padding:.4em .7em;text-align:left}
                      .fb-article-body mark{border-radius:3px;padding:1px 0;cursor:pointer}
                    `}</style>
                    <div
                      className="fb-article-body"
                      dangerouslySetInnerHTML={{ __html: injectHtmlHighlights(content.bodyHtml, highlights, HIGHLIGHT_COLORS) }}
                    />
                  </>
                ) : (
                  <HighlightedText
                    text={content.bodyText}
                    highlights={highlights}
                    onClickHighlight={setActiveNote}
                    bionic={readerPrefs.bionic}
                  />
                )}
              </div>

              {/* Selection toolbar */}
              <SelectionToolbar containerRef={articleRef} onHighlight={handleHighlight} />
            </div>
          </div>
        )}

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

      {/* ── Article notes panel ── */}
      {showNotesPanel && (
        <ArticleNotesPanel
          articleUrl={item?.url}
          articleTitle={content?.title || item?.title}
          notes={articleNotes}
          onNotesChange={setArticleNotes}
          onClose={() => setShowNotesPanel(false)}
        />
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

// ── HTML highlight injection ───────────────────────────────────
// Wraps matched passage text in <mark> elements inside HTML strings.
// Simple regex approach — works for most articles; skips passages that
// straddle tag boundaries (rare in practice).
function injectHtmlHighlights(html, highlights, colorDefs) {
  if (!highlights?.length) return html;
  let result = html;
  for (const h of highlights) {
    const colorDef = colorDefs.find(c => c.id === h.color) || colorDefs[0];
    const esc = h.passage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(
      new RegExp(esc, "g"),
      `<mark style="background:${colorDef.bg};border-radius:3px;padding:1px 0;cursor:pointer">${h.passage}</mark>`
    );
  }
  return result;
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
const SUMMARY_STYLES = [
  { id: "keypoints", label: "Key Points" },
  { id: "brief",     label: "Brief" },
  { id: "detailed",  label: "Detailed" },
];

const SparkleIcon = ({ size = 13, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" style={style}>
    <path d="M8 0 L9.6 6.4 L16 8 L9.6 9.6 L8 16 L6.4 9.6 L0 8 L6.4 6.4 Z" />
  </svg>
);

function SummaryBlock({ summary, summarizing, onSummarize, summaryStyle = "keypoints", onStyleChange, T }) {
  if (summary) {
    const bullets = summary
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => l
        .replace(/^[•\-\*]\s*/, "")
        .replace(/^\d+\.\s*/, "")
        .replace(/^\*\*[^*]+\*\*:\s*/, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .trim()
      )
      .filter(l => l.length > 10);

    return (
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "18px 20px",
        marginBottom: 32,
        marginTop: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <SparkleIcon size={12} style={{ color: T.accent, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: T.accent, flex: 1 }}>AI Summary</span>
          {/* Style tabs inline — pill style matching summarize button */}
          <div style={{ display: "flex", gap: 3 }}>
            {SUMMARY_STYLES.map(s => (
              <button key={s.id} onClick={() => { onStyleChange?.(s.id); onSummarize?.(s.id); }} style={{
                padding: "3px 10px", borderRadius: 100,
                border: `1px solid ${summaryStyle === s.id ? T.accent : T.border}`,
                background: "transparent",
                color: summaryStyle === s.id ? T.accent : T.textTertiary,
                fontSize: 10, fontWeight: summaryStyle === s.id ? 700 : 400,
                cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
              }}>{s.label}</button>
            ))}
          </div>
        </div>
        {bullets.length > 0 ? (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
            {bullets.map((point, i) => (
              <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: T.accent, fontWeight: 700, fontSize: 14, lineHeight: "1.6", flexShrink: 0 }}>•</span>
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

  // ── Pre-summary: centered pill ──────────────────────────────
  return (
    <div style={{ textAlign: "center", padding: "24px 0 28px" }}>
      {/* Style selector — pill tabs matching main summarize button */}
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 14 }}>
        {SUMMARY_STYLES.map(s => (
          <button key={s.id} onClick={() => onStyleChange?.(s.id)} style={{
            padding: "5px 14px", borderRadius: 100,
            border: `1px solid ${summaryStyle === s.id ? T.accent : T.border}`,
            background: "transparent",
            color: summaryStyle === s.id ? T.accent : T.textTertiary,
            fontSize: 11, fontWeight: summaryStyle === s.id ? 700 : 400,
            cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
          }}>{s.label}</button>
        ))}
      </div>
      {/* Pill button */}
      <button
        onClick={() => onSummarize?.(summaryStyle)}
        disabled={summarizing}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 26px",
          borderRadius: 100,
          border: `1px solid ${T.borderStrong || T.border}`,
          background: "transparent",
          color: T.text,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "inherit",
          letterSpacing: ".1em",
          textTransform: "uppercase",
          cursor: summarizing ? "default" : "pointer",
          opacity: summarizing ? 0.6 : 1,
          transition: "border-color .2s, color .2s",
        }}
        onMouseEnter={e => { if (!summarizing) { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}}
        onMouseLeave={e => { if (!summarizing) { e.currentTarget.style.borderColor = T.borderStrong || T.border; e.currentTarget.style.color = T.text; }}}
      >
        <SparkleIcon size={12} />
        {summarizing ? "Summarizing…" : "Summarize with AI"}
      </button>
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

// ── YouTube View ─────────────────────────────────────────────
// Parses timestamps like "0:00 Intro\n3:22 Chapter" from description
function parseChapters(text) {
  if (!text) return [];
  const chapters = [];
  const re = /(?:^|\n)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const parts = m[1].split(":").map(Number);
    const secs = parts.length === 3
      ? parts[0]*3600 + parts[1]*60 + parts[2]
      : parts[0]*60 + parts[1];
    chapters.push({ time: m[1], secs, label: m[2].trim() });
  }
  return chapters;
}

function fmtSecs(s) {
  const t = Math.floor(s);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function YouTubeView({ item, videoId, summary, summarizing, onSummarize, onHighlight, T, isMobile }) {
  const [showDesc, setShowDesc] = useState(false);
  const [iframeSrc, setIframeSrc] = useState(`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`);
  const [transcript, setTranscript] = useState(null); // null = loading, [] = unavailable, [...] = lines
  const [transcriptLoading, setTranscriptLoading] = useState(true);
  const [activeLineIdx, setActiveLineIdx] = useState(-1);
  const [pendingHighlight, setPendingHighlight] = useState(null); // { text, lineIdx }
  const transcriptRef = useRef(null);

  const desc = item?.description || item?.fullText || "";
  const chapters = parseChapters(desc);

  useEffect(() => {
    setTranscriptLoading(true);
    fetchYouTubeTranscript(videoId).then(lines => {
      setTranscript(lines.length > 0 ? lines : []);
    }).catch(() => setTranscript([])).finally(() => setTranscriptLoading(false));
  }, [videoId]);

  function seekTo(secs) {
    setIframeSrc(`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&start=${Math.floor(secs)}&autoplay=1`);
    setActiveLineIdx(-1);
  }

  // Transcript text selection → highlight
  function handleTranscriptMouseUp() {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 3) { setPendingHighlight(null); return; }
    setPendingHighlight({ text });
  }

  async function commitHighlight(color) {
    if (!pendingHighlight || !onHighlight) return;
    await onHighlight({ passage: pendingHighlight.text, color, position: 0 });
    setPendingHighlight(null);
    window.getSelection()?.removeAllRanges();
  }

  const hasTranscript = Array.isArray(transcript) && transcript.length > 0;

  return (
    <div>
      {/* Main layout: video + transcript side-by-side on desktop */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexDirection: isMobile ? "column" : "row" }}>

        {/* Video column */}
        <div style={{ flex: isMobile ? "1" : "0 0 62%", minWidth: 0 }}>
          <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 16, aspectRatio: "16/9", background: "#000" }}>
            <iframe src={iframeSrc} title="YouTube video"
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>

          {/* Title + meta */}
          <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: T.text, margin: "0 0 8px", lineHeight: 1.3, fontFamily: "var(--reader-font-family)" }}>
            {item.title}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {item.source && <span style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>{item.source}</span>}
            {item.date && <span style={{ fontSize: 12, color: T.textTertiary }}>{new Date(item.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>}
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: T.textTertiary, marginLeft: "auto", textDecoration: "none" }}>
              ↗ YouTube
            </a>
          </div>

          {/* AI Summary */}
          <SummaryBlock summary={summary} summarizing={summarizing} onSummarize={onSummarize} summaryStyle="keypoints" T={T} />

          {/* Chapters */}
          {chapters.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: T.textTertiary, textTransform: "uppercase", marginBottom: 8 }}>
                Chapters ({chapters.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {chapters.map((ch, i) => (
                  <button key={i}
                    onClick={() => seekTo(ch.secs)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "background .15s", width: "100%" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.surface}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: T.accent, minWidth: 38 }}>{ch.time}</span>
                    <span style={{ fontSize: 13, color: T.textSecondary }}>{ch.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description (collapsible) */}
          {desc && (
            <div style={{ marginBottom: 8 }}>
              <button onClick={() => setShowDesc(v => !v)} style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, color: T.textSecondary, padding: 0, fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
              }}>
                {showDesc ? "▲" : "▼"} {showDesc ? "Hide" : "Show"} description
              </button>
              {showDesc && (
                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.8, whiteSpace: "pre-wrap", background: T.surface, borderRadius: 10, padding: "12px 14px" }}>
                  {desc}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transcript panel */}
        <div style={{ flex: isMobile ? "1" : "0 0 36%", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: T.textTertiary, textTransform: "uppercase" }}>
              Transcript
            </span>
            {transcriptLoading && <span style={{ fontSize: 11, color: T.textTertiary }}>loading…</span>}
            {!transcriptLoading && !hasTranscript && <span style={{ fontSize: 11, color: T.textTertiary }}>not available</span>}
            {hasTranscript && <span style={{ fontSize: 11, color: T.textTertiary }}>{transcript.length} lines · select text to highlight</span>}
          </div>

          {hasTranscript && (
            <div
              ref={transcriptRef}
              onMouseUp={handleTranscriptMouseUp}
              style={{
                flex: 1, overflowY: "auto",
                maxHeight: isMobile ? 320 : 520,
                background: T.surface,
                borderRadius: 10,
                padding: "10px 4px",
                fontSize: 13,
                lineHeight: 1.65,
                position: "relative",
              }}
            >
              {/* Pending highlight toolbar */}
              {pendingHighlight && (
                <div style={{
                  position: "sticky", top: 0, zIndex: 10,
                  display: "flex", gap: 6, padding: "6px 10px",
                  background: T.card, borderRadius: 8, marginBottom: 6,
                  boxShadow: "0 2px 12px rgba(0,0,0,.15)",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: 11, color: T.textSecondary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Highlight: "{pendingHighlight.text.slice(0, 40)}{pendingHighlight.text.length > 40 ? "…" : ""}"
                  </span>
                  {["yellow", "green", "blue", "pink"].map(color => (
                    <button key={color} onClick={() => commitHighlight(color)}
                      style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid transparent", cursor: "pointer",
                        background: color === "yellow" ? "#FFD700" : color === "green" ? "#86EFAC" : color === "blue" ? "#93C5FD" : "#F9A8D4",
                        transition: "border-color .1s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = T.text}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                    />
                  ))}
                  <button onClick={() => setPendingHighlight(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: T.textTertiary, fontSize: 14, lineHeight: 1 }}>×</button>
                </div>
              )}
              {transcript.map((line, i) => (
                <div
                  key={i}
                  onClick={() => { seekTo(line.start); setActiveLineIdx(i); }}
                  style={{
                    display: "flex", gap: 8, padding: "3px 10px",
                    borderRadius: 6, cursor: "pointer",
                    background: activeLineIdx === i ? T.accentSurface : "transparent",
                    transition: "background .1s",
                  }}
                  onMouseEnter={e => { if (activeLineIdx !== i) e.currentTarget.style.background = T.surface2; }}
                  onMouseLeave={e => { if (activeLineIdx !== i) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: T.accent, minWidth: 36, flexShrink: 0, paddingTop: 2, userSelect: "none" }}>
                    {fmtSecs(line.start)}
                  </span>
                  <span style={{ color: activeLineIdx === i ? T.accent : T.textSecondary, flex: 1 }}>
                    {line.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Podcast Episode View ──────────────────────────────────────
// Show notes view for podcast items — artwork, metadata, description
function PodcastEpisodeView({ item, summary, summarizing, onSummarize, T }) {
  const [expanded, setExpanded] = useState(false);
  const desc = item?.description || item?.fullText || "";
  const chapters = parseChapters(desc);
  const duration = item?.audioDuration;

  function fmtDuration(s) {
    if (!s) return null;
    // Handle HH:MM:SS and MM:SS strings as-is
    if (/^\d+:\d+/.test(s)) return s;
    // Handle seconds as number
    const n = parseInt(s, 10);
    if (isNaN(n)) return s;
    const h = Math.floor(n/3600), m = Math.floor((n%3600)/60), sec = n%60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${sec}s`;
  }

  return (
    <div>
      {/* Art + metadata row */}
      <div style={{ display: "flex", gap: 18, marginBottom: 22, alignItems: "flex-start" }}>
        {item.image && (
          <img src={item.image} alt="" style={{
            width: 88, height: 88, borderRadius: 14, objectFit: "cover", flexShrink: 0,
            boxShadow: "0 8px 24px rgba(0,0,0,.3)",
          }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: T.accent, textTransform: "uppercase", marginBottom: 6 }}>Podcast Episode</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: "0 0 8px", lineHeight: 1.3, fontFamily: "var(--reader-font-family)" }}>
            {item.title}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            {item.source && <span style={{ fontSize: 12, fontWeight: 500, color: T.textSecondary }}>{item.source}</span>}
            {duration && <span style={{ fontSize: 12, color: T.textTertiary }}>⏱ {fmtDuration(duration)}</span>}
            {item.date && <span style={{ fontSize: 12, color: T.textTertiary }}>{new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <SummaryBlock summary={summary} summarizing={summarizing} onSummarize={onSummarize} summaryStyle="keypoints" T={T} />

      {/* Chapters from timestamps */}
      {chapters.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: T.textTertiary, textTransform: "uppercase", marginBottom: 10 }}>
            Chapters ({chapters.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {chapters.map((ch, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8 }}>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: T.accent, minWidth: 38 }}>{ch.time}</span>
                <span style={{ fontSize: 13, color: T.textSecondary }}>{ch.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show notes */}
      {desc && (
        <div>
          <button onClick={() => setExpanded(v => !v)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: T.textSecondary,
            padding: 0, fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
          }}>
            {expanded ? "▲" : "▼"} Show notes
          </button>
          <div style={{
            maxHeight: expanded ? "none" : 120,
            overflow: "hidden",
            position: "relative",
          }}>
            <div style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {desc}
            </div>
            {!expanded && desc.length > 300 && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: `linear-gradient(transparent, ${T.bg})` }} />
            )}
          </div>
          {!expanded && desc.length > 300 && (
            <button onClick={() => setExpanded(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.accent, padding: "8px 0 0", fontFamily: "inherit" }}>
              Read more
            </button>
          )}
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
