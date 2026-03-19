import { useState, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { Input, Button } from "./UI";
import { detectInputType, discoverFeed, isPodcastUrl } from "../lib/fetchers";

const TYPE_INFO = {
  rss:     { icon: "📡", label: "RSS Feed",      desc: "All articles from this feed will appear in your inbox" },
  podcast: { icon: "🎙️", label: "Podcast Feed",   desc: "Episodes will appear in your inbox with a play button" },
  youtube: { icon: "▶️", label: "YouTube Video", desc: "Watch the video with an AI-generated summary" },
  article: { icon: "📰", label: "Article",        desc: "Read this article in a clean, focused view" },
};

export default function AddModal({ onAdd, onClose, onSaveForLater }) {
  const { T } = useTheme();
  const [url, setUrl]           = useState("");
  const [feedName, setFeedName] = useState("");
  const [detected, setDetected] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered]   = useState(null); // { feedUrl, title }
  const [error, setError]             = useState("");
  const discoverTimerRef = useRef(null);

  function handleUrlChange(val) {
    setUrl(val); setError(""); setDiscovered(null);
    clearTimeout(discoverTimerRef.current);
    try {
      new URL(val.trim());
      const type = detectInputType(val.trim());
      setDetected(type);
      // Auto-discover RSS for plain websites — debounced 600ms so we don't
      // fire a network request on every keystroke while the user is still typing
      if (type === "article" || type === "podcast") {
        setDiscovering(true);
        discoverTimerRef.current = setTimeout(() => {
          discoverFeed(val.trim()).then(result => {
            setDiscovered(result);
            if (result) setDetected("rss");
          }).catch(() => {}).finally(() => setDiscovering(false));
        }, 600);
      }
    } catch { setDetected(null); }
  }

  async function handleSubmit() {
    if (!url.trim()) return;
    setLoading(true); setError("");
    try {
      const finalUrl  = discovered?.feedUrl || url.trim();
      const finalName = feedName.trim() || discovered?.title || null;
      // Treat podcast as rss type for storage — isPodcast flag comes from enclosure tags
      const finalType = (detected === "podcast") ? "rss" : (detected || "article");
      await onAdd({ url: finalUrl, type: finalType, name: finalName });
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong. Check the URL and try again.");
    } finally { setLoading(false); }
  }

  const info = detected ? TYPE_INFO[detected] : null;
  const showDiscovery = discovering || discovered;

  return (
    // Centered dialog overlay
    <div style={{
      position: "fixed", inset: 0, background: T.overlay, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{
        background: T.card,
        borderRadius: 18,
        padding: "28px 28px 24px",
        width: "100%", maxWidth: "min(480px, 95vw)",
        boxShadow: "0 24px 80px rgba(0,0,0,.22), 0 4px 16px rgba(0,0,0,.1)",
        animation: "fadeInScale .2s ease",
        border: `1px solid ${T.border}`,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginRight: 12 }}>+</div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>Add to Feedbox</h2>
            <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 2 }}>RSS feed, podcast, article URL, or YouTube link</div>
          </div>
          <button onClick={onClose} style={{
            marginLeft: "auto", background: T.surface2, border: "none",
            borderRadius: 8, width: 30, height: 30, cursor: "pointer",
            color: T.textSecondary, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* URL input */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, display: "block", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".06em" }}>URL</label>
          <Input value={url} onChange={handleUrlChange}
            placeholder="https://example.com/feed, podcast URL, or article…"
            autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onClose(); }} />
        </div>

        {/* Detected type pill */}
        {info && (
          <div style={{
            display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10,
            background: T.accentSurface, border: `1px solid ${T.border}`, marginBottom: 14, alignItems: "center",
          }}>
            <span style={{ fontSize: 20 }}>{info.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.accentText }}>{info.label}</div>
              <div style={{ fontSize: 12, color: T.textSecondary }}>{info.desc}</div>
            </div>
          </div>
        )}

        {/* Optional nickname for RSS */}
        {(detected === "rss" || detected === "podcast") && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, display: "block", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".06em" }}>Nickname (optional)</label>
            <Input value={feedName} onChange={setFeedName} placeholder="e.g. Hacker News, The Verge…" />
          </div>
        )}

        {error && (
          <div style={{ fontSize: 13, color: T.danger, padding: "9px 13px", background: `${T.danger}15`, borderRadius: 9, marginBottom: 14, lineHeight: 1.5 }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancel</Button>
          {detected === "article" && onSaveForLater && (
            <Button variant="secondary" onClick={async () => {
              setLoading(true); setError("");
              try { await onSaveForLater({ url: url.trim(), type: "article" }); onClose(); }
              catch (err) { setError(err.message || "Failed to save."); }
              finally { setLoading(false); }
            }} disabled={!url.trim() || loading} style={{ flex: 2, justifyContent: "center" }}>
              {loading ? "Saving…" : "⏱ Save for Later"}
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={!url.trim() || loading} style={{ flex: 2, justifyContent: "center" }}>
            {loading ? "Loading…" : detected === "rss" ? "Subscribe to Feed" : "Open"}
          </Button>
        </div>
      </div>
    </div>
  );
}
