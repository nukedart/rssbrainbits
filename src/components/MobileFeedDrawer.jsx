import { useState, useEffect, useRef, useMemo, memo } from "react";
import { useTheme } from "../hooks/useTheme";
import { SHAPE } from "../lib/tokens";
import { getCachedFeed } from "../lib/feedCache";
import { getSaved } from "../lib/supabase";

const FCOLS = { gray:"#8A9099", teal:"#accfae", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };
const SMART_COLORS = { blue:"#2F6FED", teal:"#accfae", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };

function feedFavicon(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; }
  catch { return null; }
}
function feedDisplayName(feed) {
  return feed.name || (() => { try { return new URL(feed.url).hostname; } catch { return feed.url; } })();
}

const FEED_SWIPE_THRESHOLD = 76;
const haptic = (ms = 8) => { try { navigator.vibrate?.(ms); } catch {} };

const FeedRow = memo(function FeedRow({ feed, count, active, onNavigate, onMarkAllRead, onUnsubscribeFeed, T }) {
  const favicon = feedFavicon(feed.url);
  const isActive = active === `feed:${feed.id}`;
  const name = feedDisplayName(feed);
  const rowRef = useRef(null);
  const hintRef = useRef(null);
  const hintLabelRef = useRef(null);
  const touch = useRef(null);

  function onTouchStart(e) {
    touch.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, locked: false, dx: 0, committed: false };
  }
  function onTouchMove(e) {
    const tc = touch.current;
    if (!tc) return;
    const dx = e.touches[0].clientX - tc.startX;
    const dy = e.touches[0].clientY - tc.startY;
    if (!tc.locked) {
      if (Math.abs(dy) > Math.abs(dx) + 6) { touch.current = null; return; }
      if (Math.abs(dx) > 6) tc.locked = true;
    }
    if (!tc.locked) return;
    const clamped = Math.max(-FEED_SWIPE_THRESHOLD * 1.4, Math.min(FEED_SWIPE_THRESHOLD * 1.4, dx));
    tc.dx = clamped;
    if (Math.abs(clamped) > FEED_SWIPE_THRESHOLD && !tc.committed) { tc.committed = true; haptic(); }
    else if (Math.abs(clamped) <= FEED_SWIPE_THRESHOLD) { tc.committed = false; }
    if (rowRef.current) rowRef.current.style.transform = `translateX(${clamped}px)`;
    if (hintRef.current) {
      const prog = Math.min(Math.abs(clamped) / FEED_SWIPE_THRESHOLD, 1);
      hintRef.current.style.opacity = prog;
      hintRef.current.style.display = Math.abs(clamped) > 8 ? "flex" : "none";
      hintRef.current.style.justifyContent = clamped < 0 ? "flex-end" : "flex-start";
      hintRef.current.style.background = clamped < 0 ? `${T.success}33` : `${T.danger}33`;
      if (hintLabelRef.current) {
        hintLabelRef.current.textContent = clamped < 0 ? "Mark read" : "Unsubscribe";
        hintLabelRef.current.style.color = clamped < 0 ? T.success : T.danger;
      }
    }
  }
  function onTouchEnd() {
    const tc = touch.current;
    touch.current = null;
    if (tc && tc.locked && tc.dx < -FEED_SWIPE_THRESHOLD) onMarkAllRead?.(feed);
    if (tc && tc.locked && tc.dx > FEED_SWIPE_THRESHOLD) {
      if (window.confirm(`Unsubscribe from "${name}"?`)) onUnsubscribeFeed?.(feed.id);
    }
    if (rowRef.current) {
      rowRef.current.style.transition = "transform .18s ease";
      rowRef.current.style.transform = "translateX(0)";
      setTimeout(() => { if (rowRef.current) rowRef.current.style.transition = ""; }, 200);
    }
    if (hintRef.current) hintRef.current.style.display = "none";
  }

  return (
    <div style={{ position:"relative", overflow:"hidden", borderRadius: SHAPE.radiusSm }}>
      <div ref={hintRef} style={{
        position:"absolute", inset:0, display:"none", alignItems:"center", justifyContent:"flex-end",
        padding:"0 20px", pointerEvents:"none",
        background:`${T.success}33`, borderRadius: SHAPE.radiusSm,
      }}>
        <span ref={hintLabelRef} style={{ fontSize:12, fontWeight:700, color:T.success }}>Mark read</span>
      </div>
      <button
        ref={rowRef}
        onClick={() => onNavigate(`feed:${feed.id}`)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        aria-label={name}
        aria-current={isActive ? "page" : undefined}
        style={{
          display:"flex", alignItems:"center", gap:12,
          padding:"10px 20px",
          width:"100%", border:"none",
          background: isActive ? T.accentSurface : "transparent",
          borderRadius: SHAPE.radiusSm,
          cursor:"pointer", fontFamily:"inherit", textAlign:"left",
          WebkitTapHighlightColor:"transparent",
          transition:"background .1s",
          touchAction:"pan-y",
        }}
      >
        {/* Favicon — 28px rounded rect */}
        <span style={{
          width:28, height:28, flexShrink:0, borderRadius:7,
          overflow:"hidden", background: T.surface2,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          {favicon
            ? <img src={favicon} alt="" width={28} height={28} loading="lazy" decoding="async" style={{ borderRadius:7, display:"block" }} onError={e => { e.target.style.display="none"; }} />
            : <span style={{ fontSize:13, fontWeight:700, color:T.textTertiary }}>{name[0]?.toUpperCase()}</span>
          }
        </span>
        <span style={{
          flex:1, fontSize:16,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          color: isActive ? T.accent : T.text,
          fontWeight: 500, letterSpacing:"-.015em",
        }}>{name}</span>
        {count > 0 && (
          <span style={{ fontSize:13, fontWeight:600, color: isActive ? T.accent : T.textTertiary, flexShrink:0 }}>
            {count > 999 ? "999+" : count}
          </span>
        )}
      </button>
    </div>
  );
}, (prev, next) =>
  (prev.active === `feed:${prev.feed.id}`) === (next.active === `feed:${next.feed.id}`) &&
  prev.count === next.count && prev.feed === next.feed && prev.T === next.T
);

function FolderRow({ folder, count, active, onNavigate, T }) {
  const isActive = active === `folder:${folder.id}`;
  return (
    <button
      onClick={() => onNavigate(`folder:${folder.id}`)}
      aria-label={folder.name}
      aria-current={isActive ? "page" : undefined}
      style={{
        display:"flex", alignItems:"center", gap:10,
        padding:"11px 20px",
        width:"100%", border:"none",
        background: isActive ? T.accentSurface : "transparent",
        borderRadius: SHAPE.radiusSm,
        cursor:"pointer", fontFamily:"inherit", textAlign:"left",
        WebkitTapHighlightColor:"transparent",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink:0, color: isActive ? T.accent : T.textTertiary }}>
        <path d="M2 2l3 2.5L2 7"/>
      </svg>
      <span style={{
        flex:1, fontSize:16,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        color: isActive ? T.accent : T.text,
        fontWeight: 600, letterSpacing:"-.01em",
      }}>{folder.name}</span>
      {count > 0 && (
        <span style={{ fontSize:13, fontWeight:600, color: isActive ? T.accent : T.textTertiary, flexShrink:0 }}>
          {count > 999 ? "999+" : count}
        </span>
      )}
    </button>
  );
}

function SectionLabel({ label, action, actionTitle, expanded, onToggleCollapse, T }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"14px 20px 6px", flexShrink:0 }}>
      <span style={{ flex:1, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:T.textTertiary }}>{label}</span>
      {onToggleCollapse && (
        <button onClick={onToggleCollapse} aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`} aria-expanded={expanded}
          style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, padding:"2px 4px", display:"flex", alignItems:"center", WebkitTapHighlightColor:"transparent" }}
        >
          <svg width="11" height="11" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ display:"inline-block", transition:"transform .18s", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
            <path d="M2 2l3 2.5L2 7"/>
          </svg>
        </button>
      )}
      {!onToggleCollapse && action && (
        <button onClick={action} title={actionTitle} aria-label={actionTitle}
          style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, padding:"2px 4px", WebkitTapHighlightColor:"transparent" }}
        >
          <svg width="15" height="15" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 1v10M1 6h10"/></svg>
        </button>
      )}
    </div>
  );
}

const TABS = [
  { key:"starred", label:"Starred" },
  { key:"unread", label:"Unread" },
  { key:"all", label:"All" },
];

function TabIcon({ tabKey, color }) {
  if (tabKey === "starred") return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L10 2.5z"/>
    </svg>
  );
  if (tabKey === "unread") return (
    <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill={color} /></svg>
  );
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h12M4 10h12M4 14h8"/></svg>
  );
}

export default function MobileFeedDrawer({
  active, onNavigate, onClose,
  feedUnreadCounts = {},
  smartFeeds = [], onAddSmartFeed, onEditSmartFeed,
  folders = [], feeds = [],
  onAddFolder, onMoveFeedToFolder,
  onAddSource, onMarkAllRead, onUnsubscribeFeed,
  user = null,
}) {
  const { T } = useTheme();
  const [activeTab, setActiveTab] = useState("unread");
  const [expandedSection, setExpandedSection] = useState({ folders:true, feeds:true });
  const [savedItems, setSavedItems] = useState([]);

  function toggleSection(key) {
    setExpandedSection(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function navigate(page) {
    onNavigate(page);
    onClose();
  }

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getSaved(user.id).then(rows => { if (!cancelled) setSavedItems(rows || []); }).catch(() => { if (!cancelled) setSavedItems([]); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const timeLabel = useMemo(() => "Today at " + new Date().toLocaleTimeString([], { hour:"numeric", minute:"2-digit" }), []);
  const uncategorized = useMemo(() => feeds.filter(f => !f.folder_id), [feeds]);
  const totalUnread = useMemo(() => Object.values(feedUnreadCounts).reduce((s, n) => s + n, 0), [feedUnreadCounts]);

  const allItemCounts = useMemo(() => {
    const m = {};
    feeds.forEach(f => { const cached = getCachedFeed(f.url); m[f.id] = cached?.data?.items?.length || 0; });
    return m;
  }, [feeds]);
  const totalAllItems = useMemo(() => Object.values(allItemCounts).reduce((s, n) => s + n, 0), [allItemCounts]);

  const savedCountsByFeed = useMemo(() => {
    const m = {};
    feeds.forEach(f => {
      const name = feedDisplayName(f).trim().toLowerCase();
      m[f.id] = savedItems.filter(s => (s.source || "").trim().toLowerCase() === name).length;
    });
    return m;
  }, [feeds, savedItems]);

  const feedCounts = activeTab === "unread" ? feedUnreadCounts : activeTab === "all" ? allItemCounts : savedCountsByFeed;

  const folderCounts = useMemo(() => {
    const m = {};
    folders.forEach(folder => {
      const folderFeeds = feeds.filter(f => f.folder_id === folder.id);
      m[folder.id] = folderFeeds.reduce((s, f) => s + (feedCounts[f.id] || 0), 0);
    });
    return m;
  }, [folders, feeds, feedCounts]);

  const summary = activeTab === "unread"
    ? { label:"Unread", count: totalUnread, page:"all" }
    : activeTab === "starred"
    ? { label:"Starred", count: savedItems.length, page:"readlater" }
    : { label:"All Items", count: totalAllItems, page:"all" };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Feeds"
      style={{
        position:"fixed", inset:0, zIndex:900,
        background:T.bg,
        display:"flex", flexDirection:"column",
        animation:"fadeIn .18s ease",
      }}
    >
      {/* Top bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 12px 0", flexShrink:0 }}>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ background:"none", border:"none", padding:"6px", cursor:"pointer", color:T.text, display:"flex", alignItems:"center", WebkitTapHighlightColor:"transparent" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <button
          onClick={onAddSource}
          aria-label="Add source"
          style={{ background:"none", border:"none", padding:"6px", cursor:"pointer", color:T.text, display:"flex", alignItems:"center", WebkitTapHighlightColor:"transparent" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 4v12M4 10h12"/></svg>
        </button>
      </div>

      {/* Header block */}
      <div style={{ textAlign:"center", padding:"4px 20px 14px", flexShrink:0 }}>
        <div style={{ fontSize:28, fontWeight:800, color:T.text, letterSpacing:"-.02em" }}>Feeds</div>
        <div style={{ fontSize:13, color:T.textTertiary, marginTop:4 }}>{timeLabel}</div>
      </div>

      {/* Summary row */}
      {summary.count > 0 && (
        <button
          onClick={() => navigate(summary.page)}
          style={{
            display:"flex", alignItems:"center",
            padding:"10px 20px",
            width:"100%", border:"none",
            background: active === summary.page ? T.accentSurface : "transparent",
            borderRadius: SHAPE.radiusSm,
            cursor:"pointer", fontFamily:"inherit", textAlign:"left",
            WebkitTapHighlightColor:"transparent",
            flexShrink:0,
          }}
        >
          <span style={{ flex:1, fontSize:17, fontWeight:700, color: active === summary.page ? T.accent : T.text, letterSpacing:"-.02em" }}>
            {summary.label}
          </span>
          <span style={{ fontSize:17, fontWeight:600, color: active === summary.page ? T.accent : T.textSecondary }}>
            {summary.count > 9999 ? "9999+" : summary.count.toLocaleString()}
          </span>
        </button>
      )}

      {/* Archive / Saved row */}
      {activeTab === "all" ? (
        <button
          onClick={() => navigate("history")}
          style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"10px 20px",
            width:"100%", border:"none",
            background: active === "history" ? T.accentSurface : "transparent",
            borderRadius: SHAPE.radiusSm,
            cursor:"pointer", fontFamily:"inherit", textAlign:"left",
            WebkitTapHighlightColor:"transparent",
            flexShrink:0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: active === "history" ? T.accent : T.textTertiary, flexShrink:0 }}>
            <rect x="2.5" y="4" width="15" height="3.5" rx="1"/>
            <path d="M3.5 7.5v7a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-7"/>
            <path d="M8 11h4"/>
          </svg>
          <span style={{ flex:1, fontSize:17, fontWeight: active === "history" ? 700 : 500, color: active === "history" ? T.accent : T.textSecondary, letterSpacing:"-.02em" }}>
            Archive
          </span>
        </button>
      ) : (
        <button
          onClick={() => navigate("readlater")}
          style={{
            display:"flex", alignItems:"center",
            padding:"10px 20px",
            width:"100%", border:"none",
            background: active === "readlater" ? T.accentSurface : "transparent",
            borderRadius: SHAPE.radiusSm,
            cursor:"pointer", fontFamily:"inherit", textAlign:"left",
            WebkitTapHighlightColor:"transparent",
            flexShrink:0,
          }}
        >
          <span style={{ flex:1, fontSize:17, fontWeight: active === "readlater" ? 700 : 500, color: active === "readlater" ? T.accent : T.textSecondary, letterSpacing:"-.02em" }}>
            Saved
          </span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill={active === "readlater" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: active === "readlater" ? T.accent : T.textTertiary, flexShrink:0 }}>
            <path d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1.5.87L8 11.5l-4.5 2.37A1 1 0 0 1 2 13V3a1 1 0 0 1 1-1z"/>
          </svg>
        </button>
      )}

      {/* Scrollable content */}
      <div style={{ flex:1, overflowY:"auto", minHeight:0, overscrollBehavior:"contain", borderTop:`1px solid ${T.border}` }}>
        {folders.length > 0 && (
          <>
            <SectionLabel label="Folders" expanded={expandedSection.folders} onToggleCollapse={() => toggleSection("folders")} T={T} />
            {expandedSection.folders && folders.map(folder => (
              <FolderRow key={folder.id} folder={folder} count={folderCounts[folder.id] || 0} active={active} onNavigate={navigate} T={T} />
            ))}
          </>
        )}

        {uncategorized.length > 0 && (
          <>
            <SectionLabel label="Feeds" expanded={expandedSection.feeds} onToggleCollapse={() => toggleSection("feeds")} T={T} />
            {expandedSection.feeds && uncategorized.map(feed => (
              <FeedRow key={feed.id} feed={feed} count={feedCounts[feed.id] || 0} active={active} onNavigate={navigate} onMarkAllRead={onMarkAllRead} onUnsubscribeFeed={onUnsubscribeFeed} T={T} />
            ))}
          </>
        )}

        <SectionLabel label="Smart Feeds" action={onAddSmartFeed} actionTitle="New smart feed" T={T} />
        <button
          onClick={() => navigate("catch-up")}
          style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"12px 20px",
            width:"100%", border:"none",
            background: active === "catch-up" ? T.accentSurface : "transparent",
            borderRadius: SHAPE.radiusSm,
            cursor:"pointer", fontFamily:"inherit", textAlign:"left",
            WebkitTapHighlightColor:"transparent",
          }}
        >
          <span style={{ width:9, height:9, borderRadius:"50%", background: active === "catch-up" ? T.accent : T.textTertiary, flexShrink:0, opacity: active === "catch-up" ? 1 : 0.6 }} />
          <span style={{ flex:1, fontSize:15, color: active === "catch-up" ? T.accent : T.textSecondary, fontWeight: active === "catch-up" ? 700 : 500, letterSpacing:"-.01em" }}>
            Catch up
          </span>
        </button>
        {smartFeeds.map(sf => {
          const color = SMART_COLORS[sf.color] || T.accent;
          const isActive = active === `smart:${sf.id}`;
          return (
            <button
              key={sf.id}
              onClick={() => navigate(`smart:${sf.id}`)}
              style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"12px 20px",
                width:"100%", border:"none",
                background: isActive ? T.accentSurface : "transparent",
                borderRadius: SHAPE.radiusSm,
                cursor:"pointer", fontFamily:"inherit", textAlign:"left",
                WebkitTapHighlightColor:"transparent",
              }}
            >
              <span style={{ width:9, height:9, borderRadius:"50%", background:color, flexShrink:0 }} />
              <span style={{ flex:1, fontSize:15, color: isActive ? T.accent : T.textSecondary, fontWeight: isActive ? 700 : 500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:"-.01em" }}>
                {sf.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom segmented control */}
      <div style={{
        flexShrink:0, display:"flex", justifyContent:"center", gap:8,
        padding:"10px 16px", paddingBottom:"env(safe-area-inset-bottom, 20px)",
        borderTop:`1px solid ${T.border}`,
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const color = isActive ? T.accent : T.textTertiary;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={isActive}
              style={{
                display:"flex", alignItems:"center", gap:6,
                padding: isActive ? "6px 14px" : "6px 10px",
                borderRadius: SHAPE.radiusPill,
                background: isActive ? T.accentSurface : "transparent",
                border:"none", cursor:"pointer", color,
                WebkitTapHighlightColor:"transparent",
              }}
            >
              <TabIcon tabKey={tab.key} color={color} />
              {isActive && (
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:".04em", textTransform:"uppercase" }}>{tab.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
