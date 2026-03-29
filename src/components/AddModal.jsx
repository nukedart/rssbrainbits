import { useState, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { Input, Button, Spinner } from "./UI";
import { detectInputType, discoverFeed, parseXUrl, xToRSSUrl, searchApplePodcasts, resolvePodcastFeedUrl, isRSSUrl } from "../lib/fetchers";

const TYPE_INFO = {
  rss:     { icon: "📡",  label: "RSS Feed",          desc: "All articles from this feed will appear in your inbox" },
  podcast: { icon: "🎙️", label: "Podcast",            desc: "Episodes will appear in your inbox with a play button" },
  youtube: { icon: "▶️",  label: "YouTube Channel",   desc: "Videos will appear in your inbox" },
  article: { icon: "📰",  label: "Article",            desc: "Read this article in a clean, focused view" },
  twitter: { icon: "𝕏",   label: "X / Twitter Feed",  desc: "Posts will stream into your inbox via RSS relay" },
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

    // Check for @handle or x.com/twitter.com profile
    const xParsed = parseXUrl(trimmed);
    if (xParsed.isX || trimmed.startsWith("@")) {
      setDetected("twitter"); return;
    }

    try {
      new URL(trimmed);
      const type = detectInputType(trimmed);
      setDetected(type);
      if (type === "article" || type === "podcast") {
        // Podcast URLs that are already RSS feeds (feeds.buzzsprout.com, anchor.fm/s/…/rss, etc.)
        // don't need discovery — treat them as RSS directly.
        if (type === "podcast" && isRSSUrl(trimmed)) {
          setDetected("rss");
          return;
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

      // If we still have a raw podcast page URL (not an RSS feed, discovery didn't run or failed),
      // try resolving it now via iTunes Lookup API before attempting to add.
      if (detected === "podcast" && finalUrl === trimmed && !isRSSUrl(trimmed)) {
        const resolved = await resolvePodcastFeedUrl(trimmed).catch(() => null);
        if (resolved?.feedUrl) {
          finalUrl = resolved.feedUrl;
          finalName = finalName || resolved.title || null;
        } else {
          throw new Error("Couldn't find an RSS feed for this podcast. Try pasting the feed URL directly, or search by podcast name above.");
        }
      }

      const finalType = (detected === "podcast" || detected === "twitter" || isX) ? "rss" : (detected || "article");
      await onAdd({ url: finalUrl, type: finalType, name: finalName });
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong. Check the URL and try again.");
    } finally { setLoading(false); }
  }

  const info = detected ? TYPE_INFO[detected] : null;
  const btnLabel = loading ? "Adding…"
    : detected === "rss" ? "Subscribe"
    : detected === "twitter" ? "Follow on X"
    : detected === "youtube" ? "Subscribe"
    : detected === "article" ? "Open Article"
    : "Add";

  return (
    <div style={{
      position: "fixed", inset: 0, background: T.overlay, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{
        background: T.card,
        borderRadius: 18,
        padding: "24px 24px 20px",
        width: "100%", maxWidth: "min(500px, 95vw)",
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,.3)",
        animation: "fadeInScale .2s ease",
        border: `1px solid ${T.border}`,
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginRight: 12, color: T.accentText, fontWeight: 700 }}>+</div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>Add to Feedbox</h2>
            <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 2 }}>RSS, YouTube, podcast, article, or X</div>
          </div>
          <button onClick={onClose} style={{
            marginLeft: "auto", background: T.surface2, border: "none",
            borderRadius: 8, width: 30, height: 30, cursor: "pointer",
            color: T.textSecondary, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* Single URL input */}
        <Input
          value={url}
          onChange={handleUrlChange}
          placeholder="Paste a URL, RSS feed, @x_handle, or YouTube link…"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onClose(); }}
          style={{ fontSize: 14 }}
        />

        {/* Detected type chip */}
        {(info || discovering) && (
          <div style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, background: T.accentSurface, marginTop: 12, alignItems: "center" }}>
            {discovering ? <Spinner size={18} /> : <span style={{ fontSize: 20 }}>{info?.icon}</span>}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                {discovering ? "Detecting feed…" : info?.label}
              </div>
              {!discovering && <div style={{ fontSize: 12, color: T.textSecondary }}>{info?.desc}</div>}
            </div>
          </div>
        )}

        {/* Optional nickname (for feeds & X) */}
        {(detected === "rss" || detected === "podcast" || detected === "twitter" || detected === "youtube") && (
          <div style={{ marginTop: 12 }}>
            <Input value={feedName} onChange={setFeedName} placeholder="Nickname (optional, e.g. Hacker News)" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ fontSize: 13, color: T.danger, padding: "9px 13px", background: `${T.danger}18`, borderRadius: 9, marginTop: 12, lineHeight: 1.5 }}>{error}</div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancel</Button>
          {detected === "article" && onSaveForLater && (
            <Button variant="secondary" onClick={async () => {
              setLoading(true); setError("");
              try { await onSaveForLater({ url: url.trim(), type: "article" }); onClose(); }
              catch (err) { setError(err.message || "Failed to save."); }
              finally { setLoading(false); }
            }} disabled={!url.trim() || loading} style={{ flex: 2, justifyContent: "center" }}>
              {loading ? "Saving…" : "🔖 Save for Later"}
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={!url.trim() || loading} style={{ flex: detected === "article" && onSaveForLater ? 2 : 3, justifyContent: "center" }}>
            {btnLabel}
          </Button>
        </div>

        {/* Browse popular feeds — collapsible */}
        <div style={{ marginTop: 20, borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
          <button onClick={() => setShowDiscover(v => !v)} style={{
            display: "flex", alignItems: "center", gap: 6, width: "100%",
            background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            fontSize: 12, fontWeight: 600, color: T.textSecondary, padding: 0, marginBottom: showDiscover ? 12 : 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ transform: showDiscover ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .15s" }}><path d="M4 2l4 4-4 4"/></svg>
            Browse popular feeds
          </button>
          {showDiscover && (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {Object.entries(DISCOVER_FEEDS).map(([category, feeds]) => (
                <div key={category}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: T.textTertiary, padding: "8px 2px 4px" }}>{category}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {feeds.map(feed => (
                      <div key={feed.url} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, background: T.surface, cursor: "pointer", transition: "background .12s" }}
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
                          <div style={{ fontSize: 11, color: T.textTertiary }}>{feed.desc}</div>
                        </div>
                        <span style={{ fontSize: 11, color: T.accent, fontWeight: 600, flexShrink: 0 }}>+ Add</span>
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
  );
}
