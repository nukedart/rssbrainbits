import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { getFeeds } from "../lib/supabase";
import { fetchRSSFeed } from "../lib/fetchers";
import { getCachedFeed } from "../lib/feedCache";
import { Spinner } from "../components/UI";
import ContentViewer from "../components/ContentViewer";
import { useBreakpoint } from "../hooks/useBreakpoint.js";

// ── Daily Briefing Home Page ────────────────────────────────
export default function HomePage({ feeds: propFeeds = null, onNavigate, onPlayPodcast }) {
  const { T }        = useTheme();
  const { user }     = useAuth();
  const { isMobile } = useBreakpoint();

  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [feeds, setFeeds]       = useState(propFeeds || []);
  const [openItem, setOpenItem] = useState(null);
  const [openIdx, setOpenIdx]   = useState(-1);

  useEffect(() => {
    if (!user) return;
    if (propFeeds !== null) { setFeeds(propFeeds); return; }
    getFeeds(user.id).then(setFeeds).catch(console.error);
  }, [user, propFeeds]);

  useEffect(() => {
    if (!feeds.length) { setLoading(false); return; }
    setLoading(true);
    const MAX_PER_FEED = 5;

    const cachedItems = feeds.flatMap(f => {
      const cached = getCachedFeed(f.url);
      if (!cached) return [];
      return (cached.data?.items || []).slice(0, MAX_PER_FEED).map(item => ({
        ...item, feedId: f.id, source: item.source || f.name || f.url,
      }));
    });
    if (cachedItems.length) {
      cachedItems.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setItems(cachedItems.slice(0, 20));
      setLoading(false);
    }

    const uncached = feeds.filter(f => { const c = getCachedFeed(f.url); return !c || c.isStale; });
    if (!uncached.length) return;
    Promise.allSettled(
      uncached.map(f => fetchRSSFeed(f.url).then(data => (data.items || []).slice(0, MAX_PER_FEED).map(item => ({ ...item, feedId: f.id, source: item.source || f.name || f.url }))))
    ).then(results => {
      const freshItems = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
      if (!freshItems.length) return;
      const cachedOnlyItems = feeds.flatMap(f => {
        if (uncached.find(u => u.id === f.id)) return [];
        const c = getCachedFeed(f.url);
        return (c?.data?.items || []).slice(0, MAX_PER_FEED).map(item => ({ ...item, feedId: f.id, source: item.source || f.name || f.url }));
      });
      const all = [...freshItems, ...cachedOnlyItems];
      all.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setItems(all.slice(0, 20));
    }).finally(() => setLoading(false));
  }, [feeds]);

  function openByIdx(idx) {
    if (idx < 0 || idx >= items.length) return;
    setOpenItem(items[idx]);
    setOpenIdx(idx);
  }

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const featured  = items[0] || null;
  const secondary = items[1] || null;
  const tertiary  = items[2] || null;
  const listItems = items.slice(3, 12);

  function estReadTime(text) {
    const words = (text || "").split(/\s+/).length;
    return `${Math.max(1, Math.round(words / 200))} min read`;
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

  // ── Desktop 3-pane: article list + reading panel ──────────
  const showSplitView = !isMobile && openItem;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

      {/* ── Left: article list (slim when split, full otherwise) ── */}
      <div style={{
        flex: showSplitView ? "0 0 380px" : 1,
        overflowY: "auto",
        background: T.bg,
        transition: "flex .2s ease",
        minWidth: 0,
      }}>
        {showSplitView
          ? (
            /* Slim list mode — shown when reading panel is open */
            <div style={{ padding: "0 0 40px" }}>
              {/* Mini header */}
              <div style={{ padding: "18px 20px 12px", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: T.accent, textTransform: "uppercase" }}>{dateLabel}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 2, fontFamily: "var(--reader-font-family)", fontStyle: "italic" }}>Daily Briefing</div>
              </div>
              {items.map((item, i) => (
                <BriefingRow
                  key={item.url || i}
                  item={item}
                  isSelected={openItem?.url === item.url}
                  relTime={relativeTime(item.date)}
                  onClick={() => openByIdx(i)}
                  T={T}
                />
              ))}
            </div>
          )
          : (
            /* Full bento layout — default */
            <div style={{ maxWidth: 1120, margin: "0 auto", padding: isMobile ? "32px 18px 100px" : "48px 48px 80px" }}>

              {/* Header */}
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
                <p style={{ fontSize: isMobile ? 15 : 17, color: T.textSecondary, maxWidth: 560, lineHeight: 1.65, margin: 0 }}>
                  A distilled summary of your interests. Today we&apos;ve gathered{" "}
                  <span style={{ color: T.text, fontWeight: 600 }}>{items.length} essential updates</span>{" "}
                  from your top feeds and channels.
                </p>
              </section>

              {/* Bento Grid */}
              {items.length > 0 && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(12, 1fr)",
                  gap: isMobile ? 16 : 24,
                  marginBottom: isMobile ? 40 : 56,
                }}>
                  {featured && (
                    <article
                      onClick={() => openByIdx(0)}
                      style={{ gridColumn: isMobile ? "1" : "span 8", background: T.card, borderRadius: 16, overflow: "hidden", cursor: "pointer", transition: "background .2s", position: "relative" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.surface}
                      onMouseLeave={e => e.currentTarget.style.background = T.card}
                    >
                      <div style={{ height: 260, overflow: "hidden", position: "relative", background: T.surface2 }}>
                        {featured.image
                          ? <img src={featured.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .5s ease" }}
                              onMouseEnter={e => e.target.style.transform="scale(1.04)"}
                              onMouseLeave={e => e.target.style.transform="scale(1)"}
                            />
                          : <FallbackArt source={featured.source} T={T} size="large" />
                        }
                        <div style={{ position: "absolute", top: 16, left: 16, padding: "4px 12px", borderRadius: 999, background: `${T.accent}30`, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: T.accent, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>
                          Featured
                        </div>
                      </div>
                      <div style={{ padding: "24px 28px 28px" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".1em" }}>{featured.source}</span>
                          <span style={{ width: 3, height: 3, borderRadius: "50%", background: T.textTertiary, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: T.textTertiary }}>{estReadTime(featured.description)}</span>
                          <span style={{ fontSize: 11, color: T.textTertiary, marginLeft: "auto" }}>{relativeTime(featured.date)}</span>
                        </div>
                        <h2 style={{ fontFamily: "var(--reader-font-family)", fontStyle: "italic", fontSize: 26, fontWeight: 700, color: T.text, margin: "0 0 12px", lineHeight: 1.25, letterSpacing: "-.01em" }}>
                          {featured.title}
                        </h2>
                        {featured.description && (
                          <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.7, margin: "0 0 20px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {featured.description}
                          </p>
                        )}
                        <SourceDots T={T} />
                      </div>
                    </article>
                  )}

                  <div style={{ gridColumn: isMobile ? "1" : "span 4", display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }}>
                    {secondary && (
                      <article
                        onClick={() => openByIdx(1)}
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

                    {tertiary && (
                      <article
                        onClick={() => openByIdx(2)}
                        style={{ background: T.surface, borderRadius: 16, padding: "24px", cursor: "pointer", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 160, transition: "background .2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = T.card}
                        onMouseLeave={e => e.currentTarget.style.background = T.surface}
                      >
                        <div>
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
                          <span style={{ color: T.accent, fontSize: 16 }}>→</span>
                        </div>
                      </article>
                    )}
                  </div>
                </div>
              )}

              {/* Latest Updates list */}
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
                        onClick={() => openByIdx(i + 3)}
                        T={T}
                        isMobile={isMobile}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )
        }
      </div>

      {/* ── Right: reading panel (desktop only, when article open) ── */}
      {showSplitView && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: `1px solid ${T.border}` }}>
          <ContentViewer
            inline={true}
            item={openItem}
            onClose={() => { setOpenItem(null); setOpenIdx(-1); }}
            onNext={openIdx < items.length - 1 ? () => openByIdx(openIdx + 1) : undefined}
            onPrev={openIdx > 0 ? () => openByIdx(openIdx - 1) : undefined}
            currentIdx={openIdx}
            totalCount={items.length}
          />
        </div>
      )}

      {/* Mobile: full-screen overlay */}
      {openItem && isMobile && (
        <ContentViewer
          item={openItem}
          onClose={() => { setOpenItem(null); setOpenIdx(-1); }}
          onNext={openIdx < items.length - 1 ? () => openByIdx(openIdx + 1) : undefined}
          onPrev={openIdx > 0 ? () => openByIdx(openIdx - 1) : undefined}
          currentIdx={openIdx}
          totalCount={items.length}
          onPlayPodcast={onPlayPodcast}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

// Slim row used in split-view left panel
function BriefingRow({ item, isSelected, relTime, onClick, T }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "12px 20px", cursor: "pointer",
        background: isSelected ? T.accentSurface : hovered ? T.surface : "transparent",
        borderLeft: `3px solid ${isSelected ? T.accent : "transparent"}`,
        transition: "background .15s",
      }}
    >
      {item.image && (
        <img src={item.image} alt="" style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 6, flexShrink: 0, marginTop: 2 }} onError={e => { e.target.style.display = "none"; }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? T.accent : T.text, lineHeight: 1.35, marginBottom: 3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontFamily: "var(--reader-font-family)" }}>
          {item.title}
        </div>
        <div style={{ fontSize: 11, color: T.textTertiary }}>
          {item.source}{relTime ? ` · ${relTime}` : ""}
        </div>
      </div>
    </div>
  );
}

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
      <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 20 }}>
        <span style={{ marginTop: 2, color: hovered ? T.accent : T.textTertiary, transition: "color .15s", flexShrink: 0 }}>
          <RSSIcon size={18} />
        </span>
        <div>
          <h4 style={{
            fontFamily: "var(--reader-font-family)",
            fontSize: isMobile ? 15 : 17, fontWeight: 500,
            color: hovered ? T.accent : T.text, margin: 0,
            lineHeight: 1.35, transition: "color .15s", letterSpacing: "-.01em",
          }}>
            {item.title}
          </h4>
          <p style={{ fontSize: 13, color: T.textSecondary, margin: "4px 0 0" }}>
            {item.source}{relTime ? ` · ${relTime}` : ""}
          </p>
        </div>
      </div>
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
    <span style={{ padding: "3px 10px", borderRadius: 999, background: T.surface, color: T.textSecondary, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</span>
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

function RSSIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a9 9 0 0 1 9 9"/>
      <path d="M4 4a16 16 0 0 1 16 16"/>
      <circle cx="5" cy="19" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}
