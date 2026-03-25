import { useState, useEffect, useRef } from "react";
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

function FeedRow({ feed, unread, active, onNavigate, T }) {
  const favicon = feedFavicon(feed.url);
  const isActive = active === `feed:${feed.id}`;
  const name = feedDisplayName(feed);
  return (
    <button
      onClick={() => onNavigate(`feed:${feed.id}`)}
      style={{
        display:"flex", alignItems:"center", gap:10,
        padding:"11px 20px 11px 36px",
        width:"100%", border:"none",
        background: isActive ? T.accentSurface : "transparent",
        cursor:"pointer", fontFamily:"inherit", textAlign:"left",
        WebkitTapHighlightColor:"transparent",
        transition:"background .1s",
      }}
    >
      <span style={{ width:18, height:18, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {favicon
          ? <img src={favicon} alt="" width={16} height={16} style={{ borderRadius:3, opacity:.85 }} onError={e => { e.target.style.display="none"; }} />
          : <span style={{ width:6, height:6, borderRadius:"50%", background:T.textTertiary, display:"block" }} />
        }
      </span>
      <span style={{
        flex:1, fontSize:15,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        color: isActive ? T.accent : unread > 0 ? T.text : T.textSecondary,
        fontWeight: unread > 0 ? 600 : 400, letterSpacing:"-.01em",
      }}>{name}</span>
      {unread > 0 && (
        <span style={{ fontSize:12, fontWeight:700, color: isActive ? T.accent : T.textTertiary, flexShrink:0 }}>
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

function FolderSection({ folder, folderFeeds, feedUnreadCounts, active, onNavigate, expanded, onToggle, T }) {
  const dot = FCOLS[folder.color] || "#8A9099";
  const folderUnread = folderFeeds.reduce((sum, f) => sum + (feedUnreadCounts[f.id] || 0), 0);
  const isActive = active === `folder:${folder.id}`;

  return (
    <div style={{ marginBottom:1 }}>
      <div style={{ display:"flex", alignItems:"center", background: isActive ? T.accentSurface : "transparent", transition:"background .1s" }}>
        <button
          onClick={() => onNavigate(`folder:${folder.id}`)}
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
          style={{ padding:"11px 16px", border:"none", background:"transparent", cursor:"pointer", color:T.textTertiary, display:"flex", alignItems:"center", WebkitTapHighlightColor:"transparent" }}
        >
          <svg width="11" height="11" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ display:"inline-block", transition:"transform .18s", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
            <path d="M2 2l3 2.5L2 7"/>
          </svg>
        </button>
      </div>
      {expanded && folderFeeds.map(feed => (
        <FeedRow key={feed.id} feed={feed} unread={feedUnreadCounts[feed.id] || 0} active={active} onNavigate={onNavigate} T={T} />
      ))}
    </div>
  );
}

function SectionLabel({ label, action, actionTitle, T }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"14px 20px 6px", flexShrink:0 }}>
      <span style={{ flex:1, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:T.textTertiary }}>{label}</span>
      {action && (
        <button onClick={action} title={actionTitle}
          style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, padding:"2px 4px", WebkitTapHighlightColor:"transparent" }}
        >
          <svg width="15" height="15" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 1v10M1 6h10"/></svg>
        </button>
      )}
    </div>
  );
}

function NavRow({ id, label, icon, badge, active, onNavigate, T }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onNavigate(id)}
      style={{
        display:"flex", alignItems:"center", gap:14,
        padding:"13px 20px",
        width:"100%", border:"none",
        background: isActive ? T.accentSurface : "transparent",
        cursor:"pointer", fontFamily:"inherit", textAlign:"left",
        WebkitTapHighlightColor:"transparent",
        transition:"background .1s",
      }}
    >
      <span style={{ color: isActive ? T.accent : T.textTertiary, display:"flex", flexShrink:0 }}>{icon}</span>
      <span style={{ flex:1, fontSize:16, fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : T.text, letterSpacing:"-.01em" }}>
        {label}
      </span>
      {badge > 0 && (
        <span style={{ fontSize:13, fontWeight:700, color: isActive ? T.accent : T.textTertiary, flexShrink:0 }}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

export default function MobileFeedDrawer({
  active, onNavigate, onClose,
  unreadCount = 0, feedUnreadCounts = {},
  smartFeeds = [], onAddSmartFeed, onEditSmartFeed,
  folders = [], feeds = [],
  onAddFolder, onMoveFeedToFolder,
  onAddSource,
}) {
  const { T } = useTheme();
  const [expandedFolders, setExpandedFolders] = useState(() => new Set(folders.map(f => f.id)));
  const sheetRef = useRef(null);
  // Drag-to-dismiss state
  const dragRef = useRef({ startY: 0, dragging: false });
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      folders.forEach(f => next.add(f.id));
      return next;
    });
  }, [folders]);

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

  const uncategorized = feeds.filter(f => !f.folder_id);

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
          }}
        >
          <div style={{ width:40, height:4, borderRadius:2, background:T.textTertiary, opacity:.35 }} />
        </div>

        {/* Header */}
        <div style={{
          display:"flex", alignItems:"center",
          padding:"2px 20px 12px",
          flexShrink:0,
        }}>
          <span style={{ fontSize:20, fontWeight:800, color:T.text, flex:1, letterSpacing:"-.025em" }}>My Feeds</span>
          <button
            onClick={onAddSource}
            style={{
              background:T.accent, border:"none", borderRadius:10,
              padding:"7px 14px", cursor:"pointer",
              color:"#fff", fontSize:13, fontWeight:700,
              display:"flex", alignItems:"center", gap:6,
              WebkitTapHighlightColor:"transparent",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 1v10M1 6h10"/></svg>
            Add
          </button>
        </div>

        {/* Top nav rows */}
        <div style={{ flexShrink:0, borderTop:`1px solid ${T.border}` }}>
          <NavRow id="inbox" label="All Items" badge={unreadCount} active={active} onNavigate={navigate} T={T} icon={
            <svg width="19" height="19" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="1.5" width="13" height="13" rx="2.5"/><path d="M1.5 10h3l1.5 2.5h4L11.5 10h3"/></svg>
          }/>
          <NavRow id="today" label="Today" badge={0} active={active} onNavigate={navigate} T={T} icon={
            <svg width="19" height="19" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1.5v3M11 1.5v3M2 7h12"/></svg>
          }/>
          <NavRow id="readlater" label="Saved" badge={0} active={active} onNavigate={navigate} T={T} icon={
            <svg width="19" height="19" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14l-4-3-4 3V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/></svg>
          }/>
          <NavRow id="notes" label="Notes" badge={0} active={active} onNavigate={navigate} T={T} icon={
            <svg width="19" height="19" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h10a1 1 0 0 1 1 1v9l-3 3H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M11 12v3M11 12h3"/><path d="M5 6h6M5 9h4"/></svg>
          }/>
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

          {smartFeeds.length > 0 && (
            <>
              <SectionLabel label="Smart Feeds" action={onAddSmartFeed} actionTitle="New smart feed" T={T} />
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
          )}

          {/* Settings row at the bottom */}
          <div style={{ height:1, background:T.border, margin:"8px 0" }} />
          <NavRow id="settings" label="Settings" badge={0} active={active} onNavigate={navigate} T={T} icon={
            <svg width="19" height="19" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.6 3.6l1.3 1.3M11.1 11.1l1.3 1.3M3.6 12.4l1.3-1.3M11.1 4.9l1.3-1.3"/></svg>
          }/>
        </div>
      </div>

      <style>{`
        @keyframes slideInUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
