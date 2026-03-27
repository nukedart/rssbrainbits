import { useState, useRef, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";

const FCOLS = { gray:"#8A9099", teal:"#accfae", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };
const SMART_COLORS = { blue:"#2F6FED", teal:"#accfae", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };

const Icons = {
  Inbox:    () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="1.5" width="13" height="13" rx="2.5"/><path d="M1.5 10h3l1.5 2.5h4L11.5 10h3"/></svg>),
  Today:    () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1.5v3M11 1.5v3M2 7h12"/></svg>),
  ReadLater:() => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 1.5"/></svg>),
  Notes:    () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h10a1 1 0 0 1 1 1v9l-3 3H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M11 12v3M11 12h3"/><path d="M5 6h6M5 9h4"/></svg>),
  Settings: () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.6 3.6l1.3 1.3M11.1 11.1l1.3 1.3M3.6 12.4l1.3-1.3M11.1 4.9l1.3-1.3"/></svg>),
  Sun:      () => (<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/></svg>),
  Moon:     () => (<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z"/></svg>),
  Plus:     () => (<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 1v10M1 6h10"/></svg>),
  Sources:  () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12"/><path d="M2 8h8"/><path d="M2 12h5"/><circle cx="13" cy="11" r="2.5"/><path d="M13 8.5v1M13 13.5v1"/></svg>),
  SmartFeed:() => (<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h12l-4 5v5l-4-2V8L2 3z"/></svg>),
  Edit:     () => (<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"/></svg>),
  Folder:   () => (<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 3.5h4.5l1.5 2h7v7.5h-13z"/></svg>),
  Chevron:  () => (<svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2l3 2.5L2 7"/></svg>),
};

const SHORTCUTS = [
  ["J / K","Navigate"],["O","Open"],["R","Read/unread"],
  ["/","Search"],["L","Save article"],["S","Star"],["A","Add feed"],["Esc","Close"],
];

// ── Feed favicon helper ───────────────────────────────────────
function feedFavicon(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`; }
  catch { return null; }
}

function feedDisplayName(feed) {
  return feed.name || (() => { try { return new URL(feed.url).hostname; } catch { return feed.url; } })();
}

// ── Top nav item (compact) ────────────────────────────────────
function NavItem({ id, Icon, label, badge, badgeColor, active, onNavigate, collapsed, T }) {
  const bc = badgeColor || T.accent;
  const isActive = active === id;
  return (
    <button
      onClick={() => onNavigate(id)}
      title={collapsed ? label : undefined}
      style={{
        display:"flex", alignItems:"center",
        gap: collapsed ? 0 : 9,
        padding: collapsed ? "7px 0" : "6px 10px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: 8, border:"none", cursor:"pointer",
        width:"100%", textAlign:"left",
        background: isActive ? T.surface : "transparent",
        fontFamily:"inherit", transition:"background .12s",
        position: "relative",
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background=T.surface; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background="transparent"; }}
    >
      <span style={{ color: isActive ? T.accent : T.textTertiary, display:"flex", flexShrink:0, position:"relative" }}>
        <Icon />
        {badge > 0 && collapsed && (
          <span style={{ position:"absolute", top:-3, right:-4, width:5, height:5, borderRadius:"50%", background: bc }} />
        )}
      </span>
      {!collapsed && (
        <>
          <span style={{ flex:1, fontSize:12.5, fontWeight: isActive ? 500 : 400, color: isActive ? T.accent : T.textSecondary, letterSpacing:"-.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {label}
          </span>
          {badge > 0 && (
            <span style={{ fontSize:10, fontWeight:700, color: badgeColor ? bc : (isActive ? T.accent : T.textTertiary), flexShrink:0 }}>
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}
    </button>
  );
}

// ── Individual feed row (nested under folder or uncategorized) ─
function FeedRow({ feed, unread, active, onNavigate, T, indent = 0 }) {
  const favicon = feedFavicon(feed.url);
  const isActive = active === `feed:${feed.id}`;
  const name = feedDisplayName(feed);

  return (
    <button
      draggable
      onDragStart={e => { e.dataTransfer.setData("feedId", feed.id); e.dataTransfer.effectAllowed = "move"; }}
      onClick={() => onNavigate(`feed:${feed.id}`)}
      title={name}
      style={{
        display:"flex", alignItems:"center", gap:6,
        padding: `4px 10px 4px ${10 + indent}px`,
        width:"100%", border:"none",
        background: isActive ? T.accentSurface : "transparent",
        cursor:"pointer", fontFamily:"inherit", textAlign:"left",
        borderRadius: 7, transition:"background .1s",
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background=T.surface; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background="transparent"; }}
    >
      {/* Favicon or dot */}
      <span style={{ width:14, height:14, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {favicon
          ? <img src={favicon} alt="" width={12} height={12} style={{ borderRadius:2, opacity:.8 }} onError={e => { e.target.style.display="none"; }} />
          : <span style={{ width:5, height:5, borderRadius:"50%", background:T.textTertiary, display:"block" }} />
        }
      </span>
      {/* Name */}
      <span style={{
        flex:1, fontSize:12.5,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        letterSpacing:"-.01em",
        color: isActive ? T.accent : unread > 0 ? T.text : T.textSecondary,
        fontWeight: unread > 0 ? 500 : 400,
      }}>
        {name}
      </span>
      {/* Unread count */}
      {unread > 0 && (
        <span style={{ fontSize:10, fontWeight:700, color: isActive ? T.accent : T.textTertiary, flexShrink:0 }}>
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

// ── Folder row with nested feeds ──────────────────────────────
function FolderSection({ folder, folderFeeds, feedUnreadCounts, active, onNavigate, expanded, onToggle, T, collapsed, onMoveFeedToFolder, onEditFolder }) {
  const [dragOver, setDragOver] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dot = FCOLS[folder.color] || "#8A9099";
  const folderUnread = folderFeeds.reduce((sum, f) => sum + (feedUnreadCounts[f.id] || 0), 0);
  const isActive = active === `folder:${folder.id}`;

  if (collapsed) {
    return (
      <button
        onClick={() => onNavigate(`folder:${folder.id}`)}
        title={folder.name}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={async e => { e.preventDefault(); const feedId = e.dataTransfer.getData("feedId"); if (feedId) await onMoveFeedToFolder?.(feedId, folder.id); setDragOver(false); }}
        style={{
          display:"flex", alignItems:"center", justifyContent:"center",
          width:"100%", padding:"7px 0", border:"none",
          background: isActive ? T.surface : dragOver ? T.accentSurface : "transparent",
          cursor:"pointer", position:"relative", borderRadius:8, transition:"background .1s",
          outline: dragOver ? `2px solid ${T.accent}` : "none",
        }}
      >
        <span style={{ width:8, height:8, borderRadius:2, background: dot, flexShrink:0 }} />
        {folderUnread > 0 && <span style={{ position:"absolute", top:4, right:8, width:5, height:5, borderRadius:"50%", background:T.accent }} />}
      </button>
    );
  }

  return (
    <div style={{ marginBottom:1 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={async e => { e.preventDefault(); const feedId = e.dataTransfer.getData("feedId"); if (feedId) await onMoveFeedToFolder?.(feedId, folder.id); setDragOver(false); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display:"flex", alignItems:"center", borderRadius:8,
          background: isActive ? T.accentSurface : dragOver ? T.surface2 : hovered ? T.surface : "transparent",
          outline: dragOver ? `1.5px dashed ${T.accent}` : "none",
          transition:"background .1s",
        }}
      >
        {/* Folder name — click to navigate */}
        <button
          onClick={() => onNavigate(`folder:${folder.id}`)}
          style={{ display:"flex", alignItems:"center", gap:7, flex:1, padding:"5px 6px 5px 10px", border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit", textAlign:"left", minWidth:0 }}
        >
          <span style={{ width:8, height:8, borderRadius:2, background:dot, flexShrink:0, marginTop:.5 }} />
          <span style={{
            flex:1, fontSize:13,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            letterSpacing:"-.01em",
            color: isActive ? T.accent : T.text,
            fontWeight: folderUnread > 0 ? 600 : 500,
          }}>
            {folder.name}
          </span>
          {/* Unread count — hidden on hover to make room for actions */}
          {folderUnread > 0 && !hovered && (
            <span style={{ fontSize:10, fontWeight:700, color: isActive ? T.accent : T.textTertiary, flexShrink:0, marginRight:2 }}>
              {folderUnread > 99 ? "99+" : folderUnread}
            </span>
          )}
        </button>
        {/* Edit button — visible on hover */}
        {hovered && onEditFolder && (
          <button
            onClick={e => { e.stopPropagation(); onEditFolder(folder); }}
            title="Edit folder"
            style={{ padding:"4px 4px", border:"none", background:"transparent", cursor:"pointer", color:T.textTertiary, display:"flex", alignItems:"center", flexShrink:0, transition:"color .1s" }}
            onMouseEnter={e => e.currentTarget.style.color=T.accent}
            onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
          >
            <Icons.Edit />
          </button>
        )}
        {/* Feed count badge on hover */}
        {hovered && (
          <span style={{ fontSize:9, fontWeight:700, color:T.textTertiary, flexShrink:0, paddingRight:2, letterSpacing:".01em" }}>
            {folderFeeds.length}
          </span>
        )}
        {/* Expand/collapse chevron */}
        <button
          onClick={e => { e.stopPropagation(); onToggle(folder.id); }}
          style={{ padding:"5px 8px 5px 4px", border:"none", background:"transparent", cursor:"pointer", color:T.textTertiary, display:"flex", alignItems:"center", flexShrink:0, transition:"color .1s" }}
          onMouseEnter={e => e.currentTarget.style.color=T.text}
          onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
        >
          <span style={{ display:"inline-block", transition:"transform .15s", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
            <Icons.Chevron />
          </span>
        </button>
      </div>

      {/* Nested feeds */}
      {expanded && folderFeeds.map(feed => (
        <FeedRow key={feed.id} feed={feed} unread={feedUnreadCounts[feed.id] || 0} active={active} onNavigate={onNavigate} indent={14} T={T} />
      ))}
    </div>
  );
}

// ── Smart feed row ────────────────────────────────────────────
function SmartRow({ sf, active, onNavigate, onEdit, collapsed, T }) {
  const isActive = active === `smart:${sf.id}`;
  const color = SMART_COLORS[sf.color] || T.accent;
  return (
    <div style={{ display:"flex", alignItems:"center", borderRadius:8, background: isActive?T.surface:"transparent", transition:"background .15s", marginBottom:1 }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background=T.surface; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background="transparent"; }}
    >
      <button
        onClick={() => onNavigate(`smart:${sf.id}`)}
        title={collapsed ? sf.name : undefined}
        style={{ display:"flex", alignItems:"center", gap:7, flex:1, padding: collapsed?"7px 6px":"5px 10px", border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit", textAlign:"left", minWidth:0, justifyContent: collapsed?"center":"flex-start" }}
      >
        <span style={{ width:7, height:7, borderRadius:"50%", background:color, flexShrink:0 }} />
        {!collapsed && (
          <span style={{ flex:1, fontSize:12.5, fontWeight:isActive?500:400, color:isActive?T.accent:T.textSecondary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:"-.01em" }}>
            {sf.name}
          </span>
        )}
      </button>
      {!collapsed && (
        <button onClick={e => { e.stopPropagation(); onEdit(sf); }}
          style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, display:"flex", padding:"5px 8px 5px 2px", opacity:0, transition:"opacity .1s", flexShrink:0 }}
          onMouseEnter={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.color=T.accent; }}
          onMouseLeave={e => { e.currentTarget.style.opacity="0"; e.currentTarget.style.color=T.textTertiary; }}
        ><Icons.Edit /></button>
      )}
    </div>
  );
}

// ── Section divider label ─────────────────────────────────────
function SectionLabel({ label, action, actionTitle, T }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"8px 10px 4px", flexShrink:0 }}>
      <span style={{ flex:1, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:T.textTertiary }}>{label}</span>
      {action && (
        <button onClick={action} title={actionTitle}
          style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, display:"flex", padding:"2px 3px", borderRadius:4, transition:"color .1s" }}
          onMouseEnter={e => e.currentTarget.style.color=T.accent}
          onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
        ><Icons.Plus /></button>
      )}
    </div>
  );
}

export default function Sidebar({ active, onNavigate, unreadCount=0, feedErrorCount=0, feedUnreadCounts={}, smartFeeds=[], onAddSmartFeed, onEditSmartFeed, folders=[], feeds=[], onAddFolder, onEditFolder, onMoveFeedToFolder, isOpen=true, onToggle, onAddSource }) {
  const { T, theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { isTablet, isMobile } = useBreakpoint();

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(() => new Set());
  const shortcutsRef = useRef(null);

  // Auto-expand all folders on first load
  useEffect(() => {
    if (folders.length > 0) {
      setExpandedFolders(prev => {
        if (prev.size >= folders.length) return prev;
        const next = new Set(prev);
        folders.forEach(f => next.add(f.id));
        return next;
      });
    }
  }, [folders]);

  useEffect(() => {
    if (!shortcutsOpen) return;
    const h = e => { if (shortcutsRef.current && !shortcutsRef.current.contains(e.target)) setShortcutsOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [shortcutsOpen]);

  function toggleFolder(id) {
    setExpandedFolders(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  if (isMobile) return null;

  const collapsed = isTablet || !isOpen;
  const W = collapsed ? 52 : 208;

  // Separate feeds into categorized and uncategorized
  const uncategorized = feeds.filter(f => !f.folder_id);

  const TOP_NAV = [
    { id:"inbox",     Icon:Icons.Inbox,     label:"All Items",   badge: unreadCount },
    { id:"today",     Icon:Icons.Today,     label:"Today",       badge: 0 },
    { id:"readlater", Icon:Icons.ReadLater, label:"Saved",       badge: 0 },
    { id:"notes",     Icon:Icons.Notes,     label:"Notes",       badge: 0 },
  ];

  return (
    <aside style={{
      width:W, flexShrink:0,
      background:T.bg,
      display:"flex", flexDirection:"column",
      height:"100dvh",
      userSelect:"none",
      overflow:"hidden",
      position:"relative",
      transition:"width .2s ease",
      borderRight: `1px solid ${T.border}`,
    }}>

      {/* ── Header ── */}
      <div style={{ padding: collapsed ? "14px 8px 8px" : "16px 12px 8px", display:"flex", alignItems:"center", justifyContent: collapsed?"center":"space-between", flexShrink:0 }}>
        {!collapsed ? (
          <div style={{ fontSize:16, fontWeight:700, color:T.text, fontFamily:"'Cormorant Garamond', Georgia, serif", fontStyle:"italic", letterSpacing:"-.02em", lineHeight:1.2, flex:1 }}>
            Feed Box
          </div>
        ) : (
          <div style={{ width:26, height:26, borderRadius:7, background:T.surface, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:13, color:T.accent, fontWeight:700 }}>F</span>
          </div>
        )}
        {!isTablet && !collapsed && (
          <button onClick={onToggle} title="Collapse sidebar"
            style={{ width:20, height:20, borderRadius:5, background:"transparent", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:T.textTertiary, fontSize:13, fontFamily:"inherit", transition:"all .12s" }}
            onMouseEnter={e => { e.currentTarget.style.color=T.text; }}
            onMouseLeave={e => { e.currentTarget.style.color=T.textTertiary; }}
          >‹</button>
        )}
        {!isTablet && collapsed && (
          <button onClick={onToggle} title="Expand sidebar"
            style={{ position:"absolute", right:4, top:16, width:20, height:20, borderRadius:5, background:"transparent", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:T.textTertiary, fontSize:13, fontFamily:"inherit", transition:"all .12s" }}
            onMouseEnter={e => { e.currentTarget.style.color=T.text; }}
            onMouseLeave={e => { e.currentTarget.style.color=T.textTertiary; }}
          >›</button>
        )}
      </div>

      {/* ── Top nav ── */}
      <nav style={{ padding: collapsed?"0 4px":"0 6px", display:"flex", flexDirection:"column", gap:1, flexShrink:0, marginBottom:4 }}>
        {TOP_NAV.map(({ id, Icon, label, badge }) => (
          <NavItem key={id} id={id} Icon={Icon} label={label}
            active={active} badge={badge}
            onNavigate={onNavigate} collapsed={collapsed} T={T}
          />
        ))}
      </nav>

      {/* ── Divider ── */}
      <div style={{ height:1, background:T.border, margin: collapsed?"0 8px":"0 10px", flexShrink:0 }} />

      {/* ── Feed tree (scrollable) ── */}
      <div style={{ flex:1, minHeight:0, overflowY:"auto", padding: collapsed?"4px":"4px 6px", display:"flex", flexDirection:"column" }}>

        {/* Feeds section header */}
        {!collapsed && (
          <div style={{ display:"flex", alignItems:"center", padding:"8px 4px 4px", flexShrink:0 }}>
            <span style={{ flex:1, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:T.textTertiary }}>Feeds</span>
            <button onClick={onAddFolder} title="New folder"
              style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, display:"flex", padding:"2px 4px", borderRadius:4, transition:"color .1s" }}
              onMouseEnter={e => e.currentTarget.style.color=T.accent}
              onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
            ><Icons.Folder /></button>
            <button onClick={onAddSource} title="Add feed"
              style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, display:"flex", padding:"2px 4px", borderRadius:4, transition:"color .1s" }}
              onMouseEnter={e => e.currentTarget.style.color=T.accent}
              onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
            ><Icons.Plus /></button>
          </div>
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
              onNavigate={onNavigate}
              expanded={expandedFolders.has(folder.id)}
              onToggle={toggleFolder}
              T={T}
              collapsed={collapsed}
              onMoveFeedToFolder={onMoveFeedToFolder}
              onEditFolder={onEditFolder}
            />
          );
        })}

        {/* Uncategorized feeds */}
        {uncategorized.length > 0 && (
          <>
            {!collapsed && folders.length > 0 && (
              <div style={{ height:1, background:T.border, margin:"6px 4px 4px", flexShrink:0 }} />
            )}
            {uncategorized.map(feed => (
              <FeedRow key={feed.id} feed={feed} unread={feedUnreadCounts[feed.id] || 0} active={active} onNavigate={onNavigate} T={T} />
            ))}
          </>
        )}

        {/* Smart feeds */}
        {smartFeeds.length > 0 && (
          <>
            {!collapsed && (
              <div style={{ display:"flex", alignItems:"center", padding:"8px 4px 4px", marginTop:4, flexShrink:0 }}>
                <span style={{ flex:1, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:T.textTertiary }}>Smart</span>
                <button onClick={onAddSmartFeed} title="New smart feed"
                  style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, display:"flex", padding:"2px 4px", borderRadius:4, transition:"color .1s" }}
                  onMouseEnter={e => e.currentTarget.style.color=T.accent}
                  onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
                ><Icons.Plus /></button>
              </div>
            )}
            {smartFeeds.map(sf => (
              <SmartRow key={sf.id} sf={sf} active={active} onNavigate={onNavigate} onEdit={onEditSmartFeed} collapsed={collapsed} T={T} />
            ))}
          </>
        )}

        {/* Empty state */}
        {!collapsed && feeds.length === 0 && folders.length === 0 && smartFeeds.length === 0 && (
          <div style={{ padding:"12px 10px", textAlign:"center" }}>
            <div style={{ fontSize:12, color:T.textTertiary, lineHeight:1.6, marginBottom:8 }}>No feeds yet</div>
            <button onClick={onAddSource}
              style={{ fontSize:12, color:T.accent, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}
            >+ Add your first feed</button>
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ height:1, background:T.border, margin: collapsed?"0 8px":"0 10px", flexShrink:0 }} />

      {/* ── Bottom bar ── */}
      <div style={{ padding: collapsed?"8px 4px 12px":"8px 6px 12px", flexShrink:0, display:"flex", flexDirection:"column", gap:1 }}>

        {/* Sources (manage-feeds) with error badge */}
        <NavItem
          id="manage-feeds" Icon={Icons.Sources} label="Sources"
          badge={feedErrorCount} badgeColor="#e53e3e"
          active={active} onNavigate={onNavigate} collapsed={collapsed} T={T}
        />

        {/* Add Source */}
        <button
          onClick={onAddSource}
          title={collapsed ? "Add Source" : undefined}
          style={{
            display:"flex", alignItems:"center", justifyContent:"center",
            gap:6, width:"100%", marginTop:4,
            padding: collapsed?"7px 0":"8px 0",
            borderRadius:100, border:`1.5px solid ${T.accent}`,
            background:T.accentSurface, cursor:"pointer",
            color:T.accent, fontFamily:"inherit",
            fontSize:11.5, fontWeight:600, letterSpacing:".01em",
            transition:"background .15s, color .15s, box-shadow .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background=T.accent; e.currentTarget.style.color="#fff"; e.currentTarget.style.boxShadow=`0 2px 10px ${T.accent}44`; }}
          onMouseLeave={e => { e.currentTarget.style.background=T.accentSurface; e.currentTarget.style.color=T.accent; e.currentTarget.style.boxShadow="none"; }}
        >
          <Icons.Plus />
          {!collapsed && <span>Add Source</span>}
        </button>

        {/* Theme toggle */}
        <div style={{ display:"flex", gap:3, marginTop:6, justifyContent: collapsed?"center":"flex-start", padding: collapsed?"0":"0 2px" }}>
          {[{Icon:Icons.Sun,id:"light",label:"Light"},{Icon:Icons.Moon,id:"distilled",label:"Dark"}].map(({Icon,id,label}) => {
            const isActive = theme === id || (id === "distilled" && theme === "nocturne");
            return (
              <button key={label} onClick={() => setTheme(id)} title={label}
                style={{ flex: collapsed?undefined:1, width: collapsed?24:undefined, height:22, padding:"2px 0", borderRadius:6, border:`1px solid ${isActive?T.accent:T.border}`, background:isActive?T.accentSurface:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:isActive?T.accent:T.textTertiary, transition:"all .15s" }}
              ><Icon /></button>
            );
          })}
        </div>

        {/* Admin panel link — only shown to admin users */}
        {user?.user_metadata?.is_admin && (
          <button
            onClick={() => onNavigate("analytics")}
            title={collapsed ? "Admin" : undefined}
            style={{
              display:"flex", alignItems:"center", gap: collapsed?0:7,
              justifyContent: collapsed?"center":"flex-start",
              padding: collapsed?"6px 0":"6px 10px", borderRadius:8, border:"none",
              background: active==="analytics" ? T.surface : "transparent",
              cursor:"pointer", fontFamily:"inherit", transition:"background .15s", width:"100%",
            }}
            onMouseEnter={e => { if (active!=="analytics") e.currentTarget.style.background=T.surface; }}
            onMouseLeave={e => { if (active!=="analytics") e.currentTarget.style.background="transparent"; }}
          >
            <span style={{ fontSize:13, lineHeight:1, flexShrink:0, opacity: active==="analytics"?1:0.5 }}>⚙</span>
            {!collapsed && (
              <span style={{ fontSize:11.5, fontWeight:600, color: active==="analytics"?T.accent:T.textSecondary }}>
                Admin
              </span>
            )}
          </button>
        )}

        {/* Settings / avatar row */}
        <div style={{ display:"flex", alignItems:"center", gap:3, marginTop:2 }}>
          <button onClick={() => onNavigate("settings")}
            title={collapsed ? "Settings" : undefined}
            style={{ display:"flex", alignItems:"center", gap: collapsed?0:8, justifyContent: collapsed?"center":"flex-start", padding: collapsed?"6px 0":"7px 10px", borderRadius:8, border:"none", background:active==="settings"?T.surface:"transparent", cursor:"pointer", flex:1, fontFamily:"inherit", transition:"background .15s", minWidth:0 }}
            onMouseEnter={e => { if (active!=="settings") e.currentTarget.style.background=T.surface; }}
            onMouseLeave={e => { if (active!=="settings") e.currentTarget.style.background="transparent"; }}
          >
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} alt="" style={{ width:22, height:22, borderRadius:"50%", flexShrink:0 }} />
              : <span style={{ color:active==="settings"?T.accent:T.textTertiary, display:"flex", flexShrink:0 }}><Icons.Settings /></span>
            }
            {!collapsed && (
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11.5, fontWeight:500, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {user?.user_metadata?.user_name || user?.user_metadata?.full_name || "Settings"}
                </div>
              </div>
            )}
          </button>
          {!collapsed && (
            <button onClick={() => setShortcutsOpen(v => !v)} title="Keyboard shortcuts"
              style={{ width:24, height:24, borderRadius:6, border:`1px solid ${shortcutsOpen?T.accent:T.border}`, background:shortcutsOpen?T.accentSurface:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:shortcutsOpen?T.accent:T.textTertiary, fontSize:11, fontFamily:"inherit", flexShrink:0, transition:"all .12s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.color=T.accent; e.currentTarget.style.background=T.accentSurface; }}
              onMouseLeave={e => { if (!shortcutsOpen) { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.textTertiary; e.currentTarget.style.background="transparent"; }}}
            >⌘</button>
          )}
        </div>

        {/* Shortcuts popup */}
        {!collapsed && (
          <div ref={shortcutsRef} style={{ position:"relative" }}>
            {shortcutsOpen && (
              <div style={{ position:"fixed", bottom:100, left:12, width:200, background:T.card, border:`1px solid ${T.borderStrong}`, borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,.18)", zIndex:2000, overflow:"hidden", animation:"slideUp .15s ease" }}>
                <div style={{ padding:"10px 14px 7px", borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:".06em" }}>Shortcuts</div>
                </div>
                <div style={{ padding:"5px 0 5px" }}>
                  {SHORTCUTS.map(([key,action]) => (
                    <div key={key} style={{ display:"flex", alignItems:"center", gap:10, padding:"5px 14px" }}>
                      <kbd style={{ display:"inline-block", minWidth:40, textAlign:"center", padding:"2px 6px", background:T.surface2, border:`1px solid ${T.border}`, borderRadius:5, fontSize:10, fontFamily:"monospace", color:T.text, flexShrink:0 }}>{key}</kbd>
                      <span style={{ fontSize:12, color:T.textSecondary }}>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
