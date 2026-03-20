import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { getFeeds } from "../lib/supabase";
import { fetchRSSFeed } from "../lib/fetchers";
import { Spinner } from "../components/UI";
import { useBreakpoint } from "../hooks/useBreakpoint.js";

// ── Daily Briefing Home Page ────────────────────────────────
// Matches the "Things 3 / Distilled Workspace" design:
//   • Serif italic mega-heading + date
//   • Bento grid: 8-col featured card + 4-col two stacked cards
//   • "Latest Updates" editorial row list

export default function HomePage({ feeds: propFeeds = null, onNavigate, onOpenItem, onPlayPodcast }) {
  const { T }        = useTheme();
  const { user }     = useAuth();
  const { isMobile } = useBreakpoint();

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [feeds, setFeeds]     = useState(propFeeds || []);

  // load feeds if not supplied
  useEffect(() => {
    if (!user) return;
    if (propFeeds !== null) { setFeeds(propFeeds); return; }
    getFeeds(user.id).then(setFeeds).catch(console.error);
  }, [user, propFeeds]);

  // fetch items from all feeds
  useEffect(() => {
    if (!feeds.length) { setLoading(false); return; }
    setLoading(true);
    const MAX_PER_FEED = 5;
    Promise.allSettled(
      feeds.map(f => fetchRSSFeed(f.url).then(data => (data.items || []).slice(0, MAX_PER_FEED).map(item => ({ ...item, feedId: f.id, source: item.source || f.name || f.url }))))
    ).then(results => {
      const all = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
      all.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setItems(all.slice(0, 20));
    }).finally(() => setLoading(false));
  }, [feeds]);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const featured  = items[0] || null;
  const secondary = items[1] || null;
  const tertiary  = items[2] || null;
  const listItems = items.slice(3, 12);

  function estReadTime(text) {
    const words = (text || "").split(/\s+/).length;
    const mins  = Math.max(1, Math.round(words / 200));
    return `${mins} min read`;
  }

  function relativeTime(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1)  return "Just now";
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d === 1) return "Yesterday";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner size={28} />
      </div>
    );
  }

  if (!feeds.length) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>📭</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: T.text, margin: 0, fontFamily: "var(--reader-font-family)", fontStyle: "italic" }}>No feeds yet</h2>
        <p style={{ fontSize: 14, color: T.textSecondary, maxWidth: 300, lineHeight: 1.6, margin: 0 }}>Add some RSS feeds, podcasts, or YouTube channels to start your Daily Briefing.</p>
        <button onClick={() => onNavigate?.("inbox")} style={{ marginTop: 8, padding: "10px 22px", borderRadius: 8, border: "none", background: T.accent, color: T.accentText, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          Go to Inbox →
        </button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: isMobile ? "32px 18px 100px" : "48px 48px 80px" }}>

        {/* ── Header ── */}
        <section style={{ marginBottom: isMobile ? 32 : 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".18em", color: T.accent, textTransform: "uppercase", marginBottom: 14 }}>
            {dateLabel}
          </div>
          <h1 style={{
            fontFamily: "var(--reader-font-family)", fontStyle: "italic",
            fontSize: isMobile ? "clamp(44px, 12vw, 60px)" : "clamp(60px, 7vw, 88px)",
            fontWeight: 700, lineHeight: 1.05, color: T.text,
            margin: "0 0 16px", letterSpacing: "-.02em",
          }}>
            Daily Briefing
          </h1>
          <p style={{ fontSize: isMobile ? 15 : 17, color: T.textSecondary, maxWidth: 560, lineHeight: 1.65, margin: 0, fontFamily: "inherit" }}>
            A distilled summary of your interests. Today we&apos;ve gathered{" "}
            <span style={{ color: T.text, fontWeight: 600 }}>{items.length} essential updates</span>{" "}
            from your top feeds and channels.
          </p>
        </section>

        {/* ── Bento Grid ── */}
        {items.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(12, 1fr)",
            gap: isMobile ? 16 : 24,
            marginBottom: isMobile ? 40 : 56,
          }}>

            {/* Featured card — 8 columns */}
            {featured && (
              <article
                onClick={() => onOpenItem?.(featured)}
                style={{
                  gridColumn: isMobile ? "1" : "span 8",
                  background: T.card, borderRadius: 16,
                  overflow: "hidden", cursor: "pointer",
                  transition: "background .2s",
                  position: "relative",
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.surface}
                onMouseLeave={e => e.currentTarget.style.background = T.card}
              >
                {/* Hero image */}
                <div style={{ height: 260, overflow: "hidden", position: "relative", background: T.surface2 }}>
                  {featured.image
                    ? <img src={featured.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .5s ease" }}
                        onMouseEnter={e => e.target.style.transform="scale(1.04)"}
                        onMouseLeave={e => e.target.style.transform="scale(1)"}
                      />
                    : <FallbackArt source={featured.source} T={T} size="large" />
                  }
                  {/* Featured pill */}
                  <div style={{ position: "absolute", top: 16, left: 16, padding: "4px 12px", borderRadius: 999, background: `${T.accent}30`, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: T.accent, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>
                    Featured
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: "24px 28px 28px" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".1em" }}>{featured.source}</span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: T.textTertiary, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: T.textTertiary }}>{estReadTime(featured.description)}</span>
                    <span style={{ fontSize: 11, color: T.textTertiary, marginLeft: "auto" }}>{relativeTime(featured.date)}</span>
                  </div>
                  <h2 style={{
                    fontFamily: "var(--reader-font-family)", fontStyle: "italic",
                    fontSize: 26, fontWeight: 700, color: T.text, margin: "0 0 12px",
                    lineHeight: 1.25, letterSpacing: "-.01em",
                    transition: "color .15s",
                  }}
                    onMouseEnter={e => e.target.style.color = T.accent}
                    onMouseLeave={e => e.target.style.color = T.text}
                  >
                    {featured.title}
                  </h2>
                  {featured.description && (
                    <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.7, margin: "0 0 20px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {featured.description}
                    </p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <SourceDots T={T} />
                    <BookmarkBtn T={T} />
                  </div>
                </div>
              </article>
            )}

            {/* Right column — 4 columns */}
            <div style={{
              gridColumn: isMobile ? "1" : "span 4",
              display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24,
            }}>

              {/* Trending card */}
              {secondary && (
                <article
                  onClick={() => onOpenItem?.(secondary)}
                  style={{ background: T.card, borderRadius: 16, padding: "24px", cursor: "pointer", flex: "0 0 auto", transition: "background .2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.surface}
                  onMouseLeave={e => e.currentTarget.style.background = T.card}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.warning, textTransform: "uppercase", letterSpacing: ".12em" }}>Trending</span>
                    <span style={{ fontSize: 16 }}>⚡</span>
                  </div>
                  <h3 style={{ fontFamily: "var(--reader-font-family)", fontStyle: "italic", fontSize: 20, fontWeight: 700, color: T.text, margin: "0 0 10px", lineHeight: 1.3 }}>
                    {secondary.title}
                  </h3>
                  {secondary.description && (
                    <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.65, margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {secondary.description}
                    </p>
                  )}
                </article>
              )}

              {/* Curated / second card */}
              {tertiary && (
                <article
                  onClick={() => onOpenItem?.(tertiary)}
                  style={{ background: T.surface, borderRadius: 16, padding: "24px", cursor: "pointer", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 160, transition: "background .2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.card}
                  onMouseLeave={e => e.currentTarget.style.background = T.surface}
                >
                  <div>
                    {/* Accent bar */}
                    <div style={{ width: 40, height: 3, borderRadius: 999, background: T.accent, marginBottom: 20 }} />
                    <h3 style={{ fontFamily: "var(--reader-font-family)", fontStyle: "italic", fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 10px", lineHeight: 1.3 }}>
                      {tertiary.title}
                    </h3>
                    {tertiary.description && (
                      <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {tertiary.description}
                      </p>
                    )}
                  </div>
                  <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: T.textTertiary, letterSpacing: ".08em", textTransform: "uppercase" }}>{tertiary.source}</span>
                    <span style={{ color: T.accent, fontSize: 16, transition: "transform .15s" }}
                      onMouseEnter={e => e.target.style.transform="translateX(3px)"}
                      onMouseLeave={e => e.target.style.transform="translateX(0)"}
                    >→</span>
                  </div>
                </article>
              )}
            </div>
          </div>
        )}

        {/* ── Latest Updates ── */}
        {listItems.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 20 : 28 }}>
              <h2 style={{ fontFamily: "var(--reader-font-family)", fontStyle: "italic", fontSize: isMobile ? 24 : 30, fontWeight: 700, color: T.text, margin: 0 }}>
                Latest Updates
              </h2>
              <button onClick={() => onNavigate?.("inbox")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: T.accent, fontFamily: "inherit", padding: "4px 0" }}>
                View All →
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {listItems.map((item, i) => (
                <ArticleRow
                  key={item.url || i}
                  item={item}
                  relTime={relativeTime(item.date)}
                  onClick={() => onOpenItem?.(item)}
                  T={T}
                  isMobile={isMobile}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function ArticleRow({ item, relTime, onClick, T, isMobile }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        flexDirection: isMobile ? "column" : "row",
        padding: isMobile ? "16px 12px" : "20px 16px",
        borderRadius: 12, cursor: "pointer",
        background: hovered ? T.surface : "transparent",
        transition: "background .2s",
      }}
    >
      {/* Left: icon + text */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 20 }}>
        <span style={{ marginTop: 2, color: hovered ? T.accent : T.textTertiary, transition: "color .15s", flexShrink: 0 }}>
          <RSSIcon size={18} />
        </span>
        <div>
          <h4 style={{
            fontSize: isMobile ? 15 : 17, fontWeight: 500,
            color: hovered ? T.accent : T.text, margin: 0,
            lineHeight: 1.35, transition: "color .15s",
          }}>
            {item.title}
          </h4>
          <p style={{ fontSize: 13, color: T.textSecondary, margin: "4px 0 0" }}>
            {item.source}{relTime ? ` · ${relTime}` : ""}
          </p>
        </div>
      </div>

      {/* Right: category pill + more icon */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: isMobile ? 10 : 0, marginLeft: isMobile ? 30 : 0, flexShrink: 0 }}>
        {item.isPodcast
          ? <Pill label="Podcast" T={T} />
          : item.url?.includes("youtube") || item.url?.includes("youtu.be")
            ? <Pill label="Video" T={T} />
            : null
        }
        <span style={{ color: T.textTertiary, opacity: hovered ? 1 : 0, transition: "opacity .15s", fontSize: 18 }}>⋯</span>
      </div>
    </div>
  );
}

function Pill({ label, T }) {
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 999,
      background: T.surface, color: T.textSecondary,
      fontSize: 10, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: ".08em",
    }}>{label}</span>
  );
}

function FallbackArt({ source = "", T, size = "normal" }) {
  const h = size === "large" ? 260 : 160;
  const hue = (source.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 36) * 10;
  return (
    <div style={{ width: "100%", height: h, background: `hsl(${hue}, 18%, 16%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: size === "large" ? 56 : 32, opacity: 0.25 }}>{source.charAt(0).toUpperCase() || "✦"}</span>
    </div>
  );
}

function SourceDots({ T }) {
  return (
    <div style={{ display: "flex" }}>
      {[T.surface2, T.accent + "66"].map((bg, i) => (
        <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: bg, border: `2px solid ${T.card}`, marginLeft: i === 0 ? 0 : -8 }} />
      ))}
    </div>
  );
}

function BookmarkBtn({ T }) {
  const [saved, setSaved] = useState(false);
  return (
    <button onClick={e => { e.stopPropagation(); setSaved(v => !v); }}
      style={{ background: "none", border: "none", cursor: "pointer", color: saved ? T.accent : T.textTertiary, fontSize: 20, padding: "4px", lineHeight: 1, transition: "color .15s" }}
    >
      {saved ? "🔖" : "🏷️"}
    </button>
  );
}

function RSSIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a9 9 0 0 1 9 9"/>
      <path d="M4 4a16 16 0 0 1 16 16"/>
      <circle cx="5" cy="19" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}
