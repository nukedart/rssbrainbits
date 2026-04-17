// ── TodayPage — magazine-style daily dashboard ─────────────────
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
const AVG_READ_MIN = 4;

function relTime(dateStr) {
  if (!dateStr) return "";
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return "Yesterday";
}

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
    getReadingStats(user.id).then(s => {
      setStreak(s.streak ?? 0);
      setThisWeek(s.thisWeek ?? 0);
    }).catch(() => {});
    try {
      const schedule = JSON.parse(localStorage.getItem(`fb-sr-${user.id}`) || "{}");
      const today = new Date().toISOString().slice(0, 10);
      setReviewDue(Object.values(schedule).filter(e => !e.nextReview || e.nextReview <= today).length);
    } catch {}
    supabase.from("saved").select("url", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => { if (count != null) setSavedCount(count); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    try {
      const stored = JSON.parse(localStorage.getItem(`fb-readurls-${user.id}`) || "[]");
      setReadUrls(new Set(stored));
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!feeds.length) { setLoading(false); return; }
    setLoading(true);
    const cutoff = Date.now() - TWENTY_FOUR_HOURS;
    const toToday = (arr) => arr.filter(i => i.date && new Date(i.date).getTime() > cutoff);
    const mapItems = (f, arr) =>
      arr.slice(0, MAX_PER_FEED).map(i => ({ ...i, feedId: f.id, source: i.source || f.name || f.url }));

    const cached = feeds.flatMap(f => {
      const c = getCachedFeed(f.url);
      return c ? mapItems(f, c.data?.items || []) : [];
    });
    const todayCached = toToday(cached).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (todayCached.length) { setItems(todayCached); setLoading(false); }

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

  const readCount     = items.filter(i => readUrls.has(i.url)).length;
  const unreadCount   = items.length - readCount;
  const progress      = items.length > 0 ? Math.round((readCount / items.length) * 100) : 0;
  const unreadMinutes = unreadCount * AVG_READ_MIN;
  const firstUnreadIdx = items.findIndex(i => !readUrls.has(i.url));
  const heroItem = items.find(i => !readUrls.has(i.url) && i.image) || items.find(i => !readUrls.has(i.url));

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const showSplit = !isMobile && openItem;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

      {/* ── Left panel ── */}
      <div style={{
        flex: showSplit ? "0 0 380px" : 1,
        overflowY: "auto",
        display: "flex", flexDirection: "column",
        minWidth: 0,
        transition: "flex .2s ease",
      }}>

        {/* ── Compact header ── */}
        {!showSplit && (
          <PageHeader
            T={T} isMobile={isMobile}
            dateLabel={dateLabel}
            total={items.length}
            readCount={readCount}
            progress={progress}
            unreadMinutes={unreadMinutes}
            loading={loading}
            onStartReading={firstUnreadIdx >= 0 ? () => openByIdx(firstUnreadIdx) : null}
          />
        )}

        {/* Compact split header */}
        {showSplit && (
          <div style={{ padding: "12px 18px 10px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", color: T.accent, textTransform: "uppercase", marginBottom: 1 }}>{dateLabel}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--reader-font-family)", fontStyle: "italic", fontSize: 16, fontWeight: 700, color: T.text }}>Today</span>
              {items.length > 0 && <span style={{ fontSize: 11, color: T.textTertiary }}>{readCount}/{items.length} read</span>}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <Spinner size={28} />
          </div>
        )}

        {/* Empty */}
        {!loading && items.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
            {feeds.length === 0 ? (
              <>
                <div style={{ fontSize: 36, marginBottom: 14 }}>📡</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 6, fontFamily: "var(--reader-font-family)", fontStyle: "italic" }}>No feeds added yet</div>
                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, maxWidth: 280 }}>Add RSS feeds, podcasts, or YouTube channels and Today will show a daily digest of what's new.</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 36, marginBottom: 14 }}>🌅</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 6, fontFamily: "var(--reader-font-family)", fontStyle: "italic" }}>Quiet day</div>
                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, maxWidth: 280 }}>No new articles in the last 24 hours. Check back later or add more feeds.</div>
              </>
            )}
          </div>
        )}

        {/* Content */}
        {!loading && items.length > 0 && (
          <>
            {/* Stat pills */}
            {!showSplit && (
              <StatPills T={T} streak={streak} thisWeek={thisWeek} reviewDue={reviewDue} savedCount={savedCount} />
            )}

            {/* Hero */}
            {!showSplit && heroItem && (
              <HeroCard
                item={heroItem}
                isRead={readUrls.has(heroItem.url)}
                onClick={() => openByIdx(items.indexOf(heroItem))}
                T={T} isMobile={isMobile}
              />
            )}

            {/* Article grid */}
            {!showSplit && (
              <ArticleGrid
                items={items}
                heroItem={heroItem}
                readUrls={readUrls}
                openByIdx={openByIdx}
                T={T} isMobile={isMobile}
              />
            )}

            {/* Split-view compact list */}
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
          </>
        )}
      </div>

      {/* ── Desktop split reader ── */}
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

      {/* ── Mobile full-screen reader ── */}
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

// ── Page header — compact two-row design ───────────────────────
function PageHeader({ T, isMobile, dateLabel, total, readCount, progress, unreadMinutes, loading, onStartReading }) {
  const unread = total - readCount;

  function fmtTime(min) {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  return (
    <div style={{
      padding: isMobile ? "20px 16px 14px" : "24px 22px 16px",
      flexShrink: 0,
    }}>
      {/* Top row: date + unread count */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".16em", color: T.accent, textTransform: "uppercase", marginBottom: 4 }}>
            {dateLabel}
          </div>
          <div style={{
            fontFamily: "var(--reader-font-family)", fontStyle: "italic",
            fontSize: isMobile ? 30 : 36,
            fontWeight: 700, lineHeight: 1, color: T.text,
            letterSpacing: "-.025em",
          }}>
            Today
          </div>
        </div>
        {!loading && total > 0 && (
          <div style={{ textAlign: "right", paddingTop: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: unread > 0 ? T.text : T.accent, letterSpacing: "-.01em" }}>
              {unread > 0 ? `${unread} unread` : "All read ✓"}
            </div>
            {unread > 0 && (
              <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>
                ~{fmtTime(unreadMinutes)}
              </div>
            )}
          </div>
        )}
      </div>

      {!loading && total > 0 && (
        <>
          {/* Progress bar */}
          <div style={{ height: 3, background: T.surface2, borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
            <div style={{
              height: "100%", width: `${progress}%`,
              background: progress === 100 ? T.success : T.accent,
              borderRadius: 2, transition: "width .4s ease",
            }} />
          </div>

          {/* Start/Continue reading CTA */}
          {onStartReading && (
            <button
              onClick={onStartReading}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: T.accent, color: T.accentText,
                border: "none", borderRadius: 10,
                padding: isMobile ? "10px 18px" : "9px 16px",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", width: "100%", justifyContent: "center",
                boxShadow: `0 2px 12px ${T.accent}40`,
                transition: "opacity .12s, transform .1s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.97)"}
              onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
              onTouchCancel={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2.5a1 1 0 0 1 1.447-.894l9 4.5a1 1 0 0 1 0 1.788l-9 4.5A1 1 0 0 1 3 11.5v-9z"/></svg>
              {readCount > 0 ? "Continue Reading" : "Start Reading"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Stat pills — horizontal scrollable row ─────────────────────
function StatPills({ T, streak, thisWeek, reviewDue, savedCount }) {
  const pills = [
    {
      icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 1.5C8 1.5 4 5 4 8.5a4 4 0 0 0 8 0C12 5 8 1.5 8 1.5z"/></svg>,
      value: streak, label: streak === 1 ? "day streak" : "day streak", highlight: streak >= 7,
    },
    {
      icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 12L6 4l4 6 3-4 3 6"/></svg>,
      value: thisWeek, label: "this week",
    },
    {
      icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="10" rx="2"/><path d="M5 7h6M5 10h4"/></svg>,
      value: reviewDue, label: reviewDue === 1 ? "card due" : "cards due", cta: reviewDue > 0,
    },
    {
      icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1.5.87L8 11.5l-4.5 2.37A1 1 0 0 1 2 13V3a1 1 0 0 1 1-1z"/></svg>,
      value: savedCount, label: savedCount === 1 ? "saved" : "saved",
    },
  ];

  return (
    <div style={{
      display: "flex", gap: 7,
      padding: "2px 16px 14px",
      overflowX: "auto",
      scrollbarWidth: "none",
      WebkitOverflowScrolling: "touch",
    }}>
      {pills.map((p, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 5,
          background: p.cta ? T.accentSurface : p.highlight ? T.accentSurface : T.surface,
          border: `1px solid ${p.cta || p.highlight ? T.accent + "40" : T.border}`,
          borderRadius: 100,
          padding: "5px 12px 5px 9px",
          flexShrink: 0,
          color: p.cta || p.highlight ? T.accent : T.textSecondary,
        }}>
          <span style={{ display: "flex", opacity: p.cta || p.highlight ? 1 : 0.6 }}>{p.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: p.cta || p.highlight ? T.accent : T.text, letterSpacing: "-.01em" }}>{p.value}</span>
          <span style={{ fontSize: 11, color: T.textTertiary }}>{p.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Hero card — cinematic featured story ───────────────────────
function HeroCard({ item, isRead, onClick, T, isMobile }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        margin: isMobile ? "0 12px 10px" : "0 16px 12px",
        borderRadius: 16,
        overflow: "hidden",
        cursor: "pointer",
        opacity: isRead ? 0.65 : 1,
        transition: "all .15s",
        boxShadow: hovered ? "0 8px 28px rgba(0,0,0,.14)" : "0 2px 10px rgba(0,0,0,.07)",
        transform: hovered ? "translateY(-1px)" : "none",
      }}
    >
      {item.image ? (
        <div style={{ position: "relative", paddingBottom: isMobile ? "52%" : "40%" }}>
          <img src={item.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { e.target.parentElement.style.display = "none"; }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,.72))" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: isMobile ? "16px 16px 14px" : "18px 20px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,.7)", background: "rgba(255,255,255,.15)", padding: "2px 7px", borderRadius: 100 }}>
                {item.source}
              </span>
              {item.date && <span style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>{relTime(item.date)}</span>}
              {isRead && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: T.accent, padding: "2px 7px", borderRadius: 100, marginLeft: "auto" }}>✓ Read</span>}
            </div>
            <h2 style={{
              fontFamily: "var(--reader-font-family)", fontStyle: "italic",
              fontSize: isMobile ? 17 : 20, fontWeight: 700,
              color: "#fff", margin: 0, lineHeight: 1.3,
              letterSpacing: "-.015em",
              display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
              textShadow: "0 1px 4px rgba(0,0,0,.3)",
            }}>
              {item.title}
            </h2>
          </div>
        </div>
      ) : (
        <div style={{ padding: "18px 20px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{item.source}</div>
          <h2 style={{ fontFamily: "var(--reader-font-family)", fontStyle: "italic", fontSize: 18, fontWeight: 700, color: T.text, margin: 0, lineHeight: 1.3 }}>
            {item.title}
          </h2>
        </div>
      )}
    </div>
  );
}

// ── Article grid — 2-col mobile / 3-col desktop ────────────────
function ArticleGrid({ items, heroItem, readUrls, openByIdx, T, isMobile }) {
  const gridItems = items.filter(i => i.url !== heroItem?.url);
  if (!gridItems.length) return null;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
      gap: isMobile ? 10 : 12,
      padding: isMobile ? "0 12px 100px" : "0 16px 40px",
    }}>
      {gridItems.map((item, i) => (
        <ArticleCard
          key={item.url || i}
          item={item}
          isRead={readUrls.has(item.url)}
          onClick={() => openByIdx(items.indexOf(item))}
          T={T} isMobile={isMobile}
        />
      ))}
    </div>
  );
}

function ArticleCard({ item, isRead, onClick, T, isMobile }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        background: T.card,
        border: `1px solid ${T.border}`,
        transition: "all .15s",
        opacity: isRead ? 0.5 : 1,
        boxShadow: hovered ? "0 6px 20px rgba(0,0,0,.1)" : "none",
        transform: hovered ? "translateY(-1px)" : "none",
      }}
    >
      {/* Thumbnail */}
      {item.image ? (
        <img src={item.image} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
          onError={e => { e.target.style.display = "none"; }} />
      ) : (
        <div style={{ width: "100%", aspectRatio: "16/9", background: `linear-gradient(135deg, ${T.accent}18, ${T.surface2})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: T.accent, opacity: 0.25, fontFamily: "var(--reader-font-family)" }}>
            {(item.source || "?").charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Meta */}
      <div style={{ padding: isMobile ? "8px 9px 10px" : "9px 11px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".05em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {item.source}
          </span>
          {item.date && <span style={{ fontSize: 10, color: T.textTertiary, flexShrink: 0 }}>{relTime(item.date)}</span>}
        </div>
        <div style={{
          fontSize: isMobile ? 12 : 13,
          fontWeight: 600, color: T.text,
          lineHeight: 1.35, letterSpacing: "-.01em",
          fontFamily: "var(--reader-font-family)",
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {item.title}
        </div>
      </div>
    </div>
  );
}

// ── TodayItem — compact row for split-view list ────────────────
function TodayItem({ item, isSelected, isRead, compact, onClick, T }) {
  const [hovered, setHovered] = useState(false);

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
          <span style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".06em" }}>{item.source}</span>
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
