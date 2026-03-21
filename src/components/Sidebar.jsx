import { useState, useRef, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";

const APP_VERSION = "1.27.0"; // keep in sync with package.json

const Icons = {
  Inbox:    () => (<svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="1.5" width="13" height="13" rx="2.5"/><path d="M1.5 10h3l1.5 2.5h4L11.5 10h3"/></svg>),
  Today:    () => (<svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1.5v3M11 1.5v3M2 7h12"/></svg>),
  Unread:   () => (<svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none"/></svg>),
  ReadLater:() => (<svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 1.5"/></svg>),
  History:  () => (<svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 8a5.5 5.5 0 1 0 1-3.2"/><path d="M2.5 3v2.5H5"/><path d="M8 5.5v3l1.5 1.5"/></svg>),
  Notes:    () => (<svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h10a1 1 0 0 1 1 1v9l-3 3H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M11 12v3M11 12h3"/><path d="M5 6h6M5 9h4"/></svg>),
  Settings: () => (<svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.6 3.6l1.3 1.3M11.1 11.1l1.3 1.3M3.6 12.4l1.3-1.3M11.1 4.9l1.3-1.3"/></svg>),
  Sun:      () => (<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/></svg>),
  Moon:     () => (<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z"/></svg>),
  Plus:     () => (<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 1v10M1 6h10"/></svg>),
  Edit:     () => (<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"/></svg>),
  Stats:    () => (<svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="9" width="3" height="6" rx="1"/><rect x="6" y="5" width="3" height="10" rx="1"/><rect x="11" y="1" width="3" height="14" rx="1"/></svg>),
  Folder:   () => (<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 3.5h4.5l1.5 2h7v7.5h-13z"/></svg>),
  SmartFeed:() => (<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h12l-4 5v5l-4-2V8L2 3z"/></svg>),
};

const SMART_COLORS = { blue:"#2F6FED", teal:"#accfae", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };
const FCOLS        = { gray:"#8A9099", teal:"#accfae", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };

// Home icon — sun rays
const HomeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="2.8"/>
    <path d="M8 1v1.8M8 13.2V15M1 8h1.8M13.2 8H15M2.8 2.8l1.3 1.3M11.9 11.9l1.3 1.3M2.8 13.2l1.3-1.3M11.9 4.1l1.3-1.3"/>
  </svg>
);

const NAV = [
  { id:"home",      Icon:HomeIcon,        label:"Home"      },
  { id:"inbox",     Icon:Icons.Inbox,     label:"Inbox"     },
  { id:"readlater", Icon:Icons.ReadLater, label:"Read Later"},
  { id:"notes",     Icon:Icons.Notes,     label:"Notes"     },
  { id:"stats",     Icon:Icons.Stats,     label:"Stats"     },
];

const SHORTCUTS = [
  ["J / K","Navigate"],["O","Open"],["R","Read/unread"],
  ["L","Read later"],["S","Star"],["A","Add feed"],["F","Focus search"],["Esc","Close"],
];

// ── Single nav row — works in both expanded and collapsed state ──
function NavRow({ id, Icon, label, active, badge, onNavigate, collapsed, T }) {
  return (
    <button
      onClick={() => onNavigate(id)}
      title={collapsed ? label : undefined}
      style={{
        display:"flex", alignItems:"center",
        gap: collapsed ? 0 : 10,
        padding: collapsed ? "8px 0" : "8px 12px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius:10, border:"none", cursor:"pointer",
        width:"100%", textAlign:"left",
        background: active ? T.surface : "transparent",
        fontFamily:"inherit", transition:"background .15s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background=T.surface; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background="transparent"; }}
    >
      <span style={{ color: active ? T.accent : T.textTertiary, display:"flex", flexShrink:0, position:"relative" }}>
        <Icon />
        {badge > 0 && collapsed && (
          <span style={{ position:"absolute", top:-3, right:-4, width:5, height:5, borderRadius:"50%", background:T.accent }} />
        )}
      </span>
      {!collapsed && (
        <span style={{ flex:1, fontSize:13, fontWeight: active?500:400, color: active?T.accent:T.textSecondary, letterSpacing:"-.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {label}
        </span>
      )}
      {!collapsed && badge > 0 && (
        <span style={{ fontSize:10, fontWeight:700, color: active?T.accent:T.textTertiary }}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({ active, onNavigate, unreadCount=0, smartFeeds=[], onAddSmartFeed, onEditSmartFeed, folders=[], feeds=[], onAddFolder, onEditFolder, isOpen=true, onToggle }) {
  const { T, isDark, theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { isTablet, isMobile } = useBreakpoint();

  // All hooks before any conditional return
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(() => new Set());
  const [sidebarDragOver, setSidebarDragOver] = useState(null); // folderId being dragged over in sidebar

  // Auto-expand all collections on first load
  useEffect(() => {
    if (folders.length > 0) {
      setExpandedFolders(prev => {
        const next = new Set(prev);
        folders.forEach(f => next.add(f.id));
        return next;
      });
    }
  }, [folders]);
  const shortcutsRef = useRef(null);

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

  // collapsed = icons only (56px), expanded = icons + labels (220px)
  const collapsed = isTablet || !isOpen;
  const W = collapsed ? 56 : 200;

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
    }}>

      {/* ── Branding header ── */}
      <div style={{ padding: collapsed ? "16px 8px 10px" : "20px 16px 10px", display:"flex", alignItems:"flex-start", justifyContent: collapsed?"center":"space-between", flexShrink:0 }}>
        {!collapsed ? (
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:17, fontWeight:700, color:T.text, fontFamily:"'Newsreader', Georgia, serif", fontStyle:"italic", letterSpacing:"-.02em", lineHeight:1.2 }}>
              Feed Box
            </div>
            <div style={{ fontSize:9, fontWeight:600, color:T.textTertiary, textTransform:"uppercase", letterSpacing:".1em", marginTop:2 }}>
              Distilled Workspace
            </div>
          </div>
        ) : (
          <div style={{ width:28, height:28, borderRadius:8, background:T.surface, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:14, color:T.accent, fontWeight:700 }}>F</span>
          </div>
        )}
        {!isTablet && !collapsed && (
          <button
            onClick={onToggle}
            title="Collapse sidebar"
            style={{
              width:22, height:22, borderRadius:6, flexShrink:0, marginTop:2,
              background:"transparent", border:"none",
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              color:T.textTertiary, fontSize:14, fontFamily:"inherit",
              transition:"all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color=T.text; }}
            onMouseLeave={e => { e.currentTarget.style.color=T.textTertiary; }}
          >‹</button>
        )}
        {!isTablet && collapsed && (
          <button
            onClick={onToggle}
            title="Expand sidebar"
            style={{
              position:"absolute", right:6, top:20,
              width:22, height:22, borderRadius:6,
              background:"transparent", border:"none",
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              color:T.textTertiary, fontSize:14, fontFamily:"inherit",
              transition:"all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color=T.text; }}
            onMouseLeave={e => { e.currentTarget.style.color=T.textTertiary; }}
          >›</button>
        )}
      </div>

      <div style={{ height: collapsed?4:6, flexShrink:0 }} />
      {/* ── Main nav ── */}
      <nav style={{ padding: collapsed?"0 6px":"0 8px", display:"flex", flexDirection:"column", gap:1, flexShrink:0 }}>
        {NAV.map(({ id, Icon, label }) => (
          <NavRow key={id} id={id} Icon={Icon} label={label}
            active={active===id} badge={id==="inbox"?unreadCount:0}
            onNavigate={onNavigate} collapsed={collapsed} T={T}
          />
        ))}
      </nav>

      {/* ── Collections (smart feeds + folders unified) ── */}
      <div style={{ padding: collapsed?"8px 6px 4px":"12px 8px 4px", flex:1, minHeight:0, overflowY:"auto", display:"flex", flexDirection:"column" }}>
        {/* Section header */}
        {!collapsed && (
          <div style={{ display:"flex", alignItems:"center", padding:"0 10px 6px", flexShrink:0 }}>
            <span style={{ flex:1, fontSize:9, fontWeight:600, textTransform:"uppercase", letterSpacing:".1em", color:T.textTertiary }}>Collections</span>
            {/* Add folder button */}
            <button onClick={onAddFolder} title="New collection"
              style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, display:"flex", padding:"2px 3px", borderRadius:4, transition:"color .1s" }}
              onMouseEnter={e => e.currentTarget.style.color=T.accent}
              onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
            ><Icons.Folder /></button>
            {/* Add smart feed button */}
            <button onClick={onAddSmartFeed} title="New smart feed"
              style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, display:"flex", padding:"2px 3px", borderRadius:4, transition:"color .1s", marginLeft:2 }}
              onMouseEnter={e => e.currentTarget.style.color=T.accent}
              onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
            ><Icons.SmartFeed /></button>
          </div>
        )}
        {collapsed && (
          <button onClick={onAddFolder} title="New collection"
            style={{ display:"flex", alignItems:"center", justifyContent:"center", width:"100%", padding:"6px 0", background:"none", border:"none", cursor:"pointer", color:T.textTertiary, transition:"color .1s", marginBottom:2 }}
            onMouseEnter={e => e.currentTarget.style.color=T.accent}
            onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
          ><Icons.Plus /></button>
        )}

        {/* Smart feeds */}
        {smartFeeds.map(sf => {
          const isActive = active===`smart:${sf.id}`;
          return (
            <div key={sf.id} style={{ display:"flex", alignItems:"center", borderRadius:10, background: isActive?T.surface:"transparent", transition:"background .15s", marginBottom:1, flexShrink:0 }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background=T.surface; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background="transparent"; }}
            >
              <button
                onClick={() => onNavigate(`smart:${sf.id}`)}
                title={collapsed ? sf.name : undefined}
                style={{ display:"flex", alignItems:"center", gap:8, flex:1, padding: collapsed?"7px 6px":"6px 10px", border:"none", cursor:"pointer", background:"transparent", fontFamily:"inherit", textAlign:"left", minWidth:0 }}
              >
                <span style={{ color: isActive ? T.accent : T.textTertiary, display:"flex", flexShrink:0 }}><Icons.SmartFeed /></span>
                {!collapsed && (
                  <span style={{ flex:1, fontSize:13, fontWeight:isActive?500:400, color:isActive?T.accent:T.textSecondary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:"-.01em" }}>{sf.name}</span>
                )}
              </button>
              {!collapsed && (
                <button onClick={e => { e.stopPropagation(); onEditSmartFeed(sf); }}
                  title="Edit smart feed"
                  style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, display:"flex", padding:"6px 8px 6px 2px", opacity:0, transition:"opacity .1s", flexShrink:0 }}
                  onMouseEnter={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.color=T.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity="0"; e.currentTarget.style.color=T.textTertiary; }}
                ><Icons.Edit /></button>
              )}
            </div>
          );
        })}

        {/* Folders */}
        {folders.map(folder => {
          const dot = FCOLS[folder.color] || "#8A9099";
          const isExpanded = expandedFolders.has(folder.id);
          const folderFeeds = feeds.filter(f => f.folder_id === folder.id);
          return (
            <div key={folder.id} style={{ marginBottom:1, flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", borderRadius:10, transition:"background .15s", background: sidebarDragOver===folder.id ? T.accentSurface : "transparent", outline: sidebarDragOver===folder.id ? `1.5px solid ${T.accent}` : "none" }}
                onMouseEnter={e => { if (!collapsed && sidebarDragOver!==folder.id) e.currentTarget.style.background=T.surface; }}
                onMouseLeave={e => { if (sidebarDragOver!==folder.id) e.currentTarget.style.background="transparent"; }}
                onDragOver={e => { e.preventDefault(); setSidebarDragOver(folder.id); }}
                onDragLeave={() => setSidebarDragOver(null)}
                onDrop={async e => {
                  e.preventDefault();
                  const feedId = e.dataTransfer.getData("feedId");
                  if (feedId && onMoveFeedToFolder) await onMoveFeedToFolder(feedId, folder.id);
                  setSidebarDragOver(null);
                }}
              >
                <button onClick={() => !collapsed && toggleFolder(folder.id)}
                  title={collapsed ? folder.name : undefined}
                  style={{ display:"flex", alignItems:"center", gap:8, flex:1, padding: collapsed?"7px 6px":"6px 10px", border:"none", cursor:collapsed?"default":"pointer", background:"transparent", fontFamily:"inherit", textAlign:"left", minWidth:0 }}
                >
                  <span style={{ color:T.textTertiary, display:"flex", flexShrink:0 }}><Icons.Folder /></span>
                  {!collapsed && (
                    <>
                      <span style={{ flex:1, fontSize:13, fontWeight:500, color:T.textSecondary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:"-.01em" }}>
                        {folder.name}
                        {folderFeeds.length > 0 && <span style={{ fontSize:10, color:T.textTertiary, marginLeft:5, fontWeight:400 }}>{folderFeeds.length}</span>}
                      </span>
                      <span style={{ fontSize:8, color:T.textTertiary, transition:"transform .15s", transform:isExpanded?"rotate(90deg)":"rotate(0deg)", display:"inline-block", flexShrink:0, marginRight:2 }}>▶</span>
                    </>
                  )}
                </button>
                {!collapsed && (
                  <button onClick={e => { e.stopPropagation(); onEditFolder(folder); }}
                    title="Edit collection"
                    style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, display:"flex", padding:"6px 8px 6px 2px", opacity:0, transition:"opacity .1s", flexShrink:0 }}
                    onMouseEnter={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.color=T.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity="0"; e.currentTarget.style.color=T.textTertiary; }}
                  ><Icons.Edit /></button>
                )}
              </div>
              {!collapsed && isExpanded && folderFeeds.map(f => (
                <div key={f.id}
                  draggable
                  onDragStart={e => { e.dataTransfer.setData("feedId", f.id); e.dataTransfer.effectAllowed = "move"; }}
                  style={{ padding:"3px 10px 3px 30px", fontSize:12, color:T.textTertiary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"grab", borderRadius:6 }}
                  onMouseEnter={e => e.currentTarget.style.background=T.surface2}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}
                  title="Drag to move to another folder"
                >
                  ⠿ {f.name || (() => { try { return new URL(f.url).hostname; } catch { return f.url; } })()}
                </div>
              ))}
            </div>
          );
        })}

        {/* Empty state */}
        {!collapsed && smartFeeds.length === 0 && folders.length === 0 && (
          <div style={{ padding:"2px 10px" }}>
            <button onClick={onAddFolder}
              style={{ background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:12, color:T.textTertiary, padding:"3px 0", textAlign:"left", lineHeight:1.5, width:"100%", transition:"color .1s" }}
              onMouseEnter={e => e.currentTarget.style.color=T.accent}
              onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
            >+ New collection</button>
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div style={{ padding: collapsed?"8px 6px":"8px 12px 12px", flexShrink:0 }}>

        {/* Theme toggle — Light ↔ Distilled */}
        <div style={{ display:"flex", gap:3, marginBottom:8, justifyContent: collapsed?"center":"flex-start", padding: collapsed?"0":"0 2px" }}>
          {[{Icon:Icons.Sun,id:"light",label:"Light"},{Icon:Icons.Moon,id:"distilled",label:"Dark"}].map(({Icon,id,label}) => {
            const isActive = theme === id || (id === "distilled" && theme === "nocturne");
            return (
              <button key={label} onClick={() => setTheme(id)} title={label}
                style={{ flex: collapsed?undefined:1, width: collapsed?26:undefined, height:24, padding:"2px 0", borderRadius:6, border:`1px solid ${isActive?T.accent:T.border}`, background:isActive?T.accentSurface:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:isActive?T.accent:T.textTertiary, transition:"all .15s" }}
              ><Icon /></button>
            );
          })}
        </div>

        {/* Analytics — admin only */}
        {user?.user_metadata?.is_admin && (
          <button onClick={() => onNavigate("analytics")}
            title="Analytics"
            style={{ display:"flex", alignItems:"center", gap: collapsed?0:9, justifyContent: collapsed?"center":"flex-start", padding: collapsed?"6px 0":"8px 12px", borderRadius:10, border:"none", background:active==="analytics"?T.surface:"transparent", cursor:"pointer", width:"100%", fontFamily:"inherit", transition:"background .15s", marginBottom:2 }}
            onMouseEnter={e => { if (active!=="analytics") e.currentTarget.style.background=T.surface; }}
            onMouseLeave={e => { if (active!=="analytics") e.currentTarget.style.background="transparent"; }}
          >
            <span style={{ color:active==="analytics"?T.accent:T.textTertiary, display:"flex", flexShrink:0 }}>
              <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12l3.5-4 3 3L12 6l2 2"/><circle cx="14" cy="4" r="1.5" fill="currentColor" stroke="none"/></svg>
            </span>
            {!collapsed && <span style={{ fontSize:13, fontWeight:500, color:active==="analytics"?T.accent:T.textSecondary }}>Analytics</span>}
          </button>
        )}

        {/* User / settings row */}
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <button onClick={() => onNavigate("settings")}
            title={collapsed ? "Settings" : undefined}
            style={{ display:"flex", alignItems:"center", gap: collapsed?0:9, justifyContent: collapsed?"center":"flex-start", padding: collapsed?"6px 0":"8px 12px", borderRadius:10, border:"none", background:active==="settings"?T.surface:"transparent", cursor:"pointer", flex:1, fontFamily:"inherit", transition:"background .15s", minWidth:0 }}
            onMouseEnter={e => { if (active!=="settings") e.currentTarget.style.background=T.surface; }}
            onMouseLeave={e => { if (active!=="settings") e.currentTarget.style.background="transparent"; }}
          >
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} alt="" style={{ width:24, height:24, borderRadius:"50%", flexShrink:0 }} />
              : <span style={{ color:active==="settings"?T.accent:T.textTertiary, display:"flex", flexShrink:0 }}><Icons.Settings /></span>
            }
            {!collapsed && (
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:500, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.user_metadata?.user_name || "Settings"}</div>
                <div style={{ fontSize:10, color:T.textTertiary }}>Settings</div>
              </div>
            )}
          </button>
          {!collapsed && (
            <button onClick={() => setShortcutsOpen(v => !v)} title="Keyboard shortcuts"
              style={{ width:26, height:26, borderRadius:7, border:`1px solid ${shortcutsOpen?T.accent:T.border}`, background:shortcutsOpen?T.accentSurface:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:shortcutsOpen?T.accent:T.textTertiary, fontSize:13, fontFamily:"inherit", flexShrink:0, transition:"all .12s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.color=T.accent; e.currentTarget.style.background=T.accentSurface; }}
              onMouseLeave={e => { if (!shortcutsOpen) { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.textTertiary; e.currentTarget.style.background="transparent"; }}}
            >⌘</button>
          )}
        </div>

        {/* Version — only when expanded */}
        {!collapsed && (
          <div style={{ textAlign:"center", padding:"3px 10px 1px", fontSize:9, color:T.textTertiary, opacity:0.45, letterSpacing:".04em" }}>
            v{APP_VERSION}
          </div>
        )}

        {/* Shortcuts — symbol button next to user row, only when expanded */}
        {!collapsed && (
          <div ref={shortcutsRef} style={{ position:"relative", marginTop:0 }}>
            <div style={{ display:"none" }}>{/* anchor for popup */}</div>
            {shortcutsOpen && (
              <div style={{ position:"fixed", bottom:120, left:16, width:210, background:T.card, border:`1px solid ${T.borderStrong}`, borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,.18)", zIndex:2000, overflow:"hidden", animation:"slideUp .15s ease" }}>
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
