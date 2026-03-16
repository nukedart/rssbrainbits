import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { Button, Spinner } from "./UI";
import { fetchArticleContent, summarizeContent, parseYouTubeUrl } from "../lib/fetchers";
import SelectionToolbar, { HIGHLIGHT_COLORS, getHighlightStyle } from "./SelectionToolbar";
import NotePanel from "./NotePanel";
import HighlightsDrawer from "./HighlightsDrawer";
import TagsInput from "./TagsInput";
import TTSPlayer, { InlineAudioPlayer } from "./TTSPlayer";
import {
  saveItem, addHighlight, getHighlights, updateHighlightNote, deleteHighlight,
  getArticleTags, addArticleTag, deleteArticleTag, getAllTags,
} from "../lib/supabase";

export default function ContentViewer({ item, onClose }) {
  const { T } = useTheme();
  const { user } = useAuth();

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
  const [tags, setTags]       = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [showTags, setShowTags] = useState(false);

  // TTS
  const [showTTS, setShowTTS]         = useState(false);
  const [ttsMode, setTtsMode]           = useState("article"); // "article" | "summary"
  const [audioBlobUrl, setAudioBlobUrl]   = useState(null); // persisted OpenAI audio
  const [audioBlobVoice, setAudioBlobVoice] = useState("nova");
  const [activeWordIdx, setActiveWordIdx] = useState(-1);

  const articleRef = useRef(null);
  const yt = item?.url ? parseYouTubeUrl(item.url) : { isYouTube: false };

  // ── Fetch article ──────────────────────────────────────────
  useEffect(() => {
    if (!item || yt.isYouTube) return;
    setLoading(true); setError(null);
    fetchArticleContent(item.url)
      .then(setContent).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [item?.url]);

  // ── Load highlights + tags ─────────────────────────────────
  useEffect(() => {
    if (!user || !item?.url) return;
    getHighlights(user.id, item.url).then(setHighlights).catch(console.error);
    getArticleTags(user.id, item.url).then((rows) => setTags(rows.map((r) => r.tag))).catch(console.error);
    getAllTags(user.id).then(setAllTags).catch(console.error);
  }, [user, item?.url]);

  // ── Listen for word boundary events from TTSPlayer ────────
  useEffect(() => {
    function onTTSWord(e) {
      setActiveWordIdx(e.detail.index);
      // Auto-scroll the active word into view
      const el = document.getElementById(`word-${e.detail.index}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    window.addEventListener("tts-word", onTTSWord);
    return () => window.removeEventListener("tts-word", onTTSWord);
  }, []);

  // ── Highlight handlers ────────────────────────────────────
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
    setHighlights((prev) => prev.map((h) => h.id === highlightId ? { ...h, note } : h));
  }

  async function handleDeleteHighlight(highlightId) {
    await deleteHighlight(highlightId);
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
  }

  // ── Tag handlers ──────────────────────────────────────────
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

  // ── Save ──────────────────────────────────────────────────
  async function handleSave() {
    await saveItem(user.id, { ...item, summary });
    setSaved(true);
  }

  // ── AI summary ────────────────────────────────────────────
  async function handleSummarize() {
    const text = content?.bodyText || item?.description || "";
    if (!text) return;
    setSummarizing(true);
    const result = await summarizeContent(text, content?.title || item?.title);
    setSummary(result);
    setSummarizing(false);
  }

  if (!item) return null;

  // The clean text fed to TTS — strip markdown artifacts
  const ttsText = ttsMode === "summary" && summary ? summary : (content?.bodyText || "");
  const ttsWords = ttsText.match(/\S+/g) || [];

  return (
    <div style={{
      position: "fixed", inset: 0, background: T.bg, zIndex: 500,
      borderLeft: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
      // Extra bottom padding when TTS player is open
      paddingBottom: showTTS ? 80 : 0,
    }}>

      {/* ── Top bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: T.card, borderBottom: `1px solid ${T.border}`,
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
      }}>
        <button onClick={onClose} style={{
          background: T.surface2, border: "none", borderRadius: 8,
          width: 32, height: 32, cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center",
          color: T.textSecondary, fontSize: 18, fontFamily: "inherit",
        }}>←</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.source || "Feedbox"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* TTS button — only for articles */}
          {!yt.isYouTube && content && (
            <button onClick={() => setShowTTS((v) => !v)} title="Listen" style={{
              background: showTTS ? T.accentSurface : T.surface2,
              border: "none", borderRadius: 8, padding: "6px 10px",
              cursor: "pointer", fontSize: 14,
              color: showTTS ? T.accentText : T.textSecondary,
              fontFamily: "inherit",
            }}>🎧</button>
          )}

          {/* Tags */}
          <button onClick={() => setShowTags((v) => !v)} style={{
            background: showTags ? T.accentSurface : T.surface2,
            border: "none", borderRadius: 8, padding: "6px 10px",
            cursor: "pointer", fontSize: 12, fontWeight: 600,
            color: showTags ? T.accentText : T.textSecondary,
            fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
          }}>
            🏷 {tags.length > 0 && <span>{tags.length}</span>}
          </button>

          {/* Highlights drawer */}
          {!yt.isYouTube && (
            <button onClick={() => setShowDrawer(true)} style={{
              background: T.surface2, border: "none", borderRadius: 8,
              padding: "6px 10px", cursor: "pointer",
              fontSize: 12, fontWeight: 600, color: T.textSecondary,
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
            }}>
              ✍️ {highlights.length > 0 && <span style={{ color: T.accent }}>{highlights.length}</span>}
            </button>
          )}

          <Button variant="secondary" size="sm" onClick={() => window.open(item.url, "_blank")}>↗</Button>
          <Button size="sm" onClick={handleSave} disabled={saved}>{saved ? "✓" : "Save"}</Button>
        </div>
      </div>

      {/* ── Tags bar ── */}
      {showTags && (
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "10px 16px" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: T.textTertiary, marginBottom: 8 }}>Tags</div>
            <TagsInput tags={tags} onAdd={handleAddTag} onRemove={handleRemoveTag} allTags={allTags} />
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{ position: "relative", maxWidth: 680, margin: "0 auto", padding: "28px 20px 60px", width: "100%" }}>

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
            <SummaryBlock summary={summary} summarizing={summarizing} onSummarize={handleSummarize} onPlaySummary={() => { setTtsMode("summary"); setShowTTS(true); }} T={T} />
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
              <img src={content.image} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 20, maxHeight: 300, objectFit: "cover" }} />
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

            {audioBlobUrl && ttsMode === "article" && (
              <InlineAudioPlayer blobUrl={audioBlobUrl} voiceLabel={audioBlobVoice} />
            )}

            <SummaryBlock summary={summary} summarizing={summarizing} onSummarize={handleSummarize} onPlaySummary={() => { setTtsMode("summary"); setShowTTS(true); }} T={T} />

            {content.description && (
              <p style={{ fontSize: 16, color: T.textSecondary, lineHeight: 1.7, margin: "0 0 24px", fontStyle: "italic" }}>
                {content.description}
              </p>
            )}

            {/* Article body — highlighted text with TTS word sync */}
            <div ref={articleRef} style={{ fontSize: 15, color: T.text, lineHeight: 1.85, wordBreak: "break-word" }}>
              <ArticleBody
                text={content.bodyText}
                highlights={highlights}
                onClickHighlight={setActiveNote}
                activeWordIdx={activeWordIdx}
                ttsActive={showTTS}
                T={T}
              />
            </div>
          </div>
        )}

        {/* Selection toolbar for highlighting */}
        {!yt.isYouTube && content && (
          <SelectionToolbar containerRef={articleRef} onHighlight={handleHighlight} />
        )}
      </div>

      {/* ── TTS floating player ── */}
      {showTTS && content && (
        <TTSPlayer
          text={ttsText}
          wordCount={ttsWords.length}
          label={ttsMode === "summary" ? "Playing AI summary" : "Listen to article"}
          onAudioReady={(url, voice) => { setAudioBlobUrl(url); setAudioBlobVoice(voice); }}
          onClose={() => { setShowTTS(false); setActiveWordIdx(-1); setTtsMode("article"); }}
        />
      )}

      {/* ── Note panel ── */}
      {activeNote && (
        <NotePanel highlight={activeNote} onSave={handleSaveNote} onDelete={handleDeleteHighlight} onClose={() => setActiveNote(null)} />
      )}

      {/* ── Highlights drawer ── */}
      {showDrawer && (
        <HighlightsDrawer highlights={highlights}
          onSelectHighlight={(h) => { setActiveNote(h); setShowDrawer(false); }}
          onClose={() => setShowDrawer(false)} />
      )}
    </div>
  );
}

// ── ArticleBody ───────────────────────────────────────────────
// Renders text as individual word spans (for TTS sync) while also
// overlaying user highlights. Both systems work simultaneously.
function ArticleBody({ text, highlights, onClickHighlight, activeWordIdx, ttsActive, T }) {
  if (!text) return null;

  // Build a flat list of characters tagged as highlighted or not
  // Then group into word spans for TTS, respecting highlight boundaries

  // Step 1: mark highlight ranges
  const charMeta = new Array(text.length).fill(null); // null or { highlight }
  highlights.forEach((h) => {
    const idx = text.indexOf(h.passage);
    if (idx === -1) return;
    for (let i = idx; i < idx + h.passage.length; i++) {
      charMeta[i] = h;
    }
  });

  // Step 2: split into words with their char positions
  const wordTokens = [];
  const regex = /(\S+|\s+)/g;
  let match;
  let wordCounter = 0;
  while ((match = regex.exec(text)) !== null) {
    const isWord = /\S/.test(match[0]);
    wordTokens.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      isWord,
      wordIdx: isWord ? wordCounter++ : -1,
    });
  }

  return (
    <span style={{ whiteSpace: "pre-wrap" }}>
      {wordTokens.map((token, i) => {
        if (!token.isWord) return <span key={i}>{token.text}</span>;

        const isActiveWord = ttsActive && token.wordIdx === activeWordIdx;

        // Does this word have a highlight? Check first char of word
        const h = charMeta[token.start];
        const colorDef = h ? HIGHLIGHT_COLORS.find((c) => c.id === h.color) || HIGHLIGHT_COLORS[0] : null;

        const baseStyle = h ? {
          backgroundColor: colorDef.bg,
          borderRadius: 3,
          padding: "1px 0",
          cursor: "pointer",
          borderBottom: h.note ? `2px solid ${colorDef.border}` : "none",
        } : {};

        const ttsStyle = isActiveWord ? {
          backgroundColor: "#FCD34D",
          borderRadius: 3,
          padding: "1px 2px",
          outline: "2px solid #F59E0B",
          outlineOffset: 1,
        } : {};

        return (
          <mark
            key={i}
            id={`word-${token.wordIdx}`}
            onClick={h ? () => onClickHighlight(h) : undefined}
            style={{
              background: "none",      // reset default mark yellow
              ...baseStyle,
              ...ttsStyle,             // TTS highlight wins on top
              transition: "background-color .1s",
            }}
          >
            {token.text}
          </mark>
        );
      })}
    </span>
  );
}

// ── SummaryBlock ──────────────────────────────────────────────
function SummaryBlock({ summary, summarizing, onSummarize, onPlaySummary, T }) {
  if (summary) {
    return (
      <div style={{ background: T.accentSurface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: T.accentText }}>✨ AI Summary</div>
          <button onClick={onPlaySummary} title="Play summary aloud" style={{
            display: "flex", alignItems: "center", gap: 5,
            background: T.accent, border: "none", borderRadius: 20,
            padding: "4px 10px", cursor: "pointer", color: "#fff",
            fontSize: 11, fontWeight: 600, fontFamily: "inherit",
          }}>
            ▶ Play
          </button>
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
