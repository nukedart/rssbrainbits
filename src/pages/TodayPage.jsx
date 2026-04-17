// ── TodayPage — daily brief dashboard ─────────────────────────
import { useState, useEffect, useMemo } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { fetchRSSFeed } from "../lib/fetchers";
import { getCachedFeed } from "../lib/feedCache";
import { Spinner } from "../components/UI";
import ContentViewer from "../components/ContentViewer";
import { supabase, getReadingStats } from "../lib/supabase";

const TWENTY_FOUR_HOURS = 86400000;
const MAX_PER_FEED = 10;
const AVG_READ_MIN = 4; // avg minutes per article

export default function TodayPage({ feeds = [], onPlayPodcast }) {
  const { T }        = useTheme();
  const { user }     = useAuth();
  const { isMobile } = useBreakpoint();

  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [openItem, setOpenItem] = useState(null);
  const [openIdx, setOpenIdx]   = useState(-1);
  const [readUrls, setReadUrls] = useState(new Set());

  // ── Widget data ────────────────────────────────────────────────
  const [streak, setStreak]         = useState(0);
  const [thisWeek, setThisWeek]     = useState(0);
  const [reviewDue, setReviewDue]   = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    // Reading streak + this week
    getReadingStats(user.id).then(s => {
      setStreak(s.streak ?? 0);
      setThisWeek(s.thisWeek ?? 0);
    }).catch(() => {});
    // Review due — SM-2 schedule in localStorage
    try {
      const schedule = JSON.parse(localStorage.getItem(`fb-sr-${user.id}`) || "{}");
      const today = new Date().toISOString().slice(0, 10);
      const due = Object.values(schedule).filter(e => !e.nextReview || e.nextReview <= today).length;
      setReviewDue(due);
    } catch {}
    // Saved count
    supabase.from("saved").select("url", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => { if (count != null) setSavedCount(count); })
      .catch(() => {});
  }, [user]);

  // Load read state
  useEffect(() => {
    if (!user) return;
    try {
      const stored = JSON.parse(localStorage.getItem(`fb-readurls-${user.id}`) || "[]");
      setReadUrls(new Set(stored));
    } catch {}
  }, [user]);

  // Load today's articles
  useEffect(() => {
    if (!feeds.length) { setLoading(false); return; }
    setLoading(true);

    const cutoff = Date.now() - TWENTY_FOUR_HOURS;
    const toToday = (arr) => arr.filter(i => i.date && new Date(i.date).getTime() > cutoff);
    const mapItems = (f, arr) =>
      arr.slice(0, MAX_PER_FEED).map(i => ({ ...i, feedId: f.id, source: i.source || f.name || f.url }));

    // Pre-seed from cache
    const cached = feeds.flatMap(f => {
      const c = getCachedFeed(f.url);
      return c ? mapItems(f, c.data?.items || []) : [];
    });
    const todayCached = toToday(cached).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (todayCached.length) { setItems(todayCached); setLoading(false); }

    // Fetch stale
    const stale = feeds.filter(f => { const c = getCachedFeed(f.url); return !c || c.isStale; });
    if (!stale.length) { setLoading(false); return; }

    Promise.allSettled(
      stale.map(f => fetchRSSFeed(f.url).then(d => mapItems(f, d.items || [])))
    ).then(results => {
      const fresh = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
      const fromCache = feeds.flatMap(f => {
        if (stale.find(u => u.id === f.id)) return [];
        const c = getCachedFeed(f.url);
        return c ? mapItems(f, c.data?.items || []) : [];
      });
      const all = toToday([...fresh, ...fromCache]);
      all.sort((a, b) => new Date(b.date) - new Date(a.date));
      setItems(all);
    }).finally(() => setLoading(false));
  }, [feeds]);

  function markRead(url) {
    if (!user) return;
    setReadUrls(prev => {
      const next = new Set([...prev, url]);
      try { localStorage.setItem(`fb-readurls-${user.id}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function openByIdx(idx) {
    if (idx < 0 || idx >= items.length) return;
    setOpenItem(items[idx]);
    setOpenIdx(idx);
    markRead(items[idx].url);
  }

  const readCount    = items.filter(i => readUrls.has(i.url)).length;
  const unreadCount  = items.length - readCount;
  const progress     = items.length > 0 ? Math.round((readCount / items.length) * 100) : 0;
  const unreadMinutes = unreadCount * AVG_READ_MIN;

  // Group articles by source, ordered by most-recent article in each group
  const groups = useMemo(() => {
    if (!items.length) return [];
    const map = {};
    items.forEach(i => {
      const src = i.source || "Other";
      if (!map[src]) map[src] = [];
      map[src].push(i);
    });
    return Object.entries(map)
      .map(([source, arts]) => ({ source, arts }))
      .sort((a, b) => new Date(b.arts[0]?.date || 0) - new Date(a.arts[0]?.date || 0));
  }, [items]);

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  // First unread article with an image → hero
  const heroItem = items.find(i => !readUrls.has(i.url) && i.image) || items.find(i => !readUrls.has(i.url));
  const firstUnreadIdx = items.findIndex(i => !readUrls.has(i.url));

  const showSplit = !isMobile && openItem;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

      {/* ── Article list / brief ── */}
      <div style={{
        flex: showSplit ? "0 0 400px" : 1,
        overflowY: "auto",
        display: "flex", flexDirection: "column",
        minWidth: 0,
        transition: "flex .2s ease",
      }}>

        {/* ── Brief header ── */}
        {!showSplit && (
          <BriefHeader
            T={T}
            isMobile={isMobile}
            dateLabel={dateLabel}
            total={items.length}
            readCount={readCount}
            progress={progress}
            unreadMinutes={unreadMinutes}
            loading={loading}
            onStartReading={firstUnreadIdx >= 0 ? () => openByIdx(firstUnreadIdx) : null}
          />
        )}

        {/* Compact header when split */}
        {showSplit && (
          <div style={{
            padding: "14px 20px 12px",
            borderBottom: `1px solid ${T.border}`,
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".16em", color: T.accent, textTransform: "uppercase", marginBottom: 2 }}>
              {dateLabel}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "var(--reader-font-family)", fontStyle: "italic", fontSize: 17, fontWeight: 700, color: T.text }}>
                Today
              </span>
              {items.length > 0 && (
                <span style={{ fontSize: 11, color: T.textTertiary }}>
                  {readCount}/{items.length} read
                </span>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <Spinner size={28} />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
            {feeds.length === 0 ? (
              <>
                <div style={{ fontSize: 36, marginBottom: 14 }}>📡</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 6, fontFamily: "var(--reader-font-family)", fontStyle: "italic" }}>
                  No feeds added yet
                </div>
                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, maxWidth: 280 }}>
                  Add RSS feeds, podcasts, or YouTube channels and Today will show a daily digest of what's new.
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 36, marginBottom: 14 }}>🌅</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 6, fontFamily: "var(--reader-font-family)", fontStyle: "italic" }}>
                  Quiet day
                </div>
                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, maxWidth: 280 }}>
                  No new articles from your feeds in the last 24 hours. Check back later or add more feeds.
                </div>
              </>
            )}
          </div>
        )}

        {!loading && items.length > 0 && (
          <div style={{ paddingBottom: isMobile ? 100 : 40 }}>

            {/* Dashboard widgets */}
            {!showSplit && (
              <StatWidgets
                T={T}
                isMobile={isMobile}
                streak={streak}
                thisWeek={thisWeek}
                reviewDue={reviewDue}
                savedCount={savedCount}
              />
            )}

            {/* Hero / featured — only when not split-view */}
            {!showSplit && heroItem && (
              <HeroCard
                item={heroItem}
                isRead={readUrls.has(heroItem.url)}
                onClick={() => openByIdx(items.indexOf(heroItem))}
                T={T}
              />
            )}

            {/* Source-grouped article list */}
            {!showSplit && groups.map(({ source, arts }) => {
              const visibleArts = arts.filter(a => a.url !== heroItem?.url);
              if (!visibleArts.length) return null;
              return (
                <div key={source}>
                  <div style={{ padding: "14px 22px 4px", marginTop: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: T.textTertiary }}>
                      {source}
                    </span>
                  </div>
                  {visibleArts.map(item => (
                    <TodayItem
                      key={item.url}
                      item={item}
                      isSelected={openItem?.url === item.url}
                      isRead={readUrls.has(item.url)}
                      compact={false}
                      onClick={() => openByIdx(items.indexOf(item))}
                      T={T}
                    />
                  ))}
                </div>
              );
            })}

            {/* Compact list in split-view (no grouping needed) */}
            {showSplit && items.map((item, i) => (
              <TodayItem
                key={item.url || i}
                item={item}
                isSelected={openItem?.url === item.url}
                isRead={readUrls.has(item.url)}
                compact={true}
                onClick={() => openByIdx(i)}
                T={T}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop split: reader ── */}
      {showSplit && (
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

      {/* ── Mobile: full-screen reader ── */}
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

// ── Dashboard stat widgets ─────────────────────────────────────
function StatWidgets({ T, isMobile, streak, thisWeek, reviewDue, savedCount }) {
  const widgets = [
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={T.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 1.5C8 1.5 4 5 4 8.5a4 4 0 0 0 8 0C12 5 8 1.5 8 1.5z"/>
        </svg>
      ),
      label: "Streak",
      value: streak,
      unit: streak === 1 ? "day" : "days",
      sub: `${thisWeek} this week`,
      accent: streak >= 7,
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={reviewDue > 0 ? T.accent : T.textTertiary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="12" height="10" rx="2"/>
          <path d="M5 7h6M5 10h4"/>
        </svg>
      ),
      label: "Review",
      value: reviewDue,
      unit: reviewDue === 1 ? "card due" : "cards due",
      sub: reviewDue > 0 ? "Tap to review" : "All caught up",
      cta: reviewDue > 0,
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={T.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1.5.87L8 11.5l-4.5 2.37A1 1 0 0 1 2 13V3a1 1 0 0 1 1-1z"/>
        </svg>
      ),
      label: "Saved",
      value: savedCount,
      unit: savedCount === 1 ? "item" : "items",
      sub: "Read later",
    },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: isMobile ? 8 : 10,
      margin: isMobile ? "12px 14px 4px" : "14px 20px 4px",
    }}>
      {widgets.map(w => (
        <div key={w.label} style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: isMobile ? "11px 12px" : "13px 14px",
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
            {w.icon}
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.textTertiary }}>
              {w.label}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, lineHeight: 1, color: w.accent ? T.accent : T.text, letterSpacing: "-.02em" }}>
              {w.value}
            </span>
            <span style={{ fontSize: 11, color: T.textSecondary }}>
              {w.unit}
            </span>
          </div>
          <div style={{ fontSize: 11, color: w.cta ? T.accent : T.textTertiary, fontWeight: w.cta ? 600 : 400 }}>
            {w.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Brief header dashboard ──────────────────────────────────────
function BriefHeader({ T, isMobile, dateLabel, total, readCount, progress, unreadMinutes, loading, onStartReading }) {
  const unread = total - readCount;

  function fmtTime(min) {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  return (
    <div style={{
      padding: isMobile ? "24px 18px 16px" : "32px 28px 20px",
      borderBottom: `1px solid ${T.border}`,
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", color: T.accent, textTransform: "uppercase", marginBottom: 6 }}>
        {dateLabel}
      </div>
      <h1 style={{
        fontFamily: "var(--reader-font-family)", fontStyle: "italic",
        fontSize: isMobile ? 38 : 52,
        fontWeight: 700, lineHeight: 1.05, color: T.text,
        margin: "0 0 16px", letterSpacing: "-.02em",
      }}>
        Today
      </h1>

      {!loading && total > 0 && (
        <>
          <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 12 }}>
            {unread > 0
              ? <><span style={{ color: T.text, fontWeight: 600 }}>{unread} unread</span>{` · ~${fmtTime(unreadMinutes)} to read`}</>
              : <span style={{ color: T.accent, fontWeight: 600 }}>All {total} articles read ✓</span>
            }
          </div>

          {/* Start Reading CTA */}
          {onStartReading && (
            <button
              onClick={onStartReading}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: T.accent, color: T.accentText,
                border: "none", borderRadius: 10,
                padding: isMobile ? "11px 20px" : "10px 18px",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", letterSpacing: "-.01em",
                marginBottom: 16, width: "100%", justifyContent: "center",
                boxShadow: `0 2px 12px ${T.accent}44`,
                transition: "opacity .12s, transform .1s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.97)"}
              onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
              onTouchCancel={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2.5a1 1 0 0 1 1.447-.894l9 4.5a1 1 0 0 1 0 1.788l-9 4.5A1 1 0 0 1 3 11.5v-9z"/></svg>
              {readCount > 0 ? "Continue Reading" : "Start Reading"}
            </button>
          )}

          <div style={{ height: 3, background: T.surface2, borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${progress}%`,
              background: progress === 100 ? T.success : T.accent,
              borderRadius: 2, transition: "width .4s ease",
            }} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Hero card — featured top story ─────────────────────────────
function HeroCard({ item, isRead, onClick, T }) {
  const [hovered, setHovered] = useState(false);

  function relTime(dateStr) {
    if (!dateStr) return "";
    const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (m < 1)  return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return "Yesterday";
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        margin: "16px 20px 8px",
        borderRadius: 16,
        overflow: "hidden",
        border: `1px solid ${T.border}`,
        background: hovered ? T.card : T.surface,
        cursor: "pointer",
        transition: "all .15s",
        boxShadow: hovered ? "0 4px 20px rgba(0,0,0,.08)" : "none",
      }}
    >
      {item.image && (
        <div style={{ position: "relative", paddingBottom: "42%", overflow: "hidden" }}>
          <img
            src={item.image}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { e.target.parentElement.style.display = "none"; }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.6))",
          }} />
          <div style={{
            position: "absolute", bottom: 12, left: 14,
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: ".1em", color: "rgba(255,255,255,.85)",
            background: "rgba(0,0,0,.35)", padding: "2px 7px", borderRadius: 100,
          }}>
            {item.source}
          </div>
          {isRead && (
            <div style={{
              position: "absolute", top: 10, right: 10,
              fontSize: 10, fontWeight: 700, color: T.accentText,
              background: T.accent, padding: "2px 8px", borderRadius: 100,
            }}>✓ Read</div>
          )}
        </div>
      )}
      <div style={{ padding: "14px 16px 16px" }}>
        {!item.image && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: ".08em" }}>
              {item.source}
            </span>
            {isRead && <span style={{ fontSize: 10, color: T.accent }}>✓ Read</span>}
          </div>
        )}
        <h2 style={{
          fontFamily: "var(--reader-font-family)", fontStyle: "italic",
          fontSize: 18, fontWeight: 700, color: isRead ? T.textTertiary : T.text,
          margin: "0 0 7px", lineHeight: 1.3, letterSpacing: "-.01em",
        }}>
          {item.title}
        </h2>
        {item.description && (
          <p style={{
            fontSize: 13, color: T.textSecondary, lineHeight: 1.6,
            margin: "0 0 10px",
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {item.description}
          </p>
        )}
        <div style={{ fontSize: 11, color: T.textTertiary }}>
          {item.date ? relTime(item.date) : ""}
        </div>
      </div>
    </div>
  );
}

// ── TodayItem ──────────────────────────────────────────────────
function TodayItem({ item, isSelected, isRead, compact, onClick, T }) {
  const [hovered, setHovered] = useState(false);

  function relTime(dateStr) {
    if (!dateStr) return "";
    const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (m < 1)  return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return "Yesterday";
  }

  if (compact) {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "11px 20px", cursor: "pointer",
          background: isSelected ? T.accentSurface : hovered ? T.surface : "transparent",
          borderLeft: `3px solid ${isSelected ? T.accent : "transparent"}`,
          transition: "background .12s",
        }}
      >
        {item.image && (
          <img src={item.image} alt="" style={{ width: 44, height: 34, objectFit: "cover", borderRadius: 5, flexShrink: 0, marginTop: 2 }} onError={e => { e.target.style.display = "none"; }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: isSelected ? 600 : 500,
            color: isSelected ? T.accent : isRead ? T.textTertiary : T.text,
            lineHeight: 1.35, marginBottom: 2,
            overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            fontFamily: "var(--reader-font-family)",
          }}>
            {item.title}
          </div>
          <div style={{ fontSize: 11, color: T.textTertiary }}>
            {item.source}{item.date ? ` · ${relTime(item.date)}` : ""}
          </div>
        </div>
        {isRead && <span style={{ fontSize: 10, color: T.accent, flexShrink: 0, marginTop: 3 }}>✓</span>}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 14,
        padding: "13px 22px", cursor: "pointer",
        background: hovered ? T.surface : "transparent",
        borderBottom: `1px solid ${T.border}`,
        transition: "background .12s",
      }}
    >
      {item.image && (
        <img src={item.image} alt="" style={{ width: 60, height: 45, objectFit: "cover", borderRadius: 8, flexShrink: 0, marginTop: 2, opacity: isRead ? 0.5 : 1 }} onError={e => { e.target.style.display = "none"; }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".06em" }}>
            {item.source}
          </span>
          {item.date && <span style={{ fontSize: 11, color: T.textTertiary }}>{relTime(item.date)}</span>}
          {isRead && <span style={{ fontSize: 10, color: T.accent, marginLeft: "auto" }}>✓</span>}
        </div>
        <h3 style={{
          fontFamily: "var(--reader-font-family)", fontStyle: "italic",
          fontSize: 15, fontWeight: 600, color: isRead ? T.textTertiary : T.text,
          margin: "0 0 4px", lineHeight: 1.3, letterSpacing: "-.01em",
        }}>
          {item.title}
        </h3>
        {item.description && (
          <p style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.55, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}
