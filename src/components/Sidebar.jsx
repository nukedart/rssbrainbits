import { useState, useRef, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";

// ── Icons ────────────────────────────────────────────────────
const Icons = {
  Inbox:    () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="1.5" width="13" height="13" rx="2.5"/><path d="M1.5 10h3l1.5 2.5h4L11.5 10h3"/></svg>),
  Today:    () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1.5v3M11 1.5v3M2 7h12"/></svg>),
  Unread:   () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none"/></svg>),
  ReadLater:() => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 1.5"/></svg>),
  History:  () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 8a5.5 5.5 0 1 0 1-3.2"/><path d="M2.5 3v2.5H5"/><path d="M8 5.5v3l1.5 1.5"/></svg>),
  Notes:    () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h10a1 1 0 0 1 1 1v9l-3 3H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M11 12v3M11 12h3"/><path d="M5 6h6M5 9h4"/></svg>),
  Settings: () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.6 3.6l1.3 1.3M11.1 11.1l1.3 1.3M3.6 12.4l1.3-1.3M11.1 4.9l1.3-1.3"/></svg>),
  Sun:      () => (<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/></svg>),
  Moon:     () => (<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z"/></svg>),
  Plus:     () => (<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 1v10M1 6h10"/></svg>),
};

const SMART_COLORS = { blue:"#2F6FED", teal:"#4BBFAF", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };

const NAV = [
  { id:"inbox",     Icon:Icons.Inbox,     label:"Inbox"     },
  { id:"unread",    Icon:Icons.Unread,    label:"Unread"    },
  { id:"today",     Icon:Icons.Today,     label:"Today"     },
  { id:"readlater", Icon:Icons.ReadLater, label:"Read Later"},
  { id:"history",   Icon:Icons.History,   label:"History"   },
  { id:"notes",     Icon:Icons.Notes,     label:"Notes"     },
];

const SHORTCUTS = [
  ["J / K","Navigate"],["O","Open"],["R","Read/unread"],
  ["L","Read later"],["S","Save"],["A","Add feed"],["Esc","Close"],
];

// ── Nav item ─────────────────────────────────────────────────
function NavItem({ id, Icon, label, active, unreadCount, onNavigate }) {
  const { T } = useTheme();
  return (
    <button
      onClick={() => onNavigate(id)}
      style={{
        display:"flex", alignItems:"center", gap:10,
        padding:"6px 10px", borderRadius:8, border:"none",
        cursor:"pointer", width:"100%", textAlign:"left",
        background: active ? T.accentSurface : "transparent",
        fontFamily:"inherit", transition:"background .12s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.surface2; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ color: active ? T.accent : T.textTertiary, display:"flex", flexShrink:0, position:"relative" }}>
        <Icon />
      </span>
      <span style={{ flex:1, fontSize:13, fontWeight: active ? 600 : 400, color: active ? T.accentText : T.textSecondary, letterSpacing:"-.01em" }}>
        {label}
      </span>
      {id === "inbox" && unreadCount > 0 && (
        <span style={{ fontSize:10, fontWeight:700, color: active ? T.accent : T.textTertiary, minWidth:16, textAlign:"right" }}>
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}

// ── Rail nav item (tablet) ────────────────────────────────────
function RailItem({ id, Icon, label, active, unreadCount, onNavigate }) {
  const { T } = useTheme();
  return (
    <button
      onClick={() => onNavigate(id)}
      title={label}
      style={{
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"10px 0", borderRadius:8, border:"none",
        cursor:"pointer", width:"100%",
        background: active ? T.accentSurface : "transparent",
        position:"relative", transition:"background .12s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.surface2; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ color: active ? T.accent : T.textTertiary, display:"flex", position:"relative" }}>
        <Icon />
        {id === "inbox" && unreadCount > 0 && (
          <span style={{ position:"absolute", top:-3, right:-5, background:T.accent, color:"#fff", fontSize:8, fontWeight:700, padding:"1px 3px", borderRadius:6, lineHeight:1 }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </span>
    </button>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────
export default function Sidebar({ active, onNavigate, unreadCount=0, smartFeeds=[], onAddSmartFeed, onEditSmartFeed, folders=[], feeds=[], onAddFolder, onEditFolder }) {
  const { T, isDark, setIsDark } = useTheme();
  const { user } = useAuth();
  const { isTablet, isMobile } = useBreakpoint();

  // ALL hooks before any conditional return
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
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

  // ── TABLET: icon rail ─────────────────────────────────────
  if (isTablet) {
    return (
      <aside style={{ width:56, flexShrink:0, background:T.surface, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", height:"100dvh", userSelect:"none" }}>
        <div style={{ padding:"14px 6px 0", display:"flex", flexDirection:"column", gap:1 }}>
          {NAV.map(({ id, Icon, label }) => (
            <RailItem key={id} id={id} Icon={Icon} label={label} active={active===id} unreadCount={unreadCount} onNavigate={onNavigate} />
          ))}
        </div>
        <div style={{ flex:1 }} />
        <div style={{ padding:"0 6px 14px" }}>
          <RailItem id="settings" Icon={Icons.Settings} label="Settings" active={active==="settings"} unreadCount={0} onNavigate={onNavigate} />
        </div>
      </aside>
    );
  }

  // ── DESKTOP: full sidebar ─────────────────────────────────
  return (
    <aside style={{ width:220, flexShrink:0, background:T.surface, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", height:"100dvh", userSelect:"none" }}>

      {/* Logo */}
      <div style={{ padding:"18px 14px 12px" }}>
        <img
          src={`${import.meta.env.BASE_URL}feedbox-logo.png`}
          alt="Feedbox"
          style={{ height:22, display:"block", filter: isDark ? "brightness(10) saturate(0)" : "brightness(0) saturate(100%) invert(55%) sepia(50%) saturate(500%) hue-rotate(130deg) brightness(85%)" }}
          onError={e => { e.target.style.display="none"; }}
        />
      </div>

      {/* Main nav */}
      <nav style={{ padding:"0 8px", display:"flex", flexDirection:"column", gap:1 }}>
        {NAV.map(({ id, Icon, label }) => (
          <NavItem key={id} id={id} Icon={Icon} label={label} active={active===id} unreadCount={unreadCount} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* Smart Feeds */}
      {(smartFeeds.length > 0 || true) && (
        <div style={{ padding:"16px 8px 4px" }}>
          <div style={{ display:"flex", alignItems:"center", padding:"0 10px 6px" }}>
            <span style={{ flex:1, fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:".07em", color:T.textTertiary }}>Smart Feeds</span>
            <button onClick={onAddSmartFeed} title="New smart feed"
              style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, display:"flex", padding:2, borderRadius:4, transition:"color .1s" }}
              onMouseEnter={e => e.currentTarget.style.color=T.accent}
              onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
            ><Icons.Plus /></button>
          </div>
          {smartFeeds.length === 0 && (
            <button onClick={onAddSmartFeed}
              style={{ background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:12, color:T.textTertiary, padding:"2px 10px", textAlign:"left", lineHeight:1.5, width:"100%" }}>
              + Create keyword bucket
            </button>
          )}
          {smartFeeds.map(sf => {
            const isActive = active===`smart:${sf.id}`;
            const dot = SMART_COLORS[sf.color] || SMART_COLORS.teal;
            return (
              <button key={sf.id} onClick={() => onNavigate(`smart:${sf.id}`)}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", borderRadius:8, border:"none", cursor:"pointer", width:"100%", textAlign:"left", background: isActive?T.accentSurface:"transparent", fontFamily:"inherit", transition:"background .12s" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background=T.surface2; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background="transparent"; }}
              >
                <span style={{ width:6, height:6, borderRadius:"50%", background:dot, flexShrink:0 }} />
                <span style={{ flex:1, fontSize:13, fontWeight:isActive?600:400, color:isActive?T.accentText:T.textSecondary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sf.name}</span>
                <span onClick={e => { e.stopPropagation(); onEditSmartFeed(sf); }}
                  style={{ fontSize:12, color:T.textTertiary, opacity:0, transition:"opacity .1s", cursor:"pointer", padding:"0 2px" }}
                  onMouseEnter={e => e.currentTarget.style.opacity="1"}
                  onMouseLeave={e => e.currentTarget.style.opacity="0"}
                >···</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Folders in sidebar */}
      {folders.length > 0 && (
        <div style={{ padding:"8px 8px 4px" }}>
          <div style={{ display:"flex", alignItems:"center", padding:"0 10px 6px" }}>
            <span style={{ flex:1, fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:".07em", color:T.textTertiary }}>Folders</span>
            <button onClick={onAddFolder} title="New folder"
              style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, display:"flex", padding:2, borderRadius:4, transition:"color .1s" }}
              onMouseEnter={e => e.currentTarget.style.color=T.accent}
              onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
            ><Icons.Plus /></button>
          </div>
          {folders.map(folder => {
            const FCOLS = { gray:"#8A9099", teal:"#4BBFAF", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };
            const dot = FCOLS[folder.color] || "#8A9099";
            const isOpen = expandedFolders.has(folder.id);
            const folderFeeds = feeds.filter(f => f.folder_id === folder.id);
            return (
              <div key={folder.id}>
                <button onClick={() => toggleFolder(folder.id)}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", borderRadius:8, border:"none", cursor:"pointer", width:"100%", background:"transparent", fontFamily:"inherit", transition:"background .12s" }}
                  onMouseEnter={e => e.currentTarget.style.background=T.surface2}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}
                >
                  <span style={{ fontSize:8, color:T.textTertiary, transition:"transform .15s", transform:isOpen?"rotate(90deg)":"rotate(0deg)", display:"inline-block" }}>▶</span>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:dot, flexShrink:0 }} />
                  <span style={{ flex:1, fontSize:13, fontWeight:400, color:T.textSecondary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{folder.name}</span>
                  {folderFeeds.length > 0 && <span style={{ fontSize:10, color:T.textTertiary }}>{folderFeeds.length}</span>}
                  <span onClick={e => { e.stopPropagation(); onEditFolder(folder); }}
                    style={{ fontSize:12, color:T.textTertiary, opacity:0, transition:"opacity .1s", cursor:"pointer", padding:"0 2px" }}
                    onMouseEnter={e => e.currentTarget.style.opacity="1"}
                    onMouseLeave={e => e.currentTarget.style.opacity="0"}
                  >···</span>
                </button>
                {isOpen && folderFeeds.map(f => (
                  <div key={f.id} style={{ paddingLeft:28, padding:"3px 10px 3px 28px", fontSize:12, color:T.textTertiary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {f.name || new URL(f.url).hostname}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ flex:1 }} />

      {/* Bottom bar */}
      <div style={{ padding:"8px 8px 12px", borderTop:`1px solid ${T.border}` }}>
        {/* Theme toggle */}
        <div style={{ display:"flex", gap:3, marginBottom:8, padding:"0 2px" }}>
          {[{Icon:Icons.Sun,dark:false,label:"Light"},{Icon:Icons.Moon,dark:true,label:"Dark"}].map(({Icon,dark,label}) => (
            <button key={label} onClick={() => setIsDark(dark)} title={label}
              style={{ flex:1, padding:"5px 0", borderRadius:7, border:`1px solid ${isDark===dark?T.accent:T.border}`, background:isDark===dark?T.accentSurface:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:isDark===dark?T.accent:T.textTertiary, transition:"all .15s" }}
            ><Icon /></button>
          ))}
        </div>

        {/* User row */}
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <button onClick={() => onNavigate("settings")}
            style={{ flex:1, display:"flex", alignItems:"center", gap:9, minWidth:0, padding:"6px 10px", borderRadius:8, border:"none", background:active==="settings"?T.accentSurface:"transparent", cursor:"pointer", textAlign:"left", fontFamily:"inherit", transition:"background .12s" }}
            onMouseEnter={e => { if (active!=="settings") e.currentTarget.style.background=T.surface2; }}
            onMouseLeave={e => { if (active!=="settings") e.currentTarget.style.background="transparent"; }}
          >
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} alt="" style={{ width:24, height:24, borderRadius:"50%", flexShrink:0 }} />
              : <span style={{ color:active==="settings"?T.accent:T.textTertiary, display:"flex", flexShrink:0 }}><Icons.Settings /></span>
            }
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:500, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.user_metadata?.user_name||"Settings"}</div>
              <div style={{ fontSize:10, color:T.textTertiary }}>Settings</div>
            </div>
          </button>

          {/* Shortcuts */}
          <div ref={shortcutsRef} style={{ position:"relative", flexShrink:0 }}>
            <button onClick={() => setShortcutsOpen(v => !v)} title="Keyboard shortcuts"
              style={{ width:28, height:28, borderRadius:7, border:`1px solid ${shortcutsOpen?T.accent:T.border}`, background:shortcutsOpen?T.accentSurface:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:shortcutsOpen?T.accent:T.textTertiary, fontSize:12, fontWeight:600, fontFamily:"inherit", transition:"all .12s" }}
            >?</button>
            {shortcutsOpen && (
              <div style={{ position:"fixed", bottom:58, left:16, width:210, background:T.card, border:`1px solid ${T.borderStrong}`, borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,.18)", zIndex:2000, overflow:"hidden", animation:"slideUp .15s ease" }}>
                <div style={{ padding:"10px 14px 7px", borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:".06em" }}>Shortcuts</div>
                </div>
                <div style={{ padding:"5px 0 4px" }}>
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
        </div>
      </div>
    </aside>
  );
}
