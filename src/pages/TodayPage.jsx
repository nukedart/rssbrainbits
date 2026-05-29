// ── TodayPage — Flipboard-style daily dashboard ─────────────────
import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { fetchRSSFeed } from "../lib/fetchers";
import { getCachedFeed } from "../lib/feedCache";
import { Spinner } from "../components/UI";
import ContentViewer from "../components/ContentViewer";
import { supabase, getReadingStats, getHighlightReviews } from "../lib/supabase";

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

export default function TodayPage({ feeds = [], onPlayPodcast, onNavigate }) {
  const { T }        = useTheme();
  const { user }     = useAuth();
  const { isMobile } = useBreakpoint();

  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [openItem, setOpenItem] = useState(null);
  const [openIdx, setOpenIdx]   = useState(-1);
  const [readUrls, setReadUrls] = useState(new Set());

  const [streak, setStreak]         = useState(0);
  const [thisWeek, setThisWeek]     = useState(0);
  const [reviewDue, setReviewDue]   = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    getReadingStats(user.id).then(s => {
      setThisWeek(s.thisWeek ?? 0);
    }).catch(() => {});
    // SR review streak from localStorage (set by ReviewPage)
    try {
      const raw = localStorage.getItem(`fb-streak-${user.id}`);
      setStreak(raw ? (JSON.parse(raw).streak ?? 0) : 0);
    } catch {}
    // Due cards from Supabase highlight_reviews
    const today = new Date().toISOString().slice(0, 10);
    getHighlightReviews(user.id).then(reviews => {
      setReviewDue(reviews.filter(r => !r.next_review || r.next_review <= today).length);
    }).catch(() => {});
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

  function openByIdx(i) {
    if (i < 0 || i >= items.length) return;
    setOpenItem(items[i]);
    setOpenIdx(i);
    markRead(items[i].url);
  }

  const readCount = items.filter(i => readUrls.has(i.url)).length;
  const progress  = items.length > 0 ? Math.round((readCount / items.length) * 100) : 0;
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const showSplit = !isMobile && openItem;

  // ── Mobile: header + stat pills + snap deck ──────────────────
  if (isMobile) {
    if (openItem) {
      return (
        <ContentViewer
          item={openItem}
          onClose={() => { setOpenItem(null); setOpenIdx(-1); }}
          onNext={openIdx < items.length - 1 ? () => openByIdx(openIdx + 1) : undefined}
          onPrev={openIdx > 0 ? () => openByIdx(openIdx - 1) : undefined}
          currentIdx={openIdx}
          totalCount={items.length}
          onPlayPodcast={onPlayPodcast}
        />
      );
    }

    const unread = items.filter(i => !readUrls.has(i.url)).length;

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Compact header */}
        <div style={{
          flexShrink: 0, padding: "10px 16px 8px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 1 }}>{dateLabel}</div>
            <div style={{ fontFamily: "var(--reader-font-family)", fontStyle: "italic", fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: "-.025em", lineHeight: 1.1 }}>Today</div>
          </div>
          {!loading && items.length > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: unread > 0 ? T.text : T.accent }}>
                {unread > 0 ? `${unread} unread` : "All read ✓"}
              </div>
              <div style={{ height: 3, background: T.surface2, borderRadius: 2, overflow: "hidden", marginTop: 5, width: 56 }}>
                <div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? T.success : T.accent, borderRadius: 2, transition: "width .4s ease" }} />
              </div>
            </div>
          )}
        </div>

        {/* Stat pills */}
        <div style={{ flexShrink: 0 }}>
          <StatPills T={T} streak={streak} thisWeek={thisWeek} reviewDue={reviewDue} savedCount={savedCount} onNavigate={onNavigate} />
        </div>

        {/* Snap deck — wrapper gives scroll container a definite size */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <ScrollDeck
            items={items}
            readUrls={readUrls}
            loading={loading}
            feeds={feeds}
            onOpen={(item, i) => { setOpenItem(item); setOpenIdx(i); markRead(item.url); }}
            T={T}
          />
        </div>
      </div>
    );
  }

  // ── Desktop: magazine grid + optional split reader ────────────
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

      {/* Left panel */}
      <div style={{
        flex: showSplit ? "0 0 380px" : 1,
        overflowY: "auto",
        minWidth: 0,
        transition: "flex .2s ease",
      }}>
        {showSplit ? (
          <div style={{ padding: "12px 18px 10px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", color: T.accent, textTransform: "uppercase", marginBottom: 1 }}>{dateLabel}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--reader-font-family)", fontStyle: "italic", fontSize: 16, fontWeight: 700, color: T.text }}>Today</span>
              {items.length > 0 && <span style={{ fontSize: 11, color: T.textTertiary }}>{readCount}/{items.length} read</span>}
            </div>
          </div>
        ) : (
          <>
            <PageHeader
              T={T}
              dateLabel={dateLabel}
              total={items.length}
              readCount={readCount}
              progress={progress}
              loading={loading}
              onStartReading={() => {
                const i = items.findIndex(x => !readUrls.has(x.url));
                if (i >= 0) openByIdx(i);
              }}
            />
            <StatPills T={T} streak={streak} thisWeek={thisWeek} reviewDue={reviewDue} savedCount={savedCount} onNavigate={onNavigate} />
          </>
        )}

        {loading && items.length === 0 && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <Spinner size={28} />
          </div>
        )}

        {!loading && items.length === 0 && <EmptyState feeds={feeds} T={T} />}

        {!loading && items.length > 0 && (
          showSplit ? (
            items.map((item, i) => (
              <TodayItem
                key={item.url || i}
                item={item}
                isSelected={openItem?.url === item.url}
                isRead={readUrls.has(item.url)}
                onClick={() => openByIdx(i)}
                T={T}
              />
            ))
          ) : (
            <MagazineGrid items={items} readUrls={readUrls} openByIdx={openByIdx} T={T} />
          )
        )}
      </div>

      {/* Right panel: split reader */}
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
    </div>
  );
}

// ── Mobile: CSS scroll-snap card feed ────────────────────────
function ScrollDeck({ items, readUrls, loading, feeds, onOpen, T }) {
  if (loading && !items.length) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", gap: 10, padding: "10px 12px" }}>
        {[1, 0.7, 0.45].map((op, i) => (
          <div key={i} className="skeleton" style={{ flex: i === 0 ? 2 : 1, borderRadius: 18, opacity: op }} />
        ))}
      </div>
    );
  }
  if (!loading && !items.length) {
    return <div style={{ position: "absolute", inset: 0 }}><EmptyState feeds={feeds} T={T} /></div>;
  }

  return (
    <div style={{
      position: "absolute", inset: 0,
      overflowY: "scroll",
      overflowX: "hidden",
      scrollSnapType: "y mandatory",
      WebkitOverflowScrolling: "touch",
    }}>
      {items.map((item, i) => (
        <SnapCard
          key={item.url || i}
          item={item}
          idx={i}
          total={items.length}
          isRead={readUrls.has(item.url)}
          onOpen={() => onOpen(item, i)}
          T={T}
          isLast={i === items.length - 1}
        />
      ))}
    </div>
  );
}

// ── Single snap card — fills 100% of its scroll container ────
function SnapCard({ item, idx, total, isRead, onOpen, T, isLast }) {
  const hasImage = !!item.image;

  const fg      = hasImage ? "#fff"                  : T.text;
  const fgMuted = hasImage ? "rgba(255,255,255,.5)"  : T.textTertiary;
  const srcBg   = hasImage ? "rgba(255,255,255,.12)" : T.surface;
  const srcFg   = hasImage ? "rgba(255,255,255,.8)"  : T.textSecondary;
  const ctrBg   = hasImage ? "rgba(0,0,0,.4)"        : T.surface;
  const ctrFg   = hasImage ? "rgba(255,255,255,.8)"  : T.textSecondary;

  return (
    <div
      onClick={onOpen}
      style={{
        // 100% of the scroll container viewport (works because parent is position:absolute;inset:0)
        height: "calc(100% - 16px)",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        borderRadius: 18,
        background: hasImage ? "#0a0a0a" : `linear-gradient(160deg, ${T.accent}18, ${T.surface2} 70%)`,
        WebkitTapHighlightColor: "transparent",
        margin: "8px 12px",
        marginBottom: isLast ? `calc(env(safe-area-inset-bottom, 0px) + 84px)` : 0,
      }}
    >
      {/* Full-bleed image */}
      {hasImage && (
        <img
          src={item.image} alt=""
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            opacity: isRead ? 0.4 : 0.82,
            transition: "opacity .3s",
          }}
          onError={e => { e.target.style.display = "none"; }}
        />
      )}

      {/* Gradient overlay */}
      {hasImage && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,.5) 0%, transparent 30%, transparent 40%, rgba(0,0,0,.92) 100%)",
        }} />
      )}

      {/* Top: counter */}
      <div style={{
        position: "absolute", top: 16, right: 16,
        fontSize: 11, fontWeight: 700, color: ctrFg,
        background: ctrBg, backdropFilter: "blur(8px)",
        padding: "4px 10px", borderRadius: 100,
      }}>
        {idx + 1} / {total}
      </div>

      {/* Read badge */}
      {isRead && (
        <div style={{
          position: "absolute", top: 16, left: 16,
          fontSize: 11, fontWeight: 700,
          color: T.accentText, background: T.accent,
          padding: "4px 10px", borderRadius: 100,
        }}>
          ✓ Read
        </div>
      )}

      {/* Bottom content */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "0 20px 24px",
      }}>
        {/* Source + time */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: srcFg,
            textTransform: "uppercase", letterSpacing: ".07em",
            background: srcBg, backdropFilter: "blur(8px)",
            padding: "3px 9px", borderRadius: 100,
          }}>
            {item.source}
          </span>
          {item.date && <span style={{ fontSize: 11, color: fgMuted }}>{relTime(item.date)}</span>}
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: "var(--reader-font-family)", fontStyle: "italic",
          fontSize: 26, fontWeight: 800, color: fg,
          margin: "0 0 18px", lineHeight: 1.24, letterSpacing: "-.02em",
          textShadow: hasImage ? "0 2px 16px rgba(0,0,0,.6)" : "none",
          display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {item.title}
        </h2>

        {/* Scroll hint */}
        {!isLast && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: fgMuted, fontSize: 11, fontWeight: 600 }}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 5l6 6 6-6"/>
            </svg>
            Swipe for next
          </div>
        )}
      </div>
    </div>
  );
}

// ── Desktop: Flipboard magazine grid ─────────────────────────
function MagazineGrid({ items, readUrls, openByIdx, T }) {
  if (!items.length) return null;
  const [hero, second, third, ...rest] = items;

  return (
    <div style={{ padding: "0 16px 40px" }}>
      {/* Top row: hero (2/3) + 2 stacked medium tiles (1/3) */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 10 }}>
        <MagazineTile item={hero} isRead={readUrls.has(hero.url)} onClick={() => openByIdx(0)} variant="hero" T={T} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {second && <MagazineTile item={second} isRead={readUrls.has(second.url)} onClick={() => openByIdx(1)} variant="medium" T={T} />}
          {third  && <MagazineTile item={third}  isRead={readUrls.has(third.url)}  onClick={() => openByIdx(2)} variant="medium" T={T} />}
        </div>
      </div>

      {/* Remaining: 3-col small grid */}
      {rest.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {rest.map((item, i) => (
            <MagazineTile key={item.url || i} item={item} isRead={readUrls.has(item.url)} onClick={() => openByIdx(i + 3)} variant="small" T={T} />
          ))}
        </div>
      )}
    </div>
  );
}

function MagazineTile({ item, isRead, onClick, variant, T }) {
  const [hovered, setHovered] = useState(false);
  const hasImage = !!item.image;
  const isHero   = variant === "hero";
  const isMedium = variant === "medium";

  const fg      = hasImage ? "#fff"                   : T.text;
  const fgMuted = hasImage ? "rgba(255,255,255,.65)"  : T.textTertiary;
  const fgDim   = hasImage ? "rgba(255,255,255,.45)"  : T.textTertiary;

  if (isHero) {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative", borderRadius: 16, overflow: "hidden", cursor: "pointer",
          aspectRatio: "16/9", opacity: isRead ? 0.65 : 1,
          background: hasImage ? "#000" : `linear-gradient(135deg, ${T.accent}22, ${T.surface2})`,
          transition: "all .15s",
          boxShadow: hovered ? "0 12px 40px rgba(0,0,0,.18)" : "0 2px 8px rgba(0,0,0,.07)",
          transform: hovered ? "translateY(-2px)" : "none",
        }}
      >
        {hasImage && <img src={item.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />}
        {hasImage && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 25%, rgba(0,0,0,.85) 100%)" }} />}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 22px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 9 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: fgMuted, textTransform: "uppercase", letterSpacing: ".08em" }}>{item.source}</span>
            {item.date && <span style={{ fontSize: 11, color: fgDim }}>{relTime(item.date)}</span>}
          </div>
          <h2 style={{ fontFamily: "var(--reader-font-family)", fontStyle: "italic", fontSize: 22, fontWeight: 800, color: fg, margin: 0, lineHeight: 1.25, letterSpacing: "-.02em", textShadow: hasImage ? "0 2px 8px rgba(0,0,0,.4)" : "none", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {item.title}
          </h2>
        </div>
      </div>
    );
  }

  if (isMedium) {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative", borderRadius: 12, overflow: "hidden", cursor: "pointer", flex: 1,
          opacity: isRead ? 0.6 : 1, minHeight: 110,
          background: hasImage ? "#111" : `linear-gradient(135deg, ${T.accent}20, ${T.surface2})`,
          transition: "all .15s",
          boxShadow: hovered ? "0 8px 28px rgba(0,0,0,.14)" : "0 1px 6px rgba(0,0,0,.06)",
          transform: hovered ? "translateY(-1px)" : "none",
        }}
      >
        {hasImage && <img src={item.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} onError={e => e.target.style.display = "none"} />}
        {hasImage && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 15%, rgba(0,0,0,.82) 100%)" }} />}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: fgMuted, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }}>{item.source}</div>
          <h3 style={{ fontFamily: "var(--reader-font-family)", fontStyle: "italic", fontSize: 14, fontWeight: 700, color: fg, margin: 0, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {item.title}
          </h3>
        </div>
      </div>
    );
  }

  // Small card
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 12, overflow: "hidden", cursor: "pointer",
        background: T.card, border: `1px solid ${T.border}`,
        opacity: isRead ? 0.5 : 1, transition: "all .15s",
        boxShadow: hovered ? "0 6px 20px rgba(0,0,0,.1)" : "none",
        transform: hovered ? "translateY(-1px)" : "none",
      }}
    >
      {hasImage ? (
        <img src={item.image} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} onError={e => e.target.style.display = "none"} />
      ) : (
        <div style={{ width: "100%", aspectRatio: "16/9", background: `linear-gradient(135deg, ${T.accent}18, ${T.surface2})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: T.accent, opacity: 0.2, fontFamily: "var(--reader-font-family)" }}>
            {(item.source || "?").charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div style={{ padding: "9px 11px 12px" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.source}{item.date ? ` · ${relTime(item.date)}` : ""}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.35, letterSpacing: "-.01em", fontFamily: "var(--reader-font-family)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {item.title}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ feeds, T }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
      {feeds.length === 0 ? (
        <>
          <div style={{ fontSize: 36, marginBottom: 14 }}>📡</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 6, fontFamily: "var(--reader-font-family)", fontStyle: "italic" }}>No feeds added yet</div>
          <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, maxWidth: 280 }}>Add RSS feeds, podcasts, or YouTube channels and Today will show a daily digest.</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 36, marginBottom: 14 }}>🌅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 6, fontFamily: "var(--reader-font-family)", fontStyle: "italic" }}>Quiet day</div>
          <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, maxWidth: 280 }}>No new articles in the last 24 hours. Check back later or add more feeds.</div>
        </>
      )}
    </div>
  );
}

// ── Desktop PageHeader ────────────────────────────────────────
function PageHeader({ T, dateLabel, total, readCount, progress, loading, onStartReading }) {
  const unread = total - readCount;
  function fmtTime(min) {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return (
    <div style={{ padding: "24px 22px 16px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".16em", color: T.accent, textTransform: "uppercase", marginBottom: 4 }}>{dateLabel}</div>
          <div style={{ fontFamily: "var(--reader-font-family)", fontStyle: "italic", fontSize: 36, fontWeight: 700, lineHeight: 1, color: T.text, letterSpacing: "-.025em" }}>Today</div>
        </div>
        {!loading && total > 0 && (
          <div style={{ textAlign: "right", paddingTop: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: unread > 0 ? T.text : T.accent }}>{unread > 0 ? `${unread} unread` : "All read ✓"}</div>
            {unread > 0 && <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>~{fmtTime(unread * AVG_READ_MIN)}</div>}
          </div>
        )}
      </div>
      {!loading && total > 0 && (
        <>
          <div style={{ height: 3, background: T.surface2, borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? T.success : T.accent, borderRadius: 2, transition: "width .4s ease" }} />
          </div>
          {onStartReading && unread > 0 && (
            <button
              onClick={onStartReading}
              style={{ display: "flex", alignItems: "center", gap: 8, background: T.accent, color: T.accentText, border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%", justifyContent: "center", boxShadow: `0 2px 12px ${T.accent}40`, transition: "opacity .12s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
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

// ── Stat pills ────────────────────────────────────────────────
function StatPills({ T, streak, thisWeek, reviewDue, savedCount, onNavigate }) {
  const pills = [
    { icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 8a5.5 5.5 0 0 1-9.9 3.3M2.5 8a5.5 5.5 0 0 1 9.9-3.3"/><path d="M11.5 4.5l.9-2.1 2.1.9"/><path d="M4.5 11.5l-.9 2.1-2.1-.9"/></svg>, value: streak, label: streak === 1 ? "day streak" : "day streak", highlight: streak >= 3, onClick: onNavigate ? () => onNavigate("review") : null },
    { icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 12L6 4l4 6 3-4 3 6"/></svg>, value: thisWeek, label: "this week" },
    { icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="10" rx="2"/><path d="M5 7h6M5 10h4"/></svg>, value: reviewDue, label: reviewDue === 1 ? "card due" : "cards due", cta: reviewDue > 0, onClick: reviewDue > 0 && onNavigate ? () => onNavigate("review") : null },
    { icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1.5.87L8 11.5l-4.5 2.37A1 1 0 0 1 2 13V3a1 1 0 0 1 1-1z"/></svg>, value: savedCount, label: "saved", onClick: onNavigate ? () => onNavigate("readlater") : null },
  ];
  return (
    <div style={{ display: "flex", gap: 7, padding: "2px 16px 14px", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
      {pills.map((p, i) => (
        <div key={i} onClick={p.onClick || undefined} style={{ display: "flex", alignItems: "center", gap: 5, background: p.cta ? T.accentSurface : p.highlight ? T.accentSurface : T.surface, border: `1px solid ${p.cta || p.highlight ? T.accent + "40" : T.border}`, borderRadius: 100, padding: "5px 12px 5px 9px", flexShrink: 0, color: p.cta || p.highlight ? T.accent : T.textSecondary, cursor: p.onClick ? "pointer" : "default", WebkitTapHighlightColor: "transparent" }}>
          <span style={{ display: "flex", opacity: p.cta || p.highlight ? 1 : 0.6 }}>{p.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: p.cta || p.highlight ? T.accent : T.text, letterSpacing: "-.01em" }}>{p.value}</span>
          <span style={{ fontSize: 11, color: T.textTertiary }}>{p.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── TodayItem (compact list, desktop split-view) ──────────────
function TodayItem({ item, isSelected, isRead, onClick, T }) {
  const [hovered, setHovered] = useState(false);
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
        <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? T.accent : isRead ? T.textTertiary : T.text, lineHeight: 1.35, marginBottom: 2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontFamily: "var(--reader-font-family)" }}>
          {item.title}
        </div>
        <div style={{ fontSize: 11, color: T.textTertiary }}>
          {item.source}{item.date ? ` · ${relTime(item.date)}` : ""}
        </div>
      </div>
    </div>
  );
}
