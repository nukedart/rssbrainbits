import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

const FCOLS = { gray:"#8A9099", teal:"#accfae", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };
const SMART_COLORS = { blue:"#2F6FED", teal:"#accfae", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };

function feedFavicon(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`; }
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
        display:"flex", alignItems:"center", gap:8,
        padding:"10px 16px 10px 32px",
        width:"100%", border:"none",
        background: isActive ? T.accentSurface : "transparent",
        cursor:"pointer", fontFamily:"inherit", textAlign:"left",
        WebkitTapHighlightColor:"transparent",
      }}
    >
      <span style={{ width:16, height:16, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {favicon
          ? <img src={favicon} alt="" width={14} height={14} style={{ borderRadius:2, opacity:.8 }} onError={e => { e.target.style.display="none"; }} />
          : <span style={{ width:5, height:5, borderRadius:"50%", background:T.textTertiary, display:"block" }} />
        }
      </span>
      <span style={{
        flex:1, fontSize:14,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        color: isActive ? T.accent : unread > 0 ? T.text : T.textSecondary,
        fontWeight: unread > 0 ? 500 : 400,
      }}>{name}</span>
      {unread > 0 && (
        <span style={{ fontSize:11, fontWeight:700, color: isActive ? T.accent : T.textTertiary, flexShrink:0 }}>
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
    <div style={{ marginBottom:2 }}>
      <div style={{ display:"flex", alignItems:"center", background: isActive ? T.accentSurface : "transparent" }}>
        <button
          onClick={() => onNavigate(`folder:${folder.id}`)}
          style={{ display:"flex", alignItems:"center", gap:8, flex:1, padding:"10px 8px 10px 16px", border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit", textAlign:"left", WebkitTapHighlightColor:"transparent" }}
        >
          <span style={{ width:9, height:9, borderRadius:2, background:dot, flexShrink:0 }} />
          <span style={{
            flex:1, fontSize:15,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            color: isActive ? T.accent : T.text,
            fontWeight: folderUnread > 0 ? 600 : 500,
          }}>{folder.name}</span>
          {folderUnread > 0 && (
            <span style={{ fontSize:11, fontWeight:700, color: isActive ? T.accent : T.textTertiary, flexShrink:0 }}>
              {folderUnread > 99 ? "99+" : folderUnread}
            </span>
          )}
        </button>
        <button
          onClick={() => onToggle(folder.id)}
          style={{ padding:"10px 14px", border:"none", background:"transparent", cursor:"pointer", color:T.textTertiary, display:"flex", alignItems:"center", WebkitTapHighlightColor:"transparent" }}
        >
          <svg width="10" height="10" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            style={{ display:"inline-block", transition:"transform .15s", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
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
    <div style={{ display:"flex", alignItems:"center", padding:"12px 16px 6px", flexShrink:0 }}>
      <span style={{ flex:1, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:T.textTertiary }}>{label}</span>
      {action && (
        <button onClick={action} title={actionTitle}
          style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, padding:"2px 4px", WebkitTapHighlightColor:"transparent" }}
        >
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 1v10M1 6h10"/></svg>
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
        display:"flex", alignItems:"center", gap:12,
        padding:"11px 16px",
        width:"100%", border:"none",
        background: isActive ? T.surface : "transparent",
        cursor:"pointer", fontFamily:"inherit", textAlign:"left",
        borderRadius:0, WebkitTapHighlightColor:"transparent",
      }}
    >
      <span style={{ color: isActive ? T.accent : T.textTertiary, display:"flex", flexShrink:0 }}>{icon}</span>
      <span style={{ flex:1, fontSize:15, fontWeight: isActive ? 600 : 400, color: isActive ? T.accent : T.textSecondary }}>
        {label}
      </span>
      {badge > 0 && (
        <span style={{ fontSize:12, fontWeight:700, color: isActive ? T.accent : T.textTertiary, flexShrink:0 }}>
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

  // Expand any newly-added folder
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

  const uncategorized = feeds.filter(f => !f.folder_id);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:"fixed", inset:0, zIndex:900,
          background:"rgba(0,0,0,.4)",
          backdropFilter:"blur(2px)",
          WebkitBackdropFilter:"blur(2px)",
          animation:"fadeIn .15s ease",
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position:"fixed", top:0, left:0, bottom:0, zIndex:901,
        width:300, maxWidth:"85vw",
        background:T.card,
        display:"flex", flexDirection:"column",
        boxShadow:"4px 0 32px rgba(0,0,0,.2)",
        animation:"slideInLeft .2s cubic-bezier(.22,.68,0,1.2)",
        overflowY:"auto",
        paddingBottom:"env(safe-area-inset-bottom, 20px)",
      }}>

        {/* Header */}
        <div style={{
          display:"flex", alignItems:"center",
          padding:"16px 16px 12px",
          paddingTop:"max(16px, env(safe-area-inset-top, 16px))",
          borderBottom:`1px solid ${T.border}`,
          flexShrink:0,
        }}>
          <span style={{ fontSize:16, fontWeight:700, color:T.text, flex:1, letterSpacing:"-.02em" }}>Feeds</span>
          <button
            onClick={onClose}
            style={{
              background:T.surface2, border:"none", borderRadius:8,
              width:30, height:30, cursor:"pointer",
              color:T.textSecondary, fontSize:18,
              display:"flex", alignItems:"center", justifyContent:"center",
              WebkitTapHighlightColor:"transparent",
            }}
          >×</button>
        </div>

        {/* Top navigation */}
        <div style={{ flexShrink:0, paddingTop:6 }}>
          <NavRow id="inbox"     label="All Items" badge={unreadCount} active={active} onNavigate={navigate} T={T} icon={
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="1.5" width="13" height="13" rx="2.5"/><path d="M1.5 10h3l1.5 2.5h4L11.5 10h3"/></svg>
          }/>
          <NavRow id="today"     label="Today"     badge={0}          active={active} onNavigate={navigate} T={T} icon={
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1.5v3M11 1.5v3M2 7h12"/></svg>
          }/>
          <NavRow id="readlater" label="Saved"      badge={0}          active={active} onNavigate={navigate} T={T} icon={
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 1.5"/></svg>
          }/>
          <NavRow id="notes"     label="Notes"      badge={0}          active={active} onNavigate={navigate} T={T} icon={
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h10a1 1 0 0 1 1 1v9l-3 3H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M11 12v3M11 12h3"/><path d="M5 6h6M5 9h4"/></svg>
          }/>
        </div>

        <div style={{ height:1, background:T.border, margin:"8px 0", flexShrink:0 }} />

        {/* Feed tree */}
        <div style={{ flex:1, overflowY:"auto", minHeight:0 }}>
          {(folders.length > 0 || feeds.length > 0) && (
            <SectionLabel label="Feeds" action={onAddFolder} actionTitle="New folder" T={T} />
          )}

          {/* Folders */}
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

          {/* Uncategorized feeds */}
          {uncategorized.map(feed => (
            <FeedRow key={feed.id} feed={feed} unread={feedUnreadCounts[feed.id] || 0} active={active} onNavigate={navigate} T={T} />
          ))}

          {/* Smart Feeds */}
          {smartFeeds.length > 0 && (
            <>
              <div style={{ height:1, background:T.border, margin:"8px 0" }} />
              <SectionLabel label="Smart Feeds" action={onAddSmartFeed} actionTitle="New smart feed" T={T} />
              {smartFeeds.map(sf => {
                const color = SMART_COLORS[sf.color] || T.accent;
                const isActive = active === `smart:${sf.id}`;
                return (
                  <button
                    key={sf.id}
                    onClick={() => navigate(`smart:${sf.id}`)}
                    style={{
                      display:"flex", alignItems:"center", gap:10,
                      padding:"10px 16px",
                      width:"100%", border:"none",
                      background: isActive ? T.surface : "transparent",
                      cursor:"pointer", fontFamily:"inherit", textAlign:"left",
                      WebkitTapHighlightColor:"transparent",
                    }}
                  >
                    <span style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 }} />
                    <span style={{ flex:1, fontSize:14, color: isActive ? T.accent : T.textSecondary, fontWeight: isActive ? 500 : 400, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {sf.name}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div style={{ height:1, background:T.border, flexShrink:0 }} />

        {/* Footer */}
        <div style={{ flexShrink:0, paddingTop:4 }}>
          <NavRow id="manage-feeds" label="Sources" badge={0} active={active} onNavigate={navigate} T={T} icon={
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12"/><path d="M2 8h8"/><path d="M2 12h5"/><circle cx="13" cy="11" r="2.5"/></svg>
          }/>
          <NavRow id="settings" label="Settings" badge={0} active={active} onNavigate={navigate} T={T} icon={
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.6 3.6l1.3 1.3M11.1 11.1l1.3 1.3M3.6 12.4l1.3-1.3M11.1 4.9l1.3-1.3"/></svg>
          }/>
          <button
            onClick={() => { onAddSource(); onClose(); }}
            style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"11px 16px", margin:"6px 12px 8px",
              border:"none", borderRadius:10,
              background:T.accent, color:T.accentText,
              cursor:"pointer", fontFamily:"inherit",
              fontSize:14, fontWeight:600, width:"calc(100% - 24px)",
              WebkitTapHighlightColor:"transparent",
              justifyContent:"center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 1v10M1 6h10"/></svg>
            Add Source
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
