import { useState, useRef, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";

const Icons = {
  Inbox: () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="1.5" width="13" height="13" rx="2"/><path d="M1.5 10h3l1.5 2.5h4L11.5 10h3"/></svg>),
  Today: () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1.5v3M11 1.5v3M2 7h12"/></svg>),
  Unread: () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none"/></svg>),
  ReadLater: () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 1.5"/></svg>),
  History: () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 8a5.5 5.5 0 1 0 1-3.2"/><path d="M2.5 3v2.5H5"/><path d="M8 5.5v3l1.5 1.5"/></svg>),
  Notes: () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h10a1 1 0 0 1 1 1v9l-3 3H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M11 12v3M11 12h3"/><path d="M4.5 6h7M4.5 9h5"/></svg>),
  Settings: () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.6 3.6l1.3 1.3M11.1 11.1l1.3 1.3M3.6 12.4l1.3-1.3M11.1 4.9l1.3-1.3"/></svg>),
  Sun: () => (<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/></svg>),
  Moon: () => (<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z"/></svg>),
  Plus: () => (<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 1v10M1 6h10"/></svg>),
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

const SHORTCUTS = [["J / K","Navigate"],["O","Open"],["R","Read/unread"],["L","Read later"],["S","Save"],["A","Add feed"],["Esc","Close"]];

export default function Sidebar({ active, onNavigate, unreadCount=0, smartFeeds=[], onAddSmartFeed, onEditSmartFeed }) {
  const { T, isDark, setIsDark } = useTheme();
  const { user } = useAuth();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const shortcutsRef = useRef(null);

  useEffect(() => {
    if (!shortcutsOpen) return;
    const h = (e) => { if (shortcutsRef.current && !shortcutsRef.current.contains(e.target)) setShortcutsOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [shortcutsOpen]);

  return (
    <aside style={{ width:216, flexShrink:0, background:T.surface, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", height:"100dvh", userSelect:"none" }}>

      {/* Logo — theme-aware: teal on light, white on dark */}
      <div style={{ padding:"20px 16px 16px" }}>
        <img
          src={`${import.meta.env.BASE_URL}feedbox-logo.png`}
          alt="Feedbox"
          style={{
            height: 26, display: "block",
            filter: isDark
              ? "brightness(10) saturate(0)"   // pure white on dark
              : "brightness(0) saturate(100%) invert(55%) sepia(50%) saturate(500%) hue-rotate(130deg) brightness(85%)", // teal on light
          }}
          onError={e => { e.target.style.display="none"; }}
        />
      </div>

      {/* Main nav */}
      <nav style={{ padding:"0 8px", display:"flex", flexDirection:"column", gap:1 }}>
        {NAV.map(({ id, Icon, label }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => onNavigate(id)} style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 10px", borderRadius:7, border:"none", cursor:"pointer", width:"100%", textAlign:"left", background: isActive ? T.accentSurface : "transparent", fontFamily:"inherit", transition:"background .1s", color:"inherit" }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background=T.surface2; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background="transparent"; }}
            >
              <span style={{ color: isActive ? T.accent : T.textTertiary, display:"flex", flexShrink:0 }}><Icon /></span>
              <span style={{ flex:1, fontSize:13, fontWeight: isActive ? 600 : 400, color: isActive ? T.accentText : T.textSecondary }}>{label}</span>
              {id==="inbox" && unreadCount>0 && (
                <span style={{ background:T.accent, color:"#fff", fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:10, flexShrink:0, minWidth:18, textAlign:"center" }}>
                  {unreadCount>99?"99+":unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Smart Feeds */}
      <div style={{ padding:"16px 8px 4px" }}>
        <div style={{ display:"flex", alignItems:"center", padding:"0 10px 7px" }}>
          <span style={{ flex:1, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:T.textTertiary }}>Smart Feeds</span>
          <button onClick={onAddSmartFeed} title="New smart feed" style={{ background:"none", border:"none", cursor:"pointer", color:T.textTertiary, display:"flex", alignItems:"center", padding:2, borderRadius:5, transition:"color .1s" }}
            onMouseEnter={e => { e.currentTarget.style.color=T.accent; }}
            onMouseLeave={e => { e.currentTarget.style.color=T.textTertiary; }}
          ><Icons.Plus /></button>
        </div>

        {smartFeeds.length===0 && (
          <button onClick={onAddSmartFeed} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:12, color:T.textTertiary, padding:"2px 10px", textAlign:"left", lineHeight:1.5 }}>
            + Create keyword bucket
          </button>
        )}

        {smartFeeds.map(sf => {
          const isActive = active===`smart:${sf.id}`;
          const dot = SMART_COLORS[sf.color] || SMART_COLORS.teal;
          return (
            <button key={sf.id} onClick={() => onNavigate(`smart:${sf.id}`)} style={{ display:"flex", alignItems:"center", gap:9, padding:"6px 10px", borderRadius:7, border:"none", cursor:"pointer", width:"100%", textAlign:"left", background: isActive ? T.accentSurface : "transparent", fontFamily:"inherit", transition:"background .1s", color:"inherit" }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background=T.surface2; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background="transparent"; }}
            >
              <span style={{ width:8, height:8, borderRadius:"50%", background:dot, flexShrink:0 }} />
              <span style={{ flex:1, fontSize:13, fontWeight: isActive?600:400, color: isActive?T.accentText:T.textSecondary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sf.name}</span>
              <span onClick={e => { e.stopPropagation(); onEditSmartFeed(sf); }} style={{ fontSize:13, color:T.textTertiary, opacity:0, transition:"opacity .1s", cursor:"pointer", padding:"0 2px" }}
                onMouseEnter={e => { e.currentTarget.style.opacity="1"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity="0"; }}
              >···</span>
            </button>
          );
        })}
      </div>

      <div style={{ flex:1 }} />

      {/* Theme + user + shortcuts */}
      <div style={{ padding:"10px 8px 14px", borderTop:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", gap:4, marginBottom:8, padding:"0 2px" }}>
          {[{Icon:Icons.Sun,dark:false,title:"Light"},{Icon:Icons.Moon,dark:true,title:"Dark"}].map(({Icon,dark,title}) => (
            <button key={title} onClick={() => setIsDark(dark)} title={title} style={{ flex:1, padding:"5px 0", borderRadius:6, border:`1px solid ${isDark===dark?T.accent:T.border}`, background: isDark===dark?T.accentSurface:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color: isDark===dark?T.accent:T.textTertiary, transition:"all .15s" }}>
              <Icon />
            </button>
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <button onClick={() => onNavigate("settings")} style={{ flex:1, display:"flex", alignItems:"center", gap:9, minWidth:0, padding:"7px 10px", borderRadius:8, border:"none", background: active==="settings"?T.accentSurface:"transparent", cursor:"pointer", textAlign:"left", fontFamily:"inherit", transition:"background .1s", color:"inherit" }}
            onMouseEnter={e => { if (active!=="settings") e.currentTarget.style.background=T.surface2; }}
            onMouseLeave={e => { if (active!=="settings") e.currentTarget.style.background="transparent"; }}
          >
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} alt="" style={{ width:24, height:24, borderRadius:"50%", flexShrink:0 }} />
              : <span style={{ color: active==="settings"?T.accent:T.textTertiary, display:"flex", flexShrink:0 }}><Icons.Settings /></span>
            }
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.user_metadata?.user_name||"Settings"}</div>
              <div style={{ fontSize:10, color:T.textTertiary }}>Settings</div>
            </div>
          </button>

          {/* Shortcuts ? button */}
          <div ref={shortcutsRef} style={{ position:"relative", flexShrink:0 }}>
            <button onClick={() => setShortcutsOpen(v => !v)} title="Keyboard shortcuts" style={{ width:28, height:28, borderRadius:7, border:`1px solid ${shortcutsOpen?T.accent:T.border}`, background: shortcutsOpen?T.accentSurface:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color: shortcutsOpen?T.accent:T.textTertiary, fontSize:12, fontWeight:700, fontFamily:"inherit", transition:"all .12s" }}>?</button>
            {shortcutsOpen && (
              <div style={{ position:"fixed", bottom:58, left:16, width:220, background:T.card, border:`1px solid ${T.borderStrong}`, borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,.2)", zIndex:2000, overflow:"hidden", animation:"slideUp .15s ease" }}>
                <div style={{ padding:"11px 14px 8px", borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:12, fontWeight:700, color:T.text }}>Keyboard Shortcuts</div>
                </div>
                <div style={{ padding:"6px 0 4px" }}>
                  {SHORTCUTS.map(([key,action]) => (
                    <div key={key} style={{ display:"flex", alignItems:"center", gap:10, padding:"5px 14px" }}>
                      <kbd style={{ display:"inline-block", minWidth:36, textAlign:"center", padding:"2px 6px", background:T.surface2, border:`1px solid ${T.border}`, borderRadius:5, fontSize:10, fontFamily:"monospace", color:T.text, flexShrink:0 }}>{key}</kbd>
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
