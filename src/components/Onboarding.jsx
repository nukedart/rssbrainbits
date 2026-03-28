// ── Onboarding — shown when user has no feeds ─────────────────
import { useState } from "react";
import { useTheme } from "../hooks/useTheme";

const SUGGESTED_FEEDS = [
  { name: "Hacker News",       url: "https://hnrss.org/frontpage",                   cat: "Tech",    icon: "🟠" },
  { name: "The Verge",         url: "https://www.theverge.com/rss/index.xml",         cat: "Tech",    icon: "💜" },
  { name: "Ars Technica",      url: "https://feeds.arstechnica.com/arstechnica/index",cat: "Tech",    icon: "🔴" },
  { name: "Wired",             url: "https://www.wired.com/feed/rss",                 cat: "Tech",    icon: "⚡" },
  { name: "MIT Tech Review",   url: "https://www.technologyreview.com/feed/",         cat: "Science", icon: "🧪" },
  { name: "NASA Breaking News",url: "https://www.nasa.gov/news-release/feed/",        cat: "Science", icon: "🚀" },
  { name: "ESPN",              url: "https://www.espn.com/espn/rss/news",             cat: "Sports",  icon: "🏆" },
  { name: "BBC News",          url: "https://feeds.bbci.co.uk/news/rss.xml",          cat: "News",    icon: "🌍" },
  { name: "Reuters",           url: "https://feeds.reuters.com/reuters/topNews",      cat: "News",    icon: "📰" },
  { name: "Fast Company",      url: "https://www.fastcompany.com/latest/rss",         cat: "Business",icon: "⚙️" },
  { name: "Harvard Business",  url: "https://feeds.hbr.org/harvardbusiness",          cat: "Business",icon: "📊" },
  { name: "Smashing Magazine", url: "https://www.smashingmagazine.com/feed/",         cat: "Design",  icon: "🎨" },
  { name: "CSS-Tricks",        url: "https://css-tricks.com/feed/",                  cat: "Design",  icon: "✏️" },
  { name: "A List Apart",      url: "https://alistapart.com/main/feed/",              cat: "Design",  icon: "📐" },
  { name: "Wait But Why",      url: "https://waitbutwhy.com/feed",                   cat: "Reads",   icon: "🐙" },
  { name: "Brain Pickings",    url: "https://www.themarginalian.org/feed/",           cat: "Reads",   icon: "🧠" },
];

const CATS = ["All", "Tech", "Science", "News", "Business", "Design", "Reads", "Sports"];

export default function Onboarding({ onAdd, onDismiss }) {
  const { T } = useTheme();
  const [selected, setSelected]   = useState(new Set());
  const [cat, setCat]             = useState("All");
  const [loading, setLoading]     = useState(false);

  const visible = cat === "All" ? SUGGESTED_FEEDS : SUGGESTED_FEEDS.filter(f => f.cat === cat);

  function toggle(url) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(url) ? n.delete(url) : n.add(url);
      return n;
    });
  }

  async function handleSubscribe() {
    if (selected.size === 0) return;
    setLoading(true);
    const picks = SUGGESTED_FEEDS.filter(f => selected.has(f.url));
    for (const feed of picks) {
      try { await onAdd({ url: feed.url, type: "rss", name: feed.name }); } catch {}
    }
    setLoading(false);
    onDismiss();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: T.overlay, zIndex: 900,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: T.card, borderRadius: 20, padding: "28px 24px 24px",
        width: "100%", maxWidth: 520, maxHeight: "90vh",
        display: "flex", flexDirection: "column", gap: 0,
        boxShadow: "0 24px 80px rgba(0,0,0,.22)", border: `1px solid ${T.border}`,
        animation: "fadeInScale .2s ease",
      }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-.02em" }}>Welcome to Feedbox 👋</div>
          <div style={{ fontSize: 14, color: T.textSecondary, marginTop: 6, lineHeight: 1.5 }}>
            Pick a few feeds to get started. You can always add more later.
          </div>
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: "4px 12px", borderRadius: 20, border: `1.5px solid ${cat===c ? T.accent : T.border}`,
              background: cat===c ? T.accentSurface : "transparent",
              color: cat===c ? T.accentText : T.textSecondary,
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              transition: "all .12s",
            }}>{c}</button>
          ))}
        </div>

        {/* Feed grid */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {visible.map(feed => {
            const isSelected = selected.has(feed.url);
            return (
              <div key={feed.url} onClick={() => toggle(feed.url)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                borderRadius: 12, border: `1.5px solid ${isSelected ? T.accent : T.border}`,
                background: isSelected ? T.accentSurface : T.surface,
                cursor: "pointer", transition: "all .12s",
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{feed.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? T.accentText : T.text }}>{feed.name}</div>
                  <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>{feed.cat}</div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  border: `2px solid ${isSelected ? T.accent : T.border}`,
                  background: isSelected ? T.accent : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all .12s",
                }}>
                  {isSelected && <span style={{ color: T.accentText, fontSize: 12, lineHeight: 1 }}>✓</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onDismiss} style={{
            flex: 1, padding: "11px 0", borderRadius: 12, border: `1px solid ${T.border}`,
            background: "transparent", color: T.textSecondary, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit",
          }}>Skip for now</button>
          <button onClick={handleSubscribe} disabled={selected.size === 0 || loading} style={{
            flex: 2, padding: "11px 0", borderRadius: 12, border: "none",
            background: selected.size > 0 ? T.accent : T.surface2,
            color: selected.size > 0 ? "#fff" : T.textTertiary,
            fontSize: 14, fontWeight: 700, cursor: selected.size > 0 ? "pointer" : "default",
            fontFamily: "inherit", transition: "all .2s",
          }}>
            {loading ? "Adding feeds…" : selected.size > 0 ? `Subscribe to ${selected.size} feed${selected.size > 1 ? "s" : ""}` : "Select feeds above"}
          </button>
        </div>
      </div>
    </div>
  );
}
