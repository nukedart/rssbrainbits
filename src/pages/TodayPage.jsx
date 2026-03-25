// ── TodayPage — focused daily digest ─────────────────────────
import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { fetchRSSFeed } from "../lib/fetchers";
import { getCachedFeed } from "../lib/feedCache";
import { Spinner } from "../components/UI";
import ContentViewer from "../components/ContentViewer";

const TWENTY_FOUR_HOURS = 86400000;
const MAX_PER_FEED = 10;

export default function TodayPage({ feeds = [], onPlayPodcast }) {
  const { T }        = useTheme();
  const { user }     = useAuth();
  const { isMobile } = useBreakpoint();

  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [openItem, setOpenItem] = useState(null);
  const [openIdx, setOpenIdx]   = useState(-1);
  const [readUrls, setReadUrls] = useState(new Set());

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

  const readCount = items.filter(i => readUrls.has(i.url)).length;
  const progress  = items.length > 0 ? Math.round((readCount / items.length) * 100) : 0;

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const showSplit = !isMobile && openItem;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

      {/* ── Article list ── */}
      <div style={{
        flex: showSplit ? "0 0 380px" : 1,
        overflowY: "auto",
        display: "flex", flexDirection: "column",
        minWidth: 0,
        transition: "flex .2s ease",
      }}>
        {/* Header */}
        <div style={{
          padding: showSplit
            ? "18px 20px 14px"
            : isMobile ? "20px 18px 16px" : "36px 32px 24px",
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", color: T.accent, textTransform: "uppercase", marginBottom: showSplit ? 2 : 10 }}>
            {dateLabel}
          </div>
          <h1 style={{
            fontFamily: "var(--reader-font-family)", fontStyle: "italic",
            fontSize: showSplit ? 18 : isMobile ? 36 : 52,
            fontWeight: 700, lineHeight: 1.05, color: T.text,
            margin: 0, letterSpacing: "-.02em",
          }}>
            Today
          </h1>

          {/* Progress row */}
          {!showSplit && !loading && items.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
              <div style={{ flex: 1, height: 4, background: T.surface2, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: T.accent, borderRadius: 2, transition: "width .4s ease" }} />
              </div>
              <span style={{ fontSize: 12, color: T.textTertiary, flexShrink: 0 }}>
                {readCount} / {items.length} read
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <Spinner size={28} />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🌅</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 6, fontFamily: "var(--reader-font-family)", fontStyle: "italic" }}>
              All caught up
            </div>
            <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>
              No new articles in the last 24 hours.
            </div>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div style={{ padding: showSplit ? "0 0 40px" : isMobile ? "0 0 100px" : "0 0 40px" }}>
            {items.map((item, i) => (
              <TodayItem
                key={item.url || i}
                item={item}
                isSelected={openItem?.url === item.url}
                isRead={readUrls.has(item.url)}
                compact={showSplit}
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

// ── TodayItem ──────────────────────────────────────────────────
function TodayItem({ item, isSelected, isRead, compact, onClick, T }) {
  const [hovered, setHovered] = useState(false);

  function relTime(dateStr) {
    if (!dateStr) return "";
    const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
    const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (m < 1)  return "Just now";
    if (m < 60) return `${m}m ago`;
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
        display: "flex", alignItems: "flex-start", gap: 16,
        padding: "16px 24px", cursor: "pointer",
        background: hovered ? T.surface : "transparent",
        borderBottom: `1px solid ${T.border}`,
        transition: "background .12s, opacity .15s",
        opacity: isRead ? 0.55 : 1,
      }}
    >
      {item.image && (
        <img src={item.image} alt="" style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} onError={e => { e.target.style.display = "none"; }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".06em" }}>
            {item.source}
          </span>
          {item.date && <span style={{ fontSize: 11, color: T.textTertiary }}>{relTime(item.date)}</span>}
          {isRead && <span style={{ fontSize: 10, color: T.accent, marginLeft: "auto" }}>✓ Read</span>}
        </div>
        <h3 style={{
          fontFamily: "var(--reader-font-family)", fontStyle: "italic",
          fontSize: 17, fontWeight: 600, color: T.text,
          margin: "0 0 5px", lineHeight: 1.3, letterSpacing: "-.01em",
        }}>
          {item.title}
        </h3>
        {item.description && (
          <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}
