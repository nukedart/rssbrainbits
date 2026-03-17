import { useTheme } from "../hooks/useTheme";

const Icons = {
  Inbox: () => (<svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="1.5" width="13" height="13" rx="2"/><path d="M1.5 10h3l1.5 2.5h4L11.5 10h3"/></svg>),
  Unread: () => (<svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none"/></svg>),
  Notes: () => (<svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h10a1 1 0 0 1 1 1v9l-3 3H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M11 12v3M11 12h3"/><path d="M4.5 6h7M4.5 9h5"/></svg>),
  History: () => (<svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 8a5.5 5.5 0 1 0 1-3.2"/><path d="M2.5 3v2.5H5"/><path d="M8 5.5v3l1.5 1.5"/></svg>),
  Settings: () => (<svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.6 3.6l1.3 1.3M11.1 11.1l1.3 1.3M3.6 12.4l1.3-1.3M11.1 4.9l1.3-1.3"/></svg>),
};

const NAV = [
  { id: "inbox",    Icon: Icons.Inbox,    label: "Inbox"    },
  { id: "unread",   Icon: Icons.Unread,   label: "Unread"   },
  { id: "notes",    Icon: Icons.Notes,    label: "Notes"    },
  { id: "history",  Icon: Icons.History,  label: "History"  },
  { id: "settings", Icon: Icons.Settings, label: "Settings" },
];

export default function BottomNav({ active, onNavigate, unreadCount = 0 }) {
  const { T } = useTheme();

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 400,
      background: T.card,
      borderTop: `1px solid ${T.border}`,
      display: "flex", alignItems: "stretch",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {NAV.map(({ id, Icon, label }) => {
        const isActive = active === id || (id === "inbox" && active.startsWith("smart:"));
        return (
          <button key={id} onClick={() => onNavigate(id)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3,
            padding: "10px 4px 8px",
            border: "none", background: "transparent",
            color: isActive ? T.accent : T.textTertiary,
            cursor: "pointer", fontFamily: "inherit",
            transition: "color .12s",
            position: "relative",
          }}>
            <span style={{ display: "flex", position: "relative" }}>
              <Icon />
              {/* Unread badge on Inbox */}
              {id === "inbox" && unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -6,
                  background: T.accent, color: "#fff",
                  fontSize: 9, fontWeight: 700, lineHeight: 1,
                  padding: "2px 4px", borderRadius: 8, minWidth: 14, textAlign: "center",
                }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, letterSpacing: ".01em" }}>{label}</span>
            {/* Active indicator */}
            {isActive && (
              <span style={{
                position: "absolute", top: 0, left: "20%", right: "20%",
                height: 2, borderRadius: "0 0 2px 2px",
                background: T.accent,
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
