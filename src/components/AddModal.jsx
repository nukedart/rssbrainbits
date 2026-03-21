import { useState, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { Input, Button, Spinner } from "./UI";
import { detectInputType, discoverFeed, parseXUrl, xToRSSUrl, searchApplePodcasts } from "../lib/fetchers";

const TYPE_INFO = {
  rss:     { icon: "📡",  label: "RSS Feed",          desc: "All articles from this feed will appear in your inbox" },
  podcast: { icon: "🎙️", label: "Podcast Feed",       desc: "Episodes will appear in your inbox with a play button" },
  youtube: { icon: "▶️",  label: "YouTube Channel",   desc: "Videos will appear in your inbox" },
  article: { icon: "📰",  label: "Article",            desc: "Read this article in a clean, focused view" },
  twitter: { icon: "𝕏",   label: "X / Twitter Feed",  desc: "Posts will stream into your inbox via RSS relay" },
};

// Tabs in the modal
const TABS = [
  { id: "url",      label: "URL / RSS" },
  { id: "podcast",  label: "🎙 Podcasts" },
  { id: "x",        label: "𝕏 Follow" },
  { id: "discover", label: "✦ Discover" },
];

// Curated popular feeds by category
const DISCOVER_FEEDS = {
  "Tech": [
    { name: "Hacker News",       url: "https://news.ycombinator.com/rss",                   desc: "Tech & startup discussions" },
    { name: "The Verge",         url: "https://www.theverge.com/rss/index.xml",              desc: "Tech news & culture" },
    { name: "Ars Technica",      url: "https://feeds.arstechnica.com/arstechnica/index",     desc: "In-depth tech journalism" },
    { name: "MIT Tech Review",   url: "https://www.technologyreview.com/feed/",              desc: "Emerging technology" },
  ],
  "AI": [
    { name: "VentureBeat AI",    url: "https://venturebeat.com/ai/feed/",                   desc: "AI news & analysis" },
    { name: "Import AI",         url: "https://importai.substack.com/feed",                 desc: "Weekly AI newsletter by Jack Clark" },
    { name: "The Gradient",      url: "https://thegradient.pub/rss/",                       desc: "AI research perspectives" },
  ],
  "Design": [
    { name: "CSS-Tricks",        url: "https://css-tricks.com/feed/",                       desc: "Web design & CSS" },
    { name: "Smashing Magazine", url: "https://www.smashingmagazine.com/feed",               desc: "Web design & development" },
    { name: "A List Apart",      url: "https://alistapart.com/main/feed/",                  desc: "Web standards & craft" },
  ],
  "News": [
    { name: "BBC World News",    url: "https://feeds.bbci.co.uk/news/world/rss.xml",        desc: "International news" },
    { name: "Reuters",           url: "https://feeds.reuters.com/reuters/topNews",           desc: "Breaking news wire" },
    { name: "NPR News",          url: "https://feeds.npr.org/1001/rss.xml",                 desc: "US news & culture" },
    { name: "The Guardian",      url: "https://www.theguardian.com/world/rss",              desc: "World news & opinion" },
  ],
  "Science": [
    { name: "NASA",              url: "https://www.nasa.gov/rss/dyn/breaking_news.rss",     desc: "Space & exploration" },
    { name: "Scientific American", url: "https://rss.sciam.com/ScientificAmerican-Global", desc: "Science for curious minds" },
    { name: "Nature",            url: "https://www.nature.com/nature.rss",                  desc: "Leading science journal" },
  ],
  "Business": [
    { name: "Harvard Biz Review", url: "https://hbr.org/stories.rss",                      desc: "Management & leadership" },
    { name: "Stratechery",       url: "https://stratechery.com/feed/",                      desc: "Tech strategy & business" },
  ],
};

export default function AddModal({ onAdd, onClose, onSaveForLater }) {
  const { T } = useTheme();
  const [tab, setTab] = useState("url");

  // ── URL tab state ──
  const [url, setUrl]           = useState("");
  const [feedName, setFeedName] = useState("");
  const [detected, setDetected] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered]   = useState(null);
  const [error, setError]             = useState("");
  const discoverTimerRef = useRef(null);

  // ── Podcast search state ──
  const [podcastQuery, setPodcastQuery]     = useState("");
  const [podcastResults, setPodcastResults] = useState([]);
  const [podcastSearching, setPodcastSearching] = useState(false);
  const podcastTimerRef = useRef(null);

  // ── X follow state ──
  const [xHandle, setXHandle]   = useState("");
  const [xLoading, setXLoading] = useState(false);
  const [xError, setXError]     = useState("");

  // ─────────────────────────────────────────────────────────────
  function handleUrlChange(val) {
    setUrl(val); setError(""); setDiscovered(null);
    clearTimeout(discoverTimerRef.current);
    try {
      new URL(val.trim());
      const type = detectInputType(val.trim());
      setDetected(type);
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

  async function handleUrlSubmit() {
    if (!url.trim()) return;
    setLoading(true); setError("");
    try {
      const xParsed = parseXUrl(url.trim());
      let finalUrl  = discovered?.feedUrl || url.trim();
      let finalName = feedName.trim() || discovered?.title || null;
      // Twitter: auto-convert to RSSHub feed
      if (xParsed.isX || detected === "twitter") {
        const username = xParsed.username || url.trim().replace(/.*\//,"").replace("@","");
        finalUrl  = xToRSSUrl(username);
        finalName = finalName || `@${username}`;
      }
      const finalType = (detected === "podcast" || detected === "twitter") ? "rss" : (detected || "article");
      await onAdd({ url: finalUrl, type: finalType, name: finalName });
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong. Check the URL and try again.");
    } finally { setLoading(false); }
  }

  // ── Podcast search ──
  function handlePodcastSearch(val) {
    setPodcastQuery(val);
    clearTimeout(podcastTimerRef.current);
    if (val.trim().length < 2) { setPodcastResults([]); return; }
    setPodcastSearching(true);
    podcastTimerRef.current = setTimeout(() => {
      searchApplePodcasts(val.trim())
        .then(results => setPodcastResults(results))
        .catch(() => setPodcastResults([]))
        .finally(() => setPodcastSearching(false));
    }, 500);
  }

  async function handlePodcastAdd(podcast) {
    setLoading(true);
    try {
      await onAdd({ url: podcast.feedUrl, type: "rss", name: podcast.title });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to add podcast.");
    } finally { setLoading(false); }
  }

  // ── X follow ──
  async function handleXFollow() {
    const raw = xHandle.trim().replace(/^@/, "").replace(/.*x\.com\//, "").replace(/.*twitter\.com\//, "").split("/")[0];
    if (!raw) { setXError("Enter an X username or profile URL."); return; }
    setXLoading(true); setXError("");
    try {
      await onAdd({ url: xToRSSUrl(raw), type: "rss", name: `@${raw} on X` });
      onClose();
    } catch (err) {
      setXError(err.message || "Could not follow. Make sure the username is correct.");
    } finally { setXLoading(false); }
  }

  const info = detected ? TYPE_INFO[detected] : null;

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
        maxHeight: "88vh", overflowY: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,.3), 0 0 2px rgba(172,207,174,.08)",
        animation: "fadeInScale .2s ease",
        border: `1px solid ${T.border}`,
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginRight: 12, color: T.accentText, fontWeight: 700 }}>+</div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>Add to Feedbox</h2>
            <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 2 }}>RSS, podcast, X account, YouTube…</div>
          </div>
          <button onClick={onClose} style={{
            marginLeft: "auto", background: T.surface2, border: "none",
            borderRadius: 8, width: 30, height: 30, cursor: "pointer",
            color: T.textSecondary, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* Tab Bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: T.surface, borderRadius: 10, padding: 3 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setError(""); }}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 8, border: "none",
                background: tab === t.id ? T.card : "transparent",
                color: tab === t.id ? T.text : T.textTertiary,
                fontWeight: tab === t.id ? 600 : 400,
                fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,.15)" : "none",
                transition: "all .12s",
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* ── Tab: URL / RSS ── */}
        {tab === "url" && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, display: "block", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".06em" }}>URL or Feed Address</label>
              <Input value={url} onChange={handleUrlChange}
                placeholder="https://example.com/feed, podcast, article, or x.com/user…"
                autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit(); if (e.key === "Escape") onClose(); }} />
            </div>

            {/* Detected type */}
            {(info || discovering) && (
              <div style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, background: T.accentSurface, marginBottom: 14, alignItems: "center" }}>
                {discovering ? <Spinner size={18} /> : <span style={{ fontSize: 20 }}>{info?.icon}</span>}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                    {discovering ? "Detecting feed…" : info?.label}
                  </div>
                  {!discovering && <div style={{ fontSize: 12, color: T.textSecondary }}>{info?.desc}</div>}
                </div>
              </div>
            )}

            {/* X note */}
            {detected === "twitter" && (
              <div style={{ fontSize: 12, color: T.textSecondary, padding: "8px 12px", background: T.surface, borderRadius: 8, marginBottom: 14, lineHeight: 1.6 }}>
                Posts will be fetched via <strong style={{ color: T.text }}>RSSHub</strong> (rsshub.app). You can self-host RSSHub for full privacy.
              </div>
            )}

            {/* Nickname */}
            {(detected === "rss" || detected === "podcast" || detected === "twitter") && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, display: "block", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".06em" }}>Nickname (optional)</label>
                <Input value={feedName} onChange={setFeedName} placeholder="e.g. Hacker News, The Verge…" />
              </div>
            )}

            {error && <div style={{ fontSize: 13, color: T.danger, padding: "9px 13px", background: `${T.danger}18`, borderRadius: 9, marginBottom: 14, lineHeight: 1.5 }}>{error}</div>}

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
              <Button onClick={handleUrlSubmit} disabled={!url.trim() || loading} style={{ flex: 2, justifyContent: "center" }}>
                {loading ? "Loading…" : detected === "rss" ? "Subscribe" : detected === "twitter" ? "Follow" : "Open"}
              </Button>
            </div>
          </>
        )}

        {/* ── Tab: Podcast Search ── */}
        {tab === "podcast" && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, display: "block", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".06em" }}>Search Apple Podcasts</label>
              <Input value={podcastQuery} onChange={handlePodcastSearch}
                placeholder="Search by name, host, or topic…"
                autoFocus onKeyDown={(e) => { if (e.key === "Escape") onClose(); }} />
            </div>

            {podcastSearching && (
              <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}><Spinner size={22} /></div>
            )}

            {!podcastSearching && podcastResults.length === 0 && podcastQuery.length >= 2 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: T.textTertiary, fontSize: 13 }}>No results for "{podcastQuery}"</div>
            )}

            {!podcastSearching && podcastResults.length === 0 && podcastQuery.length < 2 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: T.textTertiary, fontSize: 13 }}>
                Type to search millions of podcasts from Apple Podcasts
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {podcastResults.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, background: T.surface, cursor: "pointer", transition: "background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.surface2}
                  onMouseLeave={e => e.currentTarget.style.background = T.surface}
                  onClick={() => handlePodcastAdd(p)}
                >
                  {p.artworkUrl
                    ? <img src={p.artworkUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 44, height: 44, borderRadius: 10, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🎙️</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 2 }}>
                      {p.artistName}{p.trackCount ? ` · ${p.trackCount} episodes` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: T.accent, fontWeight: 600, flexShrink: 0 }}>+ Follow</div>
                </div>
              ))}
            </div>

            {error && <div style={{ fontSize: 13, color: T.danger, padding: "9px 13px", background: `${T.danger}18`, borderRadius: 9, marginTop: 14, lineHeight: 1.5 }}>{error}</div>}
          </>
        )}

        {/* ── Tab: Discover ── */}
        {tab === "discover" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {Object.entries(DISCOVER_FEEDS).map(([category, feeds]) => (
              <div key={category}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: T.textTertiary, padding: "10px 2px 6px" }}>{category}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {feeds.map(feed => (
                    <div key={feed.url} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: T.surface, cursor: "pointer", transition: "background .12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.surface2}
                      onMouseLeave={e => e.currentTarget.style.background = T.surface}
                      onClick={async () => {
                        setLoading(true); setError("");
                        try { await onAdd({ url: feed.url, type: "rss", name: feed.name }); onClose(); }
                        catch (err) { setError(err.message || "Failed to add feed."); setLoading(false); }
                      }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>📡</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{feed.name}</div>
                        <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>{feed.desc}</div>
                      </div>
                      <div style={{ fontSize: 12, color: T.accent, fontWeight: 600, flexShrink: 0 }}>+ Add</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {error && <div style={{ fontSize: 13, color: T.danger, padding: "9px 13px", background: `${T.danger}18`, borderRadius: 9, marginTop: 10, lineHeight: 1.5 }}>{error}</div>}
            {loading && <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}><Spinner size={20} /></div>}
          </div>
        )}

        {/* ── Tab: X Follow ── */}
        {tab === "x" && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, display: "block", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".06em" }}>X Username or Profile URL</label>
              <Input value={xHandle} onChange={setXHandle}
                placeholder="@username or https://x.com/username"
                autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleXFollow(); if (e.key === "Escape") onClose(); }} />
            </div>

            <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.7, padding: "10px 12px", background: T.surface, borderRadius: 10, marginBottom: 16 }}>
              <strong style={{ color: T.text }}>How it works:</strong> X posts are fetched via RSSHub, an open-source RSS bridge. Posts appear in your inbox like any other feed — no X account required.<br />
              <span style={{ color: T.textTertiary }}>Note: X's public API has rate limits. For reliable access, you can self-host RSSHub.</span>
            </div>

            {xError && <div style={{ fontSize: 13, color: T.danger, padding: "9px 13px", background: `${T.danger}18`, borderRadius: 9, marginBottom: 14, lineHeight: 1.5 }}>{xError}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Button variant="secondary" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancel</Button>
              <Button onClick={handleXFollow} disabled={!xHandle.trim() || xLoading} style={{ flex: 2, justifyContent: "center" }}>
                {xLoading ? "Following…" : "𝕏 Follow Account"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
