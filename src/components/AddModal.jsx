import { useState, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { Input, Button, Spinner } from "./UI";
import { detectInputType, discoverFeed, parseXUrl, xToRSSUrl, searchApplePodcasts, resolvePodcastFeedUrl, isRSSUrl, isSpotifyPodcastUrl } from "../lib/fetchers";

const TYPE_INFO = {
  rss:     { label: "RSS Feed"          },
  podcast: { label: "Podcast"           },
  spotify: { label: "Spotify Podcast"   },
  youtube: { label: "YouTube Channel"   },
  article: { label: "Article"           },
  twitter: { label: "X / Twitter Feed"  },
};

const DISCOVER_FEEDS = {
  "Tech": [
    { name: "Hacker News",       url: "https://news.ycombinator.com/rss",               desc: "Tech & startup discussions" },
    { name: "The Verge",         url: "https://www.theverge.com/rss/index.xml",          desc: "Tech news & culture" },
    { name: "Ars Technica",      url: "https://feeds.arstechnica.com/arstechnica/index", desc: "In-depth tech journalism" },
    { name: "MIT Tech Review",   url: "https://www.technologyreview.com/feed/",          desc: "Emerging technology" },
  ],
  "AI": [
    { name: "VentureBeat AI",    url: "https://venturebeat.com/ai/feed/",               desc: "AI news & analysis" },
    { name: "Import AI",         url: "https://importai.substack.com/feed",             desc: "Weekly AI newsletter" },
    { name: "The Gradient",      url: "https://thegradient.pub/rss/",                   desc: "AI research perspectives" },
  ],
  "News": [
    { name: "BBC World News",    url: "https://feeds.bbci.co.uk/news/world/rss.xml",    desc: "International news" },
    { name: "Reuters",           url: "https://feeds.reuters.com/reuters/topNews",       desc: "Breaking news wire" },
    { name: "The Guardian",      url: "https://www.theguardian.com/world/rss",          desc: "World news & opinion" },
  ],
  "Design": [
    { name: "CSS-Tricks",        url: "https://css-tricks.com/feed/",                   desc: "Web design & CSS" },
    { name: "Smashing Magazine", url: "https://www.smashingmagazine.com/feed",          desc: "Web design & development" },
  ],
  "Science": [
    { name: "NASA",              url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", desc: "Space & exploration" },
    { name: "Scientific American", url: "https://rss.sciam.com/ScientificAmerican-Global", desc: "Science for curious minds" },
  ],
  "Business": [
    { name: "Harvard Biz Review", url: "https://hbr.org/stories.rss",                  desc: "Management & leadership" },
    { name: "Stratechery",       url: "https://stratechery.com/feed/",                  desc: "Tech strategy & business" },
  ],
};

export default function AddModal({ onAdd, onClose, onSaveForLater }) {
  const { T } = useTheme();

  const [url, setUrl]               = useState("");
  const [feedName, setFeedName]     = useState("");
  const [detected, setDetected]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered]   = useState(null);
  const [error, setError]             = useState("");
  const [showDiscover, setShowDiscover] = useState(false);
  const discoverTimerRef = useRef(null);

  function handleUrlChange(val) {
    setUrl(val); setError(""); setDiscovered(null);
    clearTimeout(discoverTimerRef.current);

    const trimmed = val.trim();
    if (!trimmed) { setDetected(null); return; }

    const xParsed = parseXUrl(trimmed);
    if (xParsed.isX || trimmed.startsWith("@")) {
      setDetected("twitter"); return;
    }

    try {
      new URL(trimmed);
      const type = detectInputType(trimmed);
      const displayType = (type === "podcast" && isSpotifyPodcastUrl(trimmed)) ? "spotify" : type;
      setDetected(displayType);
      if (type === "article" || type === "podcast") {
        if (type === "podcast" && isRSSUrl(trimmed)) {
          setDetected("rss"); return;
        }
        setDiscovering(true);
        discoverTimerRef.current = setTimeout(() => {
          const resolver = type === "podcast" ? resolvePodcastFeedUrl(trimmed) : discoverFeed(trimmed);
          resolver.then(result => {
            setDiscovered(result);
            if (result) setDetected("rss");
          }).catch(() => {}).finally(() => setDiscovering(false));
        }, 600);
      }
    } catch { setDetected(null); }
  }

  async function handleSubmit() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true); setError("");
    try {
      const xParsed = parseXUrl(trimmed);
      const isX = xParsed.isX || trimmed.startsWith("@");
      let finalUrl = discovered?.feedUrl || trimmed;
      let finalName = feedName.trim() || discovered?.title || null;

      if (isX) {
        const username = xParsed.username || trimmed.replace(/^@/, "").replace(/.*\//,"").split("/")[0];
        finalUrl = xToRSSUrl(username);
        finalName = finalName || `@${username}`;
      }

      if ((detected === "podcast" || detected === "spotify") && finalUrl === trimmed && !isRSSUrl(trimmed)) {
        const resolved = await resolvePodcastFeedUrl(trimmed).catch(() => null);
        if (resolved?.feedUrl) {
          finalUrl = resolved.feedUrl;
          finalName = finalName || resolved.title || null;
        } else {
          throw new Error("Couldn't find an RSS feed for this podcast. Try pasting the feed URL directly.");
        }
      }

      const finalType = (detected === "podcast" || detected === "spotify" || detected === "twitter" || isX) ? "rss" : (detected || "article");
      await onAdd({ url: finalUrl, type: finalType, name: finalName });
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong. Check the URL and try again.");
    } finally { setLoading(false); }
  }

  const info = detected ? TYPE_INFO[detected] : null;
  const btnLabel = loading ? "Adding…"
    : detected === "rss"     ? "Subscribe"
    : detected === "twitter" ? "Follow"
    : detected === "youtube" ? "Subscribe"
    : detected === "article" ? "Open Article"
    : "Add";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: T.overlay,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: T.card,
        borderRadius: 24,
        width: "100%", maxWidth: "min(440px, 94vw)",
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 32px 96px rgba(0,0,0,.32), 0 0 0 1px rgba(255,255,255,.04) inset",
        animation: "fadeInScale .18s ease",
        border: `1px solid ${T.border}`,
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "18px 18px 16px",
          borderBottom: `1px solid ${T.border}`,
        }}>
          {/* RSS waves icon */}
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: T.accentSurface,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={T.accent} strokeWidth="1.8" strokeLinecap="round">
              <circle cx="4" cy="12" r="1.2" fill={T.accent} stroke="none"/>
              <path d="M2 8.5a5.5 5.5 0 0 1 5.5 5.5"/>
              <path d="M2 4.5a9.5 9.5 0 0 1 9.5 9.5"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: "-.01em" }}>Add a source</div>
            <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>RSS · YouTube · Podcast · Article</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: T.surface2, border: "none", borderRadius: "50%",
              width: 28, height: 28, cursor: "pointer", flexShrink: 0,
              color: T.textSecondary, fontSize: 17, lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              WebkitTapHighlightColor: "transparent",
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 18px 22px" }}>

          {/* URL input — larger and more spacious */}
          <div style={{ position: "relative" }}>
            <input
              value={url}
              onChange={e => handleUrlChange(e.target.value)}
              placeholder="Paste a URL, @handle, or feed link…"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onClose(); }}
              style={{
                width: "100%", boxSizing: "border-box",
                background: T.surface, border: `1.5px solid ${T.border}`,
                borderRadius: 12, padding: "13px 16px",
                fontSize: 15, color: T.text,
                fontFamily: "inherit", outline: "none",
              }}
              onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accent}22`; }}
              onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Detected type badge */}
          {(info || discovering) && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, minHeight: 22 }}>
              {discovering ? (
                <><Spinner size={12} /><span style={{ fontSize: 12, color: T.textTertiary }}>Detecting…</span></>
              ) : (
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: ".04em",
                  color: T.accent, background: T.accentSurface,
                  padding: "3px 9px", borderRadius: 20,
                  border: `1px solid ${T.accent}33`,
                }}>
                  {info?.label.toUpperCase()}
                </span>
              )}
            </div>
          )}

          {/* Nickname */}
          {(detected === "rss" || detected === "podcast" || detected === "twitter" || detected === "youtube") && (
            <div style={{ marginTop: 10 }}>
              <input
                value={feedName}
                onChange={e => setFeedName(e.target.value)}
                placeholder="Nickname (optional)"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: T.surface, border: `1.5px solid ${T.border}`,
                  borderRadius: 12, padding: "11px 16px",
                  fontSize: 14, color: T.text,
                  fontFamily: "inherit", outline: "none",
                }}
                onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accent}22`; }}
                onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ fontSize: 13, color: T.danger, padding: "9px 13px", background: `${T.danger}18`, borderRadius: 10, marginTop: 12, lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {detected === "article" && onSaveForLater && (
              <Button variant="secondary" onClick={async () => {
                setLoading(true); setError("");
                try { await onSaveForLater({ url: url.trim(), type: "article" }); onClose(); }
                catch (err) { setError(err.message || "Failed to save."); }
                finally { setLoading(false); }
              }} disabled={!url.trim() || loading} style={{ flex: 1, justifyContent: "center" }}>
                {loading ? "Saving…" : "🔖 Save"}
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!url.trim() || loading}
              style={{ flex: 1, justifyContent: "center", padding: "12px" }}
            >
              {btnLabel}
            </Button>
          </div>

          {/* Browse popular feeds */}
          <div style={{ marginTop: 20, borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
            <button onClick={() => setShowDiscover(v => !v)} style={{
              display: "flex", alignItems: "center", gap: 6, width: "100%",
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 12, fontWeight: 600, color: T.textSecondary, padding: 0,
              marginBottom: showDiscover ? 14 : 0,
              WebkitTapHighlightColor: "transparent",
            }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ transform: showDiscover ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .15s" }}><path d="M4 2l4 4-4 4"/></svg>
              Browse popular feeds
            </button>
            {showDiscover && (
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {Object.entries(DISCOVER_FEEDS).map(([category, feeds]) => (
                  <div key={category}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: T.textTertiary, padding: "6px 2px 4px" }}>{category}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {feeds.map(feed => (
                        <div key={feed.url}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, background: T.surface, cursor: "pointer", transition: "background .12s" }}
                          onMouseEnter={e => e.currentTarget.style.background = T.surface2}
                          onMouseLeave={e => e.currentTarget.style.background = T.surface}
                          onClick={async () => {
                            setLoading(true); setError("");
                            try { await onAdd({ url: feed.url, type: "rss", name: feed.name }); onClose(); }
                            catch (err) { setError(err.message || "Failed to add feed."); setLoading(false); }
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{feed.name}</div>
                            <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>{feed.desc}</div>
                          </div>
                          <span style={{ fontSize: 13, color: T.accent, fontWeight: 600, flexShrink: 0, opacity: 0.7 }}>+</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {loading && <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}><Spinner size={20} /></div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
