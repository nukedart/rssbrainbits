import { useTheme } from "../hooks/useTheme";

// Convert any hex color to rgba — the frosted-glass blur needs transparency
function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const Icons = {
  Home:     () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>),
  Inbox:    () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="4"/><path d="M2 15h5l2 4h6l2-4h5"/></svg>),
  ReadLater:() => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>),
  Settings: () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/></svg>),
};

const NAV = [
  { id:"home",      Icon:Icons.Home,      label:"Home"     },
  { id:"inbox",     Icon:Icons.Inbox,     label:"Inbox"    },
  { id:"add",       Icon:null,            label:"Add"      }, // special center button
  { id:"readlater", Icon:Icons.ReadLater, label:"Saved"    },
  { id:"settings",  Icon:Icons.Settings,  label:"Settings" },
];

export default function BottomNav({ active, onNavigate, onAdd, unreadCount = 0 }) {
  const { T } = useTheme();

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 600,
      // iOS frosted glass blur
      background: hexToRgba(T.card, 0.88),
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      borderTop: `0.5px solid ${T.border}`,
      display: "flex", alignItems: "stretch",
      paddingBottom: "env(safe-area-inset-bottom, 16px)",
      paddingLeft: "env(safe-area-inset-left, 0px)",
      paddingRight: "env(safe-area-inset-right, 0px)",
    }}>
      {NAV.map(({ id, Icon, label }) => {
        // ── Special: centre Add (+) button ──────────────────────
        if (id === "add") {
          return (
            <button
              key="add"
              onClick={onAdd}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 3, padding: "10px 4px 6px",
                border: "none", background: "transparent",
                cursor: "pointer", fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent",
                transition: "transform .1s",
                position: "relative", minHeight: 52,
              }}
              onTouchStart={e => { e.currentTarget.style.transform = "scale(0.88)"; }}
              onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <span style={{
                width: 40, height: 40, borderRadius: 13,
                background: T.accent, color: T.accentText,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 2px 12px ${T.accent}50`,
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 2v14M2 9h14"/>
                </svg>
              </span>
            </button>
          );
        }

        // ── Standard nav tab ─────────────────────────────────────
        const isActive = active === id || (id === "inbox" && active.startsWith("smart:"));
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 3, padding: "10px 4px 6px",
              border: "none", background: "transparent",
              color: isActive ? T.accent : T.textTertiary,
              cursor: "pointer", fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
              transition: "transform .1s, color .12s",
              position: "relative", minHeight: 52,
            }}
            onTouchStart={e => { e.currentTarget.style.transform = "scale(0.88)"; }}
            onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {/* Active pill indicator */}
            {isActive && (
              <span style={{
                position: "absolute", top: 6,
                width: 32, height: 3, borderRadius: 2,
                background: T.accent,
              }} />
            )}

            <span style={{ display: "flex", position: "relative", marginTop: 6 }}>
              <Icon />
              {id === "inbox" && unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -7,
                  background: T.accent, color: "#fff",
                  fontSize: 9, fontWeight: 700, lineHeight: 1,
                  padding: "2px 4px", borderRadius: 8,
                  minWidth: 14, textAlign: "center",
                  boxShadow: "0 1px 4px rgba(0,0,0,.2)",
                }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>

            <span style={{
              fontSize: 10, fontWeight: isActive ? 600 : 400,
              letterSpacing: ".01em",
              transform: isActive ? "scale(1.05)" : "scale(1)",
              transition: "transform .15s",
            }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
