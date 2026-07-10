import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSwipe } from "../hooks/useSwipe.js";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { Button, Spinner } from "./UI";
import { fetchArticleContent, summarizeContent, suggestTags, askQuestion, parseYouTubeUrl, fetchYouTubeTranscript, translateText } from "../lib/fetchers";
import SelectionToolbar, { HIGHLIGHT_COLORS } from "./SelectionToolbar";
import NotePanel from "./NotePanel";
import HighlightsDrawer from "./HighlightsDrawer";
import TagsInput from "./TagsInput";
import {
  saveItem, unsaveItem, addHighlight, getHighlights, updateHighlightNote, updateHighlightTags, deleteHighlight,
  getArticleTags, addArticleTag, deleteArticleTag, getAllTags,
  getReadingProgress, setReadingProgress,
  getAiUsageToday, incrementAiUsage,
} from "../lib/supabase";
import { getReaderPrefs, setReaderPrefs } from "../lib/readerPrefs.js";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { useBackButtonClose } from "../hooks/useBackButtonClose.js";
import { highlightsToMarkdown, highlightsToObsidian, copyToClipboard, downloadFile } from "../lib/exportUtils.js";
import { track } from "../lib/analytics";
import { isProUser, PLANS } from "../lib/plan";

function formatArticleDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr), diff = Date.now() - d;
    if (diff < 3600000)   return `${Math.round(diff / 60000)}m ago`;
    if (diff < 86400000)  return `${Math.round(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.round(diff / 86400000)}d ago`;
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch { return null; }
}

export default function ContentViewer({ item, onClose, onNext, onPrev, inline = false, currentIdx = -1, totalCount = 0, onExpand, isSaved = false, onSave, onUnsave }) {
  const { T } = useTheme();
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();

  // Article
  const [content, setContent]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [saved, setSaved]         = useState(isSaved);
  useEffect(() => { setSaved(isSaved); }, [item?.url]);

  // AI summary
  const [summary, setSummary]         = useState(() => {
    // Restore cached summary for this article on first render
    const url = item?.url;
    if (!url) return null;
    if (item.summary) return item.summary;
    try { return localStorage.getItem("ai-summary:" + url) || null; } catch { return null; }
  });
  const [summarizing, setSummarizing] = useState(false);
  const [summaryStyle, setSummaryStyle] = useState("keypoints"); // keypoints | brief | actions
  const [translatedText, setTranslatedText] = useState(null);
  const [translating, setTranslating]       = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  // Highlights
  const [highlights, setHighlights]   = useState([]);
  const [activeNote, setActiveNote]   = useState(null);
  const [showDrawer, setShowDrawer]   = useState(false);

  // Back button closes these sub-panels instead of the whole article/app
  useBackButtonClose(!!activeNote, () => setActiveNote(null));
  useBackButtonClose(showDrawer, () => setShowDrawer(false));

  // Tags
  const [tags, setTags]         = useState([]);
  const [allTags, setAllTags]   = useState([]);
  const [showTags, setShowTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const suggestedUrlRef = useRef(null); // tracks which URL we've already suggested for

  // Reader preferences
  const [readerPrefs, setReaderPrefsState] = useState(() => getReaderPrefs());
  const [showReaderControls, setShowReaderControls] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [exportFeedback, setExportFeedback]   = useState(null);
  const [imgFeedback, setImgFeedback]         = useState(null);
  const [readProgress, setReadProgress]         = useState(0);
  const [shareFeedback, setShareFeedback]       = useState(null);
  const scrollContainerRef = useRef(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const headerAccRef = useRef(0);

  const articleRef = useRef(null);
  const lastSavedProgressRef = useRef(0);
  const yt = useMemo(() => item?.url ? parseYouTubeUrl(item.url) : { isYouTube: false }, [item?.url]);
  const readingTimeMins = useMemo(() => {
    if (!content?.bodyText) return null;
    return Math.max(1, Math.round(content.bodyText.split(/\s+/).length / 238));
  }, [content?.bodyText]);
  const faviconUrl = useMemo(() => {
    if (!item?.url) return null;
    try { return `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=32`; } catch { return null; }
  }, [item?.url]);

  // ── Restore cached summary when item changes ──────────────
  useEffect(() => {
    if (!item?.url) return;
    if (item.summary) { setSummary(item.summary); return; }
    try {
      const cached = localStorage.getItem("ai-summary:" + item.url);
      if (cached) setSummary(cached);
      else setSummary(null);
    } catch { setSummary(null); }
  }, [item?.url]);

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

    setError(null);

    // Helper: build a content object from the RSS feed data (fullText / description)
    function rssFallback(partial) {
      const rssHtml = item.fullText || "";
      const rssText = rssHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return {
        title:       item.title,
        description: item.description || "",
        image:       (partial?.image) || item.image || null,
        url:         item.url,
        bodyHtml:    rssHtml || null,
        bodyText:    rssText || item.description || "",
        _fromRSS:    true,
      };
    }

    // Show RSS content immediately so the user can start reading while full article loads
    const hasRss = (item.fullText?.length || 0) > 50 || (item.description?.length || 0) > 50;
    if (hasRss) {
      setContent(rssFallback(null));
      setLoading(false);
    } else {
      setLoading(true);
    }

    fetchArticleContent(item.url)
      .then(result => {
        // Only upgrade if the fetched article is meaningfully richer than what's showing
        if ((result.bodyText?.length || 0) > 200) {
          setContent(result);
        }
      })
      .catch(() => {
        if (!hasRss) {
          setError("Article could not be loaded. Try opening it in your browser.");
        }
      })
      .finally(() => setLoading(false));
  }, [item?.url, retryKey]);

  // ── AI tag suggestions — fire once per URL when content loads ─
  useEffect(() => {
    if (!content?.bodyText || !item?.url || !user) return;
    if (!isProUser(user)) return;
    if (suggestedUrlRef.current === item.url) return; // already suggested
    suggestedUrlRef.current = item.url;
    setSuggestedTags([]); // clear stale suggestions from previous article
    suggestTags(content.bodyText, content.title || item.title).then(setSuggestedTags).catch(() => {});
  }, [content, item?.url, user]);

  // ── Load highlights + tags ─────────────────────────────────
  useEffect(() => {
    if (!user || !item?.url) return;
    setHeaderVisible(true);
    headerAccRef.current = 0;
    lastScrollYRef.current = 0;
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
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
    setActiveNote(newH); // open NotePanel immediately — complete the card in one action
    track("article_highlighted", { color, passage_length: passage.length, source: item.source });
  }, [user, item, content]);

  async function handleImageHighlight(src) {
    if (!user || !src) return;
    const passage = "[IMAGE]: " + src;
    if (highlights.some(h => h.passage === passage)) {
      setImgFeedback("Already saved"); setTimeout(() => setImgFeedback(null), 1500); return;
    }
    const newH = await addHighlight(user.id, {
      article_url: item.url, article_title: content?.title || item.title,
      passage, color: "blue", position: 0,
    });
    setHighlights(prev => [...prev, newH]);
    setImgFeedback("✓ Image saved"); setTimeout(() => setImgFeedback(null), 1500);
  }

  async function handleSaveNote(highlightId, note) {
    await updateHighlightNote(highlightId, note);
    setHighlights((prev) => prev.map((h) => (h.id === highlightId ? { ...h, note } : h)));
  }

  async function handleUpdateHighlightTags(highlightId, tags) {
    setHighlights((prev) => prev.map((h) => (h.id === highlightId ? { ...h, tags } : h)));
    await updateHighlightTags(highlightId, tags).catch(console.error);
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

  // ── Save toggle ────────────────────────────────────────────
  async function handleSave() {
    try { navigator.vibrate?.(8); } catch {}
    if (saved) {
      await unsaveItem(user.id, item.url);
      setSaved(false);
      onUnsave?.();
    } else {
      await saveItem(user.id, { ...item, summary });
      setSaved(true);
      onSave?.();
    }
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
    // Auto-hide header: accumulate 60px of net movement before toggling
    const delta = el.scrollTop - lastScrollYRef.current;
    lastScrollYRef.current = el.scrollTop;
    if (el.scrollTop < 80) { headerAccRef.current = 0; setHeaderVisible(true); }
    else if (Math.abs(delta) >= 1) {
      headerAccRef.current += delta;
      if (headerAccRef.current > 60) { headerAccRef.current = 0; setHeaderVisible(false); }
      else if (headerAccRef.current < -60) { headerAccRef.current = 0; setHeaderVisible(true); }
    }
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

  async function handleExportObsidian() {
    const md = highlightsToObsidian(highlights, content?.title || item.title, item.url);
    if (!md) return;
    track("highlights_exported", { format: "obsidian", count: highlights.length });
    const ok = await copyToClipboard(md);
    setExportFeedback(ok ? "✓ Copied for Obsidian" : "Copy failed");
    setTimeout(() => setExportFeedback(null), 2200);
  }

  async function handleTranslate() {
    if (translatedText) { setShowTranslation(v => !v); return; }
    setTranslating(true);
    const result = await translateText(content?.bodyText || "", content?.title || item?.title || "");
    setTranslating(false);
    if (result) { setTranslatedText(result); setShowTranslation(true); }
  }

  // ── AI Summary ─────────────────────────────────────────────
  async function handleSummarize(style) {
    const text = content?.bodyText || item?.description || "";
    if (!text) return;
    const useStyle = style || summaryStyle;

    // Free-tier daily limit check
    if (user && !isProUser(user)) {
      const dailyLimit = PLANS.free.aiSummaries;
      try {
        const usedToday = await getAiUsageToday(user.id);
        if (usedToday >= dailyLimit) {
          setSummary(`You've used all ${dailyLimit} free AI summaries for today. Upgrade to Pro for unlimited summaries.`);
          return;
        }
      } catch { /* non-fatal — allow the summary if the check fails */ }
    }

    setSummarizing(true);
    track("ai_summary_triggered", { source: item?.source, style: useStyle });
    const result = await summarizeContent(text, content?.title || item?.title, useStyle);
    setSummary(result);
    setSummarizing(false);

    // Cache summary in localStorage so it survives re-opens without re-generating
    if (result && item?.url && !result.startsWith("AI summarization") && !result.startsWith("You've used")) {
      try { localStorage.setItem("ai-summary:" + item.url, result); } catch { /* storage full — non-fatal */ }
    }

    // Increment usage counter for free users
    if (user && !isProUser(user) && result && !result.startsWith("You've used")) {
      try { await incrementAiUsage(user.id); } catch { /* non-fatal */ }
    }

    // Auto-save the article when a summary is generated
    if (user && result && !result.startsWith("AI summarization") && !result.startsWith("You've used")) {
      try { await saveItem(user.id, { ...item, summary: result }); setSaved(true); } catch { /* silent */ }
    }
  }

  // ── Swipe gestures (mobile) ──────────────────────────────
  const swipeHandlers = useSwipe({
    onSwipeRight:     () => { if (isMobile) onClose(); },          // edge swipe = back
    onSwipeRightBody: () => { if (isMobile && onPrev) onPrev(); }, // body swipe = prev article
    onSwipeLeft:      () => { if (isMobile && onNext) onNext(); }, // swipe left = next
    edgeOnly: true,
    edgePx: 40,
    threshold: 50,
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
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >

      {/* ── Reading progress bar — always visible track ── */}
      <div style={{ height: 3, background: T.surface2, flexShrink: 0, position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(90deg, ${T.accent}, ${T.teal || T.accent})`,
          transform: `scaleX(${readProgress / 100})`,
          transformOrigin: "left",
          transition: "transform .25s ease",
          opacity: readProgress > 0 ? 1 : 0,
        }} />
      </div>

      {/* ── Top bar (auto-hides on scroll-down, reappears on scroll-up) ── */}
      <div style={{
        maxHeight: headerVisible ? "80px" : "0px",
        overflow: "hidden",
        transition: "max-height .22s ease",
        flexShrink: 0,
        zIndex: 10,
      }}>
      <div style={{
        background: `${T.bg}d8`,
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        padding: isMobile ? "8px 12px" : "10px 16px", display: "flex", alignItems: "center", gap: isMobile ? 8 : 10,
      }}>
        <button onClick={onClose} aria-label="Close article" style={{
          background: T.surface2, border: "none", borderRadius: 8,
          width: isMobile ? 38 : 32, height: isMobile ? 38 : 32,
          cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", color: T.textSecondary,
          fontSize: isMobile ? 20 : 18, fontFamily: "inherit", flexShrink: 0,
          WebkitTapHighlightColor: "transparent",
        }}>←</button>

        {/* Prev — desktop only; mobile uses swipe-right-body */}
        {!isMobile && onPrev && (
          <button onClick={onPrev} title="Previous article (k)" aria-label="Previous article"
            style={{ background: "transparent", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textTertiary, fontSize: 14, flexShrink: 0, WebkitTapHighlightColor: "transparent", transition: "background .12s, color .12s" }}
            onMouseEnter={e => { e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.textSecondary; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textTertiary; }}
          >‹</button>
        )}

        {/* Source name — desktop only; shown in article header on mobile */}
        {!isMobile && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {item.source || "Feedbox"}
            </div>
            {totalCount > 0 && currentIdx >= 0 && (
              <div style={{ fontSize: 10, color: T.textTertiary, marginTop: 1 }}>
                {currentIdx + 1} of {totalCount}
              </div>
            )}
          </div>
        )}
        {isMobile && <div style={{ flex: 1 }} />}

        {/* Next — desktop only; mobile uses swipe-left */}
        {!isMobile && onNext && (
          <button onClick={onNext} title="Next article (j)" aria-label="Next article"
            style={{ background: "transparent", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textTertiary, fontSize: 14, flexShrink: 0, WebkitTapHighlightColor: "transparent", transition: "background .12s, color .12s" }}
            onMouseEnter={e => { e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.textSecondary; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textTertiary; }}
          >›</button>
        )}

        {/* Expand to full view — only in inline mode */}
        {inline && onExpand && !isMobile && (
          <button
            onClick={onExpand}
            title="Open in full view"
            aria-label="Open in full view"
            style={{
              background: "transparent", border: "none", borderRadius: 8,
              width: 28, height: 28, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.textTertiary, flexShrink: 0, transition: "background .12s, color .12s",
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
              <button onClick={() => setShowReaderControls(v => !v)} title="Reading preferences" aria-label="Reading preferences" aria-expanded={showReaderControls}
                style={{ background: showReaderControls ? T.accentSurface : "transparent", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: showReaderControls ? T.accentText : T.textTertiary, fontFamily: "inherit", flexShrink: 0, transition: "background .12s, color .12s" }}
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
                      aria-label="Font size"
                      aria-valuetext={`${readerPrefs.fontSize}px`}
                      onChange={e => updatePref("fontSize", parseInt(e.target.value))}
                      style={{ width: 90, accentColor: T.accent }} />
                    <span style={{ fontSize: 11, color: T.textSecondary, minWidth: 24, textAlign: "right" }}>{readerPrefs.fontSize}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".07em", flex: 1 }}>Width</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {["narrow","medium","wide"].map(w => (
                        <button key={w} onClick={() => updatePref("lineWidth", w)} aria-label={`${w} line width`} aria-pressed={readerPrefs.lineWidth===w} style={{ padding: "3px 7px", borderRadius: 6, border: `1px solid ${readerPrefs.lineWidth===w?T.accent:T.border}`, background: readerPrefs.lineWidth===w?T.accentSurface:"transparent", color: readerPrefs.lineWidth===w?T.accentText:T.textSecondary, cursor: "pointer", fontSize: 10, fontWeight: 600, fontFamily: "inherit", textTransform: "capitalize" }}>{w[0].toUpperCase()}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".07em", flex: 1 }}>Font</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {[{id:"sans",label:"Sans"},{id:"serif",label:"Serif"}].map(f => (
                        <button key={f.id} onClick={() => updatePref("fontFamily", f.id)} aria-label={`${f.label} font`} aria-pressed={readerPrefs.fontFamily===f.id} style={{ padding: "3px 9px", borderRadius: 6, border: `1px solid ${readerPrefs.fontFamily===f.id?T.accent:T.border}`, background: readerPrefs.fontFamily===f.id?T.accentSurface:"transparent", color: readerPrefs.fontFamily===f.id?T.accentText:T.textSecondary, cursor: "pointer", fontSize: 10, fontWeight: 600, fontFamily: "inherit" }}>{f.label}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".07em", flex: 1 }}>Bionic</span>
                    <button onClick={() => updatePref("bionic", !readerPrefs.bionic)} role="switch" aria-checked={readerPrefs.bionic} aria-label="Bionic reading" style={{ width: 32, height: 18, borderRadius: 9, border: "none", cursor: "pointer", background: readerPrefs.bionic?T.accent:T.border, position: "relative", transition: "background .2s", flexShrink: 0 }}>
                      <span style={{ position: "absolute", top: 2, left: readerPrefs.bionic?16:2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .18s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save — tap to save, tap again to unsave */}
          <button onClick={handleSave} title={saved ? "Remove from Saved" : "Save article"}
            aria-label={saved ? "Remove from Saved" : "Save article"}
            style={{ background: saved ? T.accentSurface : "transparent", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: saved ? T.accent : T.textTertiary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .12s, color .12s" }}
            onMouseEnter={e => { e.currentTarget.style.background = saved ? T.accentSurface : T.surface2; e.currentTarget.style.color = saved ? T.danger : T.textSecondary; }}
            onMouseLeave={e => { e.currentTarget.style.background = saved ? T.accentSurface : "transparent"; e.currentTarget.style.color = saved ? T.accent : T.textTertiary; }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1.5.87L8 11.5l-4.5 2.37A1 1 0 0 1 2 13V3a1 1 0 0 1 1-1z"/>
            </svg>
          </button>

          {/* Share */}
          <button onClick={handleShare} title={shareFeedback || "Share"} aria-label={shareFeedback || "Share article"}
            style={{ background: shareFeedback ? T.accentSurface : "transparent", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: shareFeedback ? T.accent : T.textTertiary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .12s, color .12s" }}
            onMouseEnter={e => { if (!shareFeedback) { e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.textSecondary; }}}
            onMouseLeave={e => { if (!shareFeedback) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textTertiary; }}}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 1v10M4 4l4-3 4 3"/><path d="M4 8H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-2"/>
            </svg>
          </button>

          {/* Open original */}
          {item?.url && (
            <button
              onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
              title="Open original article"
              aria-label="Open original article"
              style={{ background: "transparent", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: T.textTertiary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .12s, color .12s" }}
              onMouseEnter={e => { e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.textSecondary; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textTertiary; }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9"/>
                <path d="M10 1h5v5"/>
                <path d="M15 1L8 8"/>
              </svg>
            </button>
          )}

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
            handleExportObsidian={handleExportObsidian}
            exportFeedback={exportFeedback}
            onTranslate={handleTranslate}
            translating={translating}
            hasTranslation={!!translatedText}
            showTranslation={showTranslation}
          />
        </div>
      </div>
      </div>

      {/* ── Tags bar ── */}
      {showTags && (
        <div style={{ background: T.surface, padding: "10px 16px", flexShrink: 0 }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            {isProUser(user) ? (
              <>
                <TagsInput tags={tags} onAdd={handleAddTag} onRemove={handleRemoveTag} allTags={allTags} />
                {suggestedTags.filter(t => !tags.includes(t)).length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: T.textTertiary }}>Suggested</span>
                    {suggestedTags.filter(t => !tags.includes(t)).map(tag => (
                      <button
                        key={tag}
                        onClick={() => { handleAddTag(tag); setSuggestedTags(prev => prev.filter(t => t !== tag)); }}
                        style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, border: `1px dashed ${T.accent}`, background: T.accentSurface, color: T.accent, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                )}
              </>
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

        {/* Article loading — skeleton matches real article layout */}
        {!yt.isYouTube && loading && <ArticleSkeleton isMobile={isMobile} />}

        {/* Article error */}
        {!yt.isYouTube && error && (
          <div style={{ textAlign: "center", padding: "40px 20px", maxWidth: 360, margin: "0 auto" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: T.textTertiary, opacity: 0.55, marginBottom: 12 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
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

            {/* ── Hero image — full bleed, no text overlay ── */}
            {content.image && (
              <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", flexShrink: 0, background: T.surface2 }}>
                <img
                  src={content.image} alt=""
                  loading="eager" decoding="async"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%", display: "block" }}
                  onError={e => { e.target.parentElement.style.display = "none"; }}
                />
              </div>
            )}

            {/* ── Content column ── */}
            <div style={{
              maxWidth: "var(--reader-line-width)",
              margin: "0 auto",
              padding: isMobile ? "20px 20px 140px" : "28px 36px 120px",
              width: "100%",
            }}>

              {/* Source + favicon */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                {faviconUrl && <img src={faviconUrl} alt="" width={15} height={15} loading="lazy" decoding="async" style={{ borderRadius: 3, flexShrink: 0, opacity: .85 }} onError={e => { e.target.style.display="none"; }} />}
                <span style={{ fontSize: 12, fontWeight: 600, color: T.textTertiary, letterSpacing: ".02em", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.source}
                </span>
              </div>

              {/* Title */}
              <h1 style={{
                fontFamily: "var(--reader-font-family)",
                fontSize: isMobile ? 27 : 36,
                fontWeight: 800,
                color: T.text,
                margin: "0 0 14px",
                lineHeight: 1.12,
                letterSpacing: "-.03em",
              }}>
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  style={{ color: "inherit", textDecoration: "none" }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = ".8"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  {content.title || item.title}
                </a>
              </h1>

              {/* Date · author · reading time */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 28, fontSize: 13, color: T.textTertiary, lineHeight: 1.5 }}>
                {item.date && <span>{formatArticleDate(item.date)}</span>}
                {item.author && <><span style={{ opacity: .4 }}>·</span><span>{item.author}</span></>}
                {readingTimeMins && <><span style={{ opacity: .4 }}>·</span><span>{readingTimeMins} min read</span></>}
              </div>

              {/* AI Summarize */}
              <SummaryBlock summary={summary} summarizing={summarizing} onSummarize={handleSummarize} summaryStyle={summaryStyle} onStyleChange={setSummaryStyle} T={T} bodyText={content?.bodyText} articleTitle={content?.title || item?.title} />

              {/* RSS-fallback notice — shown when article couldn't be fetched */}
              {content._fromRSS && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 20px", padding: "8px 12px", borderRadius: 8, background: T.surface2, fontSize: 12, color: T.textTertiary }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>
                  <span>Showing RSS feed preview — </span>
                  <a href={item?.url} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "none", fontWeight: 600 }}>read full article ↗</a>
                </div>
              )}

              {content.description && (
                <p style={{ fontSize: 16, color: T.textSecondary, lineHeight: 1.7, margin: "0 0 28px", fontStyle: "italic" }}>
                  {content.description}
                </p>
              )}

              {/* Translation toggle */}
              {translatedText && (
                <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
                  {[["original", "Original"], ["translated", "Translated"]].map(([val, label]) => {
                    const active = val === "translated" ? showTranslation : !showTranslation;
                    return (
                      <button key={val} onClick={() => setShowTranslation(val === "translated")}
                        style={{
                          padding: "4px 12px", borderRadius: 20, border: `1px solid ${active ? T.accent : T.border}`,
                          background: active ? T.accentSurface : "transparent",
                          color: active ? T.accent : T.textTertiary,
                          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                          transition: "background .1s, color .1s, border-color .1s",
                        }}
                      >{label}</button>
                    );
                  })}
                </div>
              )}

              {/* Article body */}
              <div ref={articleRef} className="fb-article-reader" style={{ fontSize: "var(--reader-font-size)", color: T.text, lineHeight: 1.9, wordBreak: "break-word", fontFamily: "var(--reader-font-family)", letterSpacing: "-.005em", position: "relative" }}
                onClick={e => { if (e.target.tagName === "IMG") handleImageHighlight(e.target.src); }}
              >
              {imgFeedback && (
                <div style={{ position: "fixed", bottom: isMobile ? 80 : 24, left: "50%", transform: "translateX(-50%)", zIndex: 900, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: T.text, boxShadow: "0 2px 12px rgba(0,0,0,.12)", pointerEvents: "none", animation: "fadeInScale .15s ease" }}>
                  {imgFeedback}
                </div>
              )}
                {showTranslation && translatedText ? (
                  <div>
                    {translatedText.split(/\n\n+/).filter(Boolean).map((para, i) => (
                      <p key={i} style={{ margin: "0 0 1.4em" }}>{para}</p>
                    ))}
                  </div>
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
            aria-label="Back to top"
            style={{
              position: "sticky", bottom: isMobile ? 74 : 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginLeft: "auto", marginRight: 16, marginBottom: 16,
              width: 38, height: 38, borderRadius: "50%",
              background: T.card, border: `1px solid ${T.border}`,
              boxShadow: "0 2px 12px rgba(0,0,0,.15)",
              cursor: "pointer", fontSize: 18, color: T.textSecondary,
              transition: "background .15s, color .15s", zIndex: 20,
              animation: "fadeInScale .2s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background=T.accentSurface; e.currentTarget.style.color=T.accent; }}
            onMouseLeave={e => { e.currentTarget.style.background=T.card; e.currentTarget.style.color=T.textSecondary; }}
          >↑</button>
        )}
      </div>{/* closes scrollContainerRef */}

      {/* ── Note panel ── */}
      {activeNote && (
        <NotePanel highlight={activeNote} onSave={handleSaveNote} onDelete={handleDeleteHighlight} onClose={() => setActiveNote(null)} onUpdateTags={handleUpdateHighlightTags} />
      )}

      {/* ── Highlights drawer ── */}
      {showDrawer && (
        <HighlightsDrawer highlights={highlights}
          articleTitle={content?.title || item?.title}
          articleUrl={item?.url}
          onUpdateTags={handleUpdateHighlightTags}
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

// ── HTML highlight injection ───────────────────────────────────
// Wraps matched passage text in <mark> elements inside HTML strings.
// Simple regex approach — works for most articles; skips passages that
// straddle tag boundaries (rare in practice).

// ── HighlightedText — clean version without TTS word spans ───
function HighlightedText({ text, highlights, onClickHighlight, bionic = false }) {
  const hasHighlights = highlights && highlights.length > 0;

  const tokens = useMemo(() => {
    if (!text || !bionic || hasHighlights) return null;
    return text.split(/(\s+)/);
  }, [text, bionic, hasHighlights]);

  const segments = useMemo(() => {
    if (!text || !hasHighlights) return null;
    const intervals = [];
    highlights.forEach((h) => {
      const idx = text.indexOf(h.passage);
      if (idx !== -1) intervals.push({ start: idx, end: idx + h.passage.length, highlight: h });
    });
    intervals.sort((a, b) => a.start - b.start);
    const segs = [];
    let cursor = 0;
    intervals.forEach(({ start, end, highlight }) => {
      if (start < cursor) return;
      if (start > cursor) segs.push({ type: "text", content: text.slice(cursor, start) });
      segs.push({ type: "highlight", content: text.slice(start, end), highlight });
      cursor = end;
    });
    if (cursor < text.length) segs.push({ type: "text", content: text.slice(cursor) });
    return segs;
  }, [text, highlights, hasHighlights]);

  if (!text) return null;

  function BionicSpan({ word }) {
    const n = Math.max(1, Math.ceil(word.length * 0.45));
    return <><strong style={{ fontWeight: 700 }}>{word.slice(0, n)}</strong>{word.slice(n)}</>;
  }

  if (!hasHighlights) {
    if (!bionic) return <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>;
    return (
      <span style={{ whiteSpace: "pre-wrap" }}>
        {tokens.map((t, i) => /\S/.test(t) ? <BionicSpan key={i} word={t} /> : t)}
      </span>
    );
  }

  return (
    <span style={{ whiteSpace: "pre-wrap" }}>
      {(segments || []).map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.content}</span>;
        const colorDef = HIGHLIGHT_COLORS.find((c) => c.id === seg.highlight.color) || HIGHLIGHT_COLORS[0];
        return (
          <mark key={i}
            role="button"
            tabIndex={0}
            onClick={() => onClickHighlight(seg.highlight)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClickHighlight(seg.highlight); } }}
            aria-label={seg.highlight.note ? `Highlight with note: ${seg.highlight.note}` : "Highlight — press Enter to add a note"}
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
  { id: "brief",     label: "Brief"      },
  { id: "actions",   label: "Actions"    },
];

const SparkleIcon = ({ size = 13, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" style={style}>
    <path d="M8 0 L9.6 6.4 L16 8 L9.6 9.6 L8 16 L6.4 9.6 L0 8 L6.4 6.4 Z" />
  </svg>
);

function SummaryBlock({ summary, summarizing, onSummarize, summaryStyle = "keypoints", onStyleChange, T, bodyText, articleTitle }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [asking, setAsking] = useState(false);

  async function handleAsk() {
    if (!question.trim() || !bodyText) return;
    setAsking(true); setAnswer(null);
    try {
      const a = await askQuestion(bodyText, articleTitle || "", question.trim());
      setAnswer(a);
    } catch { setAnswer("Couldn't get an answer. Check your AI key in Settings."); }
    finally { setAsking(false); }
  }

  const bullets = useMemo(() => (summary || "")
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
    .filter(l => l.length > 10),
  [summary]);

  // ── Post-summary: result card with format switcher at bottom ──
  if (summary || summarizing) {

    return (
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "18px 20px",
        marginBottom: 32,
        marginTop: 8,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <SparkleIcon size={12} style={{ color: T.accent, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: T.accent }}>
            AI Summary
          </span>
        </div>

        {/* Content */}
        {summarizing ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", color: T.textTertiary }}>
            <SparkleIcon size={12} style={{ opacity: 0.5, animation: "spin 1.2s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Summarizing…</span>
          </div>
        ) : bullets.length > 0 ? (
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

        {/* Format switcher — bottom of card, only when content exists */}
        {!summarizing && (
          <div style={{ display: "flex", gap: 6, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
            {SUMMARY_STYLES.map(s => (
              <button key={s.id}
                onClick={() => { onStyleChange?.(s.id); onSummarize?.(s.id); }}
                style={{
                  padding: "4px 12px", borderRadius: 100,
                  border: `1px solid ${summaryStyle === s.id ? T.accent : T.border}`,
                  background: summaryStyle === s.id ? T.accentSurface : "transparent",
                  color: summaryStyle === s.id ? T.accent : T.textTertiary,
                  fontSize: 11, fontWeight: summaryStyle === s.id ? 600 : 400,
                  cursor: "pointer", fontFamily: "inherit", transition: "background .12s, color .12s, border-color .12s",
                }}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Ask a question — only when summary exists and bodyText available */}
        {!summarizing && bodyText && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !asking && handleAsk()}
                placeholder="Ask about this article…"
                aria-label="Ask about this article"
                style={{
                  flex: 1, fontSize: 13, padding: "7px 12px", borderRadius: 8,
                  border: `1px solid ${T.border}`, background: T.bg, color: T.text,
                  fontFamily: "inherit", outline: "none",
                }}
              />
              <button
                onClick={handleAsk}
                disabled={asking || !question.trim()}
                style={{
                  padding: "7px 14px", borderRadius: 8, border: "none",
                  background: T.accent, color: T.accentText,
                  fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  cursor: asking || !question.trim() ? "default" : "pointer",
                  opacity: asking || !question.trim() ? 0.5 : 1,
                  flexShrink: 0,
                }}
              >{asking ? "…" : "Ask"}</button>
            </div>
            {answer && (
              <div style={{ marginTop: 10, fontSize: 13, color: T.text, lineHeight: 1.65, padding: "10px 12px", background: T.surface2 || T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                {answer}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Pre-summary: single button ────────────────────────────
  return (
    <div style={{ textAlign: "center", padding: "24px 0 28px" }}>
      <button
        onClick={() => onSummarize?.(summaryStyle)}
        disabled={summarizing}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 26px", borderRadius: 100,
          border: `1px solid ${T.borderStrong || T.border}`,
          background: "transparent", color: T.text,
          fontSize: 11, fontWeight: 700, fontFamily: "inherit",
          letterSpacing: ".1em", textTransform: "uppercase",
          cursor: "pointer", transition: "border-color .2s, color .2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderStrong || T.border; e.currentTarget.style.color = T.text; }}
      >
        <SparkleIcon size={12} />
        Summarize
      </button>
    </div>
  );
}


// ── Overflow menu — secondary article actions ─────────────────
function OverflowMenu({ T, item, content, yt, highlights, tags, showTags, setShowTags, showDrawer, setShowDrawer, handleShare, shareFeedback, handleExportHighlights, handleExportObsidian, exportFeedback, onTranslate, translating, hasTranslation, showTranslation }) {
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
      role="menuitem"
      onClick={() => { action(); setOpen(false); }}
      style={{ display:"flex", alignItems:"center", width:"100%", padding:"8px 16px", background:"none", border:"none", cursor:"pointer", fontSize:13, color: accent ? T.accent : T.text, fontFamily:"inherit", textAlign:"left", gap:8, transition:"background .1s" }}
      onMouseEnter={e => e.currentTarget.style.background=T.surface2}
      onMouseLeave={e => e.currentTarget.style.background="transparent"}
    >{label}</button>
  );

  return (
    <div ref={ref} style={{ position:"relative", flexShrink:0 }}>
      <button onClick={() => setOpen(v => !v)}
        aria-label="More options"
        aria-expanded={open}
        aria-haspopup="menu"
        style={{ background: open ? T.surface2 : "transparent", border:"none", borderRadius:8, padding:"6px 8px", cursor:"pointer", fontSize:16, color: open ? T.textSecondary : T.textTertiary, fontFamily:"inherit", lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center", width:34, height:32, transition:"background .12s, color .12s" }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.textSecondary; }}}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textTertiary; }}}
      >···</button>
      {open && (
        <div role="menu" aria-label="Article options" style={{ position:"absolute", right:0, top:"calc(100% + 4px)", zIndex:200, background:T.card, border:`1px solid ${T.border}`, borderRadius:12, boxShadow:"0 4px 24px rgba(0,0,0,.14)", minWidth:180, padding:"4px 0", animation:"fadeInScale .12s ease" }}>
          {item?.url && menuItem("Open in browser ↗", () => window.open(item.url, "_blank"))}
          <div style={{ height:1, background:T.border, margin:"4px 0" }} />
          {menuItem(showTags ? "Hide tags" : `Tags${tags.length > 0 ? ` (${tags.length})` : ""}`, () => setShowTags(v => !v))}
          {!yt?.isYouTube && menuItem(`Highlights${highlights.length > 0 ? ` (${highlights.length})` : ""}`, () => setShowDrawer(true))}
          {!yt?.isYouTube && highlights.length > 0 && menuItem(exportFeedback || "Copy highlights as MD", () => handleExportHighlights(false), true)}
          {!yt?.isYouTube && highlights.length > 0 && menuItem("Download highlights .md", () => handleExportHighlights(true))}
          {!yt?.isYouTube && highlights.length > 0 && menuItem(exportFeedback === "✓ Copied for Obsidian" ? exportFeedback : "Copy for Obsidian ⟦ ⟧", () => handleExportObsidian())}
          {!yt?.isYouTube && content && (
            <>
              <div style={{ height:1, background:T.border, margin:"4px 0" }} />
              {menuItem(translating ? "Translating…" : hasTranslation ? (showTranslation ? "Show original" : "Show translation") : "Translate to English", onTranslate)}
            </>
          )}
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
                  {HIGHLIGHT_COLORS.map(({ id, label, bg }) => (
                    <button key={id} onClick={() => commitHighlight(id)} aria-label={`Highlight ${label}`}
                      style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid transparent", cursor: "pointer",
                        background: bg,
                        transition: "border-color .1s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = T.text}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                    />
                  ))}
                  <button onClick={() => setPendingHighlight(null)} aria-label="Cancel highlight"
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
// Full inline audio player for podcast items in the right panel
function PodcastEpisodeView({ item, summary, summarizing, onSummarize, T }) {
  const { isMobile } = useBreakpoint();
  const audioRef  = useRef(null);
  const sleepRef  = useRef(null);
  const [playing, setPlaying]           = useState(false);
  const [progress, setProgress]         = useState(0);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [audioLoading, setAudioLoading] = useState(true);
  const [rate, setRate]                 = useState(1);
  const [sleepTimer, setSleepTimer]     = useState(null); // minutes remaining
  const [notesExpanded, setNotesExpanded] = useState(false);
  const desc     = item?.description || item?.fullText || "";
  const chapters = parseChapters(desc);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded  = () => { setAudioLoading(false); setDuration(audio.duration || 0); };
    const onTime    = () => { setCurrentTime(audio.currentTime); setProgress(audio.duration ? audio.currentTime / audio.duration : 0); };
    const onEnded   = () => setPlaying(false);
    const onWaiting = () => setAudioLoading(true);
    const onCanPlay = () => setAudioLoading(false);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    return () => {
      clearInterval(sleepRef.current);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
    };
  }, [item?.audioUrl]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  }
  function seek(e) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
  }
  function skip(secs) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + secs));
  }
  function cycleRate() {
    const audio = audioRef.current;
    if (!audio) return;
    const rates = [1, 1.25, 1.5, 1.75, 2];
    const next  = rates[(rates.indexOf(rate) + 1) % rates.length];
    audio.playbackRate = next;
    setRate(next);
  }
  function toggleSleep() {
    if (sleepTimer !== null) {
      clearInterval(sleepRef.current);
      setSleepTimer(null);
      return;
    }
    let mins = 30;
    setSleepTimer(mins);
    sleepRef.current = setInterval(() => {
      mins -= 1;
      if (mins <= 0) {
        clearInterval(sleepRef.current);
        audioRef.current?.pause();
        setPlaying(false);
        setSleepTimer(null);
      } else {
        setSleepTimer(mins);
      }
    }, 60000);
  }
  function fmt(secs) {
    if (!isFinite(secs)) return "0:00";
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = Math.floor(secs % 60);
    return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
  }

  function SkipButton({ seconds, label }) {
    const isBack = seconds < 0;
    return (
      <button onClick={() => skip(seconds)} aria-label={`Skip ${isBack ? "back" : "forward"} ${Math.abs(seconds)} seconds`} style={{
        background: "none", border: "none", cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        color: T.textSecondary, padding: "4px 8px",
      }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {isBack
            ? <><path d="M7 14A7 7 0 1 1 9.5 7.5"/><polyline points="4,8 7,14 10,8"/></>
            : <><path d="M21 14A7 7 0 1 0 18.5 7.5"/><polyline points="18,8 21,14 24,8"/></>
          }
        </svg>
        <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
      </button>
    );
  }

  const artSize = isMobile ? "min(220px, 55vw)" : "180px";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <audio ref={audioRef} src={item?.audioUrl} preload="metadata" />

      {/* Album art */}
      <div style={{
        width: artSize, height: artSize, borderRadius: 18,
        overflow: "hidden", flexShrink: 0,
        boxShadow: "0 16px 48px rgba(0,0,0,.35)",
        marginBottom: 24, marginTop: 8,
      }}>
        {item?.image
          ? <img src={item.image} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${T.accent}44, ${T.accent}22)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke={T.accent} strokeWidth="1.5" opacity="0.6">
                <circle cx="28" cy="28" r="22"/><circle cx="28" cy="28" r="8"/><circle cx="28" cy="28" r="2" fill={T.accent}/>
                <line x1="28" y1="6" x2="28" y2="12"/><line x1="28" y1="44" x2="28" y2="50"/>
                <line x1="6" y1="28" x2="12" y2="28"/><line x1="44" y1="28" x2="50" y2="28"/>
              </svg>
            </div>
          )
        }
      </div>

      {/* Title & metadata */}
      <div style={{ textAlign: "center", width: "100%", maxWidth: 380, marginBottom: 20, padding: "0 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: T.accent, textTransform: "uppercase", marginBottom: 6 }}>
          {item?.source || "Podcast"}
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: T.text, margin: "0 0 8px", lineHeight: 1.3, fontFamily: "var(--reader-font-family)" }}>
          {item?.title}
        </h2>
        {item?.date && (
          <div style={{ fontSize: 12, color: T.textTertiary }}>
            {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        )}
      </div>

      {/* Seek bar */}
      <div style={{ width: "100%", maxWidth: 380, padding: "0 8px", marginBottom: 8 }}>
        <div
          onClick={seek}
          style={{ height: 4, background: T.border, borderRadius: 2, cursor: "pointer", position: "relative" }}
        >
          <div style={{ height: "100%", width: "100%", background: T.accent, borderRadius: 2, transform: `scaleX(${progress})`, transformOrigin: "left", transition: "transform .2s linear" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 11, color: T.textTertiary, fontVariantNumeric: "tabular-nums" }}>{fmt(currentTime)}</span>
          <span style={{ fontSize: 11, color: T.textTertiary, fontVariantNumeric: "tabular-nums" }}>{duration ? fmt(duration) : "--:--"}</span>
        </div>
      </div>

      {/* Main controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <SkipButton seconds={-15} label="15" />
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          style={{
            width: 64, height: 64, borderRadius: "50%",
            background: T.accent, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 8px 24px ${T.accent}55`,
            color: T.accentText, flexShrink: 0,
          }}
        >
          {audioLoading
            ? <Spinner size={24} />
            : playing
              ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          }
        </button>
        <SkipButton seconds={30} label="30" />
      </div>

      {/* Secondary controls */}
      <div style={{ display: "flex", gap: 20, marginBottom: 28 }}>
        <button onClick={cycleRate} aria-label={`Playback rate: ${rate}x, click to change`} style={{
          background: T.surface2, border: "none", borderRadius: 8,
          padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700,
          color: rate !== 1 ? T.accent : T.textSecondary,
        }}>
          {rate}×
        </button>
        <button onClick={toggleSleep} aria-label={sleepTimer !== null ? `Cancel sleep timer (${sleepTimer} minutes remaining)` : "Set sleep timer"} style={{
          background: sleepTimer !== null ? `${T.accent}22` : T.surface2,
          border: "none", borderRadius: 8,
          padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
          color: sleepTimer !== null ? T.accent : T.textSecondary,
        }}>
          {sleepTimer !== null ? `💤 ${sleepTimer}m` : "💤"}
        </button>
      </div>

      {/* AI Summary */}
      <div style={{ width: "100%", maxWidth: 520, marginBottom: 16 }}>
        <SummaryBlock summary={summary} summarizing={summarizing} onSummarize={onSummarize} summaryStyle="keypoints" T={T} />
      </div>

      {/* Chapters */}
      {chapters.length > 0 && (
        <div style={{ width: "100%", maxWidth: 520, marginBottom: 20 }}>
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
        <div style={{ width: "100%", maxWidth: 520 }}>
          <button onClick={() => setNotesExpanded(v => !v)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: T.textSecondary,
            padding: 0, fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
          }}>
            {notesExpanded ? "▲" : "▼"} Show notes
          </button>
          <div style={{ maxHeight: notesExpanded ? "none" : 120, overflow: "hidden", position: "relative" }}>
            <div style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{desc}</div>
            {!notesExpanded && desc.length > 300 && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: `linear-gradient(transparent, ${T.bg})` }} />
            )}
          </div>
          {!notesExpanded && desc.length > 300 && (
            <button onClick={() => setNotesExpanded(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.accent, padding: "8px 0 0", fontFamily: "inherit" }}>
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

// ── Article loading skeleton — mirrors real article layout ─────
function ArticleSkeleton({ isMobile }) {
  const pad = isMobile ? "20px 20px 80px" : "28px 36px 80px";
  return (
    <div style={{ animation: "fadeIn .2s ease" }}>
      {/* Hero image placeholder */}
      <div className="skeleton" style={{ width: "100%", aspectRatio: "16/9", borderRadius: 0 }} />
      <div style={{ maxWidth: 690, margin: "0 auto", padding: pad }}>
        {/* Source line */}
        <div className="skeleton" style={{ height: 11, width: 80, borderRadius: 4, marginBottom: 18 }} />
        {/* Title — two lines */}
        <div className="skeleton" style={{ height: isMobile ? 28 : 36, width: "95%", borderRadius: 6, marginBottom: 10 }} />
        <div className="skeleton" style={{ height: isMobile ? 28 : 36, width: "72%", borderRadius: 6, marginBottom: 18 }} />
        {/* Byline */}
        <div className="skeleton" style={{ height: 12, width: 180, borderRadius: 4, marginBottom: 36 }} />
        {/* Paragraph 1 */}
        {[96, 100, 88, 100, 82].map((w, i) => (
          <div key={i} className="skeleton" style={{ height: 15, width: `${w}%`, borderRadius: 4, marginBottom: 11 }} />
        ))}
        <div style={{ height: 20 }} />
        {/* Paragraph 2 */}
        {[92, 100, 76, 100, 90, 58].map((w, i) => (
          <div key={i + 10} className="skeleton" style={{ height: 15, width: `${w}%`, borderRadius: 4, marginBottom: 11 }} />
        ))}
      </div>
    </div>
  );
}
