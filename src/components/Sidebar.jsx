import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";

const NAV = [
  { id: "inbox",     icon: "📥", label: "Inbox"      },
  { id: "today",     icon: "☀️", label: "Today"      },
  { id: "readlater", icon: "⏱", label: "Read Later"  },
  { id: "history",   icon: "🕑", label: "History"    },
];

export default function Sidebar({ active, onNavigate, unreadCount = 0 }) {
  const { T, isDark, setIsDark } = useTheme();
  const { user } = useAuth();

  return (
    <aside style={{
      width: 216, flexShrink: 0,
      background: T.surface,
      borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column",
      height: "100dvh", userSelect: "none",
    }}>
      {/* Logo */}
      <div style={{ padding: "18px 16px 12px" }}>
        <img
          src="feedbox-logo.png"
          alt="Feedbox"
          style={{
            height: 28,
            filter: isDark ? "none" : "invert(1) brightness(0.15)",
            display: "block",
          }}
          onError={e => {
            e.target.replaceWith(Object.assign(document.createElement("span"), {
              textContent: "Feedbox",
              style: "font-size:15px;font-weight:700;color:" + T.text,
            }));
          }}
        />
      </div>

      {/* Main nav */}
      <nav style={{ padding: "2px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
        {NAV.map(({ id, icon, label }) => {
          const isActive = active === id;
          const showBadge = id === "inbox" && unreadCount > 0;
          return (
            <button key={id} onClick={() => onNavigate(id)} style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "8px 10px", borderRadius: 8,
              border: "none", cursor: "pointer", width: "100%", textAlign: "left",
              background: isActive ? T.accentSurface : "transparent",
              fontFamily: "inherit", transition: "background .1s",
              color: "inherit",
            }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = T.surface2; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? T.accentText : T.textSecondary }}>
                {label}
              </span>
              {showBadge && (
                <span style={{
                  background: T.accent, color: "#fff",
                  fontSize: 10, fontWeight: 700,
                  padding: "1px 6px", borderRadius: 10, flexShrink: 0,
                  minWidth: 18, textAlign: "center",
                }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: T.border, margin: "10px 16px" }} />

      {/* Keyboard shortcuts hint */}
      <div style={{ padding: "0 18px 10px" }}>
        <div style={{ fontSize: 10, color: T.textTertiary, lineHeight: 1.8 }}>
          <div><kbd style={kbdStyle(T)}>J</kbd> / <kbd style={kbdStyle(T)}>K</kbd> navigate</div>
          <div><kbd style={kbdStyle(T)}>O</kbd> open · <kbd style={kbdStyle(T)}>R</kbd> read</div>
          <div><kbd style={kbdStyle(T)}>L</kbd> read later · <kbd style={kbdStyle(T)}>?</kbd> help</div>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom: theme + user */}
      <div style={{ padding: "10px 8px 14px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 8, padding: "0 2px" }}>
          {[{ label: "☀️", dark: false }, { label: "🌙", dark: true }].map(({ label, dark }) => (
            <button key={label} onClick={() => setIsDark(dark)} title={dark ? "Dark mode" : "Light mode"} style={{
              flex: 1, padding: "4px 0", borderRadius: 6,
              border: `1px solid ${isDark === dark ? T.accent : T.border}`,
              background: isDark === dark ? T.accentSurface : "transparent",
              cursor: "pointer", fontSize: 12, lineHeight: 1, color: "inherit",
            }}>{label}</button>
          ))}
        </div>

        <button onClick={() => onNavigate("settings")} style={{
          display: "flex", alignItems: "center", gap: 9,
          padding: "7px 10px", borderRadius: 8, width: "100%",
          border: "none", background: active === "settings" ? T.accentSurface : "transparent",
          cursor: "pointer", textAlign: "left", fontFamily: "inherit",
          transition: "background .1s", color: "inherit",
        }}
          onMouseEnter={e => { if (active !== "settings") e.currentTarget.style.background = T.surface2; }}
          onMouseLeave={e => { if (active !== "settings") e.currentTarget.style.background = "transparent"; }}
        >
          {user?.user_metadata?.avatar_url
            ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0 }} />
            : <div style={{ width: 24, height: 24, borderRadius: "50%", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>⚙️</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.user_metadata?.user_name || "Settings"}
            </div>
            <div style={{ fontSize: 10, color: T.textTertiary }}>Settings</div>
          </div>
        </button>
      </div>
    </aside>
  );
}

function kbdStyle(T) {
  return {
    display: "inline-block", padding: "0px 4px",
    background: T.surface2, border: `1px solid ${T.border}`,
    borderRadius: 4, fontSize: 9, fontFamily: "monospace",
    color: T.textSecondary, marginRight: 2,
  };
}
