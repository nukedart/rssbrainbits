import { useState, useEffect, useRef, useMemo, memo } from "react";
import { useTheme } from "../hooks/useTheme";

const FCOLS = { gray:"#8A9099", teal:"#accfae", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };
const SMART_COLORS = { blue:"#2F6FED", teal:"#accfae", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };

function feedFavicon(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; }
  catch { return null; }
}
function feedDisplayName(feed) {
  return feed.name || (() => { try { return new URL(feed.url).hostname; } catch { return feed.url; } })();
}

const FeedRow = memo(function FeedRow({ feed, unread, active, onNavigate, T }) {
  const favicon = feedFavicon(feed.url);
  const isActive = active === `feed:${feed.id}`;
  const name = feedDisplayName(feed);
  return (
    <button
      onClick={() => onNavigate(`feed:${feed.id}`)}
      aria-label={name}
      aria-current={isActive ? "page" : undefined}
      style={{
        display:"flex", alignItems:"center", gap:12,
        padding:"10px 20px",
        width:"100%", border:"none",
        background: isActive ? T.accentSurface : "transparent",
        cursor:"pointer", fontFamily:"inherit", textAlign:"left",
        WebkitTapHighlightColor:"transparent",
        transition:"background .1s",
      }}
    >
      {/* Large favicon — 36px rounded rect */}
      <span style={{
        width:36, height:36, flexShrink:0, borderRadius:8,
        overflow:"hidden", background: T.surface2,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        {favicon
          ? <img src={favicon} alt="" width={36} height={36} loading="lazy" decoding="async" style={{ borderRadius:8, display:"block" }} onError={e => { e.target.style.display="none"; }} />
          : <span style={{ fontSize:15, fontWeight:700, color:T.textTertiary }}>{name[0]?.toUpperCase()}</span>
        }
      </span>
      <span style={{
        flex:1, fontSize:16,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        color: isActive ? T.accent : unread > 0 ? T.text : T.textSecondary,
        fontWeight: unread > 0 ? 600 : 400, letterSpacing:"-.015em",
      }}>{name}</span>
      {unread > 0 && (
        <span style={{ fontSize:13, fontWeight:600, color: isActive ? T.accent : T.textTertiary, flexShrink:0 }}>
          {unread > 999 ? "999+" : unread}
        </span>
      )}
    </button>
  );
}, (prev, next) =>
  (prev.active === `feed:${prev.feed.id}`) === (next.active === `feed:${next.feed.id}`) &&
  prev.unread === next.unread && prev.feed === next.feed && prev.T === next.T
);

function FolderSection({ folder, folderFeeds, feedUnreadCounts, active, onNavigate, expanded, onToggle, T }) {
  const dot = FCOLS[folder.color] || "#8A9099";
  const folderUnread = folderFeeds.reduce((sum, f) => sum + (feedUnreadCounts[f.id] || 0), 0);
  const isActive = active === `folder:${folder.id}`;

  return (
    <div style={{ marginBottom:1 }}>
      <div style={{ display:"flex", alignItems:"center", background: isActive ? T.accentSurface : "transparent", transition:"background .1s" }}>
        <button
          onClick={() => onNavigate(`folder:${folder.id}`)}
          aria-label={folder.name}
          aria-current={isActive ? "page" : undefined}
          style={{ display:"flex", alignItems:"center", gap:10, flex:1, padding:"11px 10px 11px 20px", border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit", textAlign:"left", WebkitTapHighlightColor:"transparent" }}
        >
          <span style={{ width:10, height:10, borderRadius:3, background:dot, flexShrink:0 }} />
          <span style={{
            flex:1, fontSize:16,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            color: isActive ? T.accent : T.text,
            fontWeight: folderUnread > 0 ? 700 : 600,
            letterSpacing:"-.01em",
          }}>{folder.name}</span>
          {folderUnread > 0 && (
            <span style={{ fontSize:12, fontWeight:700, color: isActive ? T.accent : T.textTertiary, flexShrink:0 }}>
              {folderUnread > 99 ? "99+" : folderUnread}
            </span>
          )}
        </button>
        <button
          onClick={() => onToggle(folder.id)}
          aria-label={expanded ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
          aria-expanded={expanded}
          style={{ padding:"11px 16px", border:"none", background:"transparent", cursor:"pointer", color:T.textTertiary, display:"flex", alignItems:"center", WebkitTapHighlightColor:"transparent" }}
        >
          <svg width="11" height="11" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ display:"inline-block", transition:"transform .18s", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
            <path d="M2 2l3 2.5L2 7"/>
          </svg>
        </button>
      </div>
      {expanded && folderFeeds.map(feed => (
        <div key={feed.id} style={{ paddingLeft: 16 }}>
          <FeedRow feed={feed} unread={feedUnreadCounts[feed.id] || 0} active={active} onNavigate={onNavigate} T={T} />
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ label, action, actionTitle, T }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"14px 20px 6px", flexShrink:0 }}>
      <span style={{ flex:1, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:T.textTertiary }}>{label}</span>
      {action && (
        <button onClick={action} title={actionTitle} aria-label={actionTitle}
          style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, padding:"2px 4px", WebkitTapHighlightColor:"transparent" }}
        >
          <svg width="15" height="15" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 1v10M1 6h10"/></svg>
        </button>
      )}
    </div>
  );
}

export default function MobileFeedDrawer({
  active, onNavigate, onClose,
  feedUnreadCounts = {},
  smartFeeds = [], onAddSmartFeed, onEditSmartFeed,
  folders = [], feeds = [],
  onAddFolder, onMoveFeedToFolder,
  onAddSource,
}) {
  const { T } = useTheme();
  const [expandedFolders, setExpandedFolders] = useState(() => new Set());
  const sheetRef = useRef(null);
  // Drag-to-dismiss state
  const dragRef = useRef({ startY: 0, dragging: false });
  const [dragY, setDragY] = useState(0);

  function toggleFolder(id) {
    setExpandedFolders(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function navigate(page) {
    onNavigate(page);
    onClose();
  }

  // Drag handle: pull down to dismiss
  function onHandleTouchStart(e) {
    dragRef.current = { startY: e.touches[0].clientY, dragging: true };
  }
  function onHandleTouchMove(e) {
    if (!dragRef.current.dragging) return;
    const dy = e.touches[0].clientY - dragRef.current.startY;
    if (dy > 0) setDragY(dy);
  }
  function onHandleTouchEnd() {
    dragRef.current.dragging = false;
    if (dragY > 80) { onClose(); }
    setDragY(0);
  }

  const uncategorized = useMemo(() => feeds.filter(f => !f.folder_id), [feeds]);
  const totalUnread = useMemo(() => Object.values(feedUnreadCounts).reduce((s, n) => s + n, 0), [feedUnreadCounts]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:"fixed", inset:0, zIndex:900,
          background:"rgba(0,0,0,.45)",
          backdropFilter:"blur(3px)",
          WebkitBackdropFilter:"blur(3px)",
          animation:"fadeIn .18s ease",
        }}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Feed list"
        style={{
          position:"fixed", bottom:0, left:0, right:0, zIndex:901,
          height:"78vh",
          background:T.card,
          display:"flex", flexDirection:"column",
          borderRadius:"20px 20px 0 0",
          boxShadow:"0 -8px 48px rgba(0,0,0,.25)",
          animation:"slideInUp .25s cubic-bezier(.22,.68,0,1.12)",
          transform: dragY > 0 ? `translateY(${dragY}px)` : "none",
          transition: dragY > 0 ? "none" : "transform .22s cubic-bezier(.22,.68,0,1)",
          paddingBottom:"env(safe-area-inset-bottom, 20px)",
        }}
      >

        {/* Drag handle */}
        <div
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
          style={{
            padding:"12px 0 8px",
            display:"flex", justifyContent:"center",
            cursor:"grab", flexShrink:0,
            WebkitTapHighlightColor:"transparent",
            touchAction: "pan-x",
          }}
        >
          <div style={{ width:40, height:4, borderRadius:2, background:T.textTertiary, opacity:.35 }} />
        </div>

        {/* Header */}
        <div style={{
          display:"flex", alignItems:"center",
          padding:"2px 20px 8px",
          flexShrink:0,
        }}>
          <span style={{ fontSize:22, fontWeight:800, color:T.text, flex:1, letterSpacing:"-.03em" }}>Feeds</span>
          <button
            onClick={onAddSource}
            style={{
              background:"none", border:"none", padding:"4px",
              cursor:"pointer", color:T.textTertiary,
              display:"flex", alignItems:"center",
              WebkitTapHighlightColor:"transparent",
              transition:"color .12s",
            }}
            onTouchStart={e => { e.currentTarget.style.color = T.text; }}
            onTouchEnd={e => { e.currentTarget.style.color = T.textTertiary; }}
            onTouchCancel={e => { e.currentTarget.style.color = T.textTertiary; }}
            onMouseEnter={e => { e.currentTarget.style.color = T.text; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.textTertiary; }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 4v12M4 10h12"/></svg>
          </button>
        </div>

        {/* Total unread row */}
        {totalUnread > 0 && (
          <button
            onClick={() => navigate("all")}
            style={{
              display:"flex", alignItems:"center",
              padding:"10px 20px",
              width:"100%", border:"none",
              background: active === "all" ? T.accentSurface : "transparent",
              cursor:"pointer", fontFamily:"inherit", textAlign:"left",
              WebkitTapHighlightColor:"transparent",
              transition:"background .1s",
              flexShrink:0,
            }}
          >
            <span style={{ flex:1, fontSize:17, fontWeight:700, color: active === "all" ? T.accent : T.text, letterSpacing:"-.02em" }}>
              All Unread
            </span>
            <span style={{ fontSize:17, fontWeight:600, color: active === "all" ? T.accent : T.textSecondary }}>
              {totalUnread > 9999 ? "9999+" : totalUnread.toLocaleString()}
            </span>
          </button>
        )}

        {/* Saved row */}
        <button
          onClick={() => navigate("readlater")}
          style={{
            display:"flex", alignItems:"center",
            padding:"10px 20px",
            width:"100%", border:"none",
            background: active === "readlater" ? T.accentSurface : "transparent",
            cursor:"pointer", fontFamily:"inherit", textAlign:"left",
            WebkitTapHighlightColor:"transparent",
            transition:"background .1s",
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

        {/* Quick-nav: pages not in the bottom pill */}
        <div style={{ display:"flex", gap:8, padding:"0 16px 12px", flexShrink:0 }}>
          {[
            { id:"history",   label:"History"  },
            { id:"analytics", label:"Stats"    },
            { id:"settings",  label:"Settings" },
          ].map(({ id, label }) => {
            const isActive = active === id;
            return (
              <button key={id} onClick={() => navigate(id)} style={{
                flex:1, padding:"9px 0", borderRadius:10,
                background: isActive ? T.accentSurface : T.surface,
                border:`1px solid ${isActive ? T.accent+"44" : T.border}`,
                color: isActive ? T.accent : T.textSecondary,
                fontSize:13, fontWeight: isActive ? 700 : 500,
                cursor:"pointer", fontFamily:"inherit",
                WebkitTapHighlightColor:"transparent",
              }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Feed tree — scrollable */}
        <div style={{ flex:1, overflowY:"auto", minHeight:0, borderTop:`1px solid ${T.border}` }}>
          {(folders.length > 0 || feeds.length > 0) && (
            <SectionLabel label="Sources" action={onAddFolder} actionTitle="New folder" T={T} />
          )}

          {folders.map(folder => {
            const folderFeeds = feeds.filter(f => f.folder_id === folder.id);
            return (
              <FolderSection
                key={folder.id}
                folder={folder}
                folderFeeds={folderFeeds}
                feedUnreadCounts={feedUnreadCounts}
                active={active}
                onNavigate={navigate}
                expanded={expandedFolders.has(folder.id)}
                onToggle={toggleFolder}
                T={T}
              />
            );
          })}

          {uncategorized.map(feed => (
            <FeedRow key={feed.id} feed={feed} unread={feedUnreadCounts[feed.id] || 0} active={active} onNavigate={navigate} T={T} />
          ))}

          <>
              <SectionLabel label="Smart Feeds" action={onAddSmartFeed} actionTitle="New smart feed" T={T} />
              {/* Built-in: Catch up (old unread articles) */}
              <button
                onClick={() => navigate("catch-up")}
                style={{
                  display:"flex", alignItems:"center", gap:12,
                  padding:"12px 20px",
                  width:"100%", border:"none",
                  background: active === "catch-up" ? T.accentSurface : "transparent",
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
          </>

        </div>
      </div>

    </>
  );
}
