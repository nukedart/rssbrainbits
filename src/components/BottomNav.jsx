import { useState, useEffect } from "react";
import { List, Inbox, CreditCard, RefreshCw, Plus } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const NAV_ITEMS = [
  { id: "feeds",  Icon: List,      label: "Feeds",  special: "feeds" },
  { id: "inbox",  Icon: Inbox,     label: "Inbox"  },
  { id: "add",    Icon: Plus,      label: "Add",    special: "add"   },
  { id: "cards",  Icon: CreditCard, label: "Cards"  },
  { id: "review", Icon: RefreshCw, label: "Review" },
];

export default function BottomNav({ active, onNavigate, onAdd, onOpenFeeds, unreadCount = 0 }) {
  const { T } = useTheme();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const handler = e => setHidden(e.detail === "down");
    window.addEventListener("fb-nav-dir", handler);
    return () => window.removeEventListener("fb-nav-dir", handler);
  }, []);

  // Always show when navigating to a new page
  useEffect(() => { setHidden(false); }, [active]);

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 600,
      background: hexToRgba(T.card, 0.92),
      backdropFilter: "blur(24px) saturate(180%)",
      WebkitBackdropFilter: "blur(24px) saturate(180%)",
      transform: hidden ? "translateY(100%)" : "translateY(0)",
      transition: "transform .25s ease",
      display: "flex", alignItems: "stretch",
      paddingBottom: "env(safe-area-inset-bottom, 16px)",
      paddingLeft: "env(safe-area-inset-left, 0px)",
      paddingRight: "env(safe-area-inset-right, 0px)",
    }}>
      {NAV_ITEMS.map(({ id, Icon, label, special }) => {

        // ── Centre Add (+) button ─────────────────────────────
        if (special === "add") {
          return (
            <button
              key="add"
              onClick={onAdd}
              aria-label="Add feed"
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 4, padding: "8px 4px 6px",
                border: "none", background: "transparent",
                cursor: "pointer", fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent",
                minHeight: 54,
              }}
              onTouchStart={e => e.currentTarget.firstChild.style.transform = "scale(0.88)"}
              onTouchEnd={e => e.currentTarget.firstChild.style.transform = "scale(1)"}
              onTouchCancel={e => e.currentTarget.firstChild.style.transform = "scale(1)"}
            >
              <span style={{
                width: 44, height: 44, borderRadius: 14,
                background: T.accent, color: T.accentText,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 3px 14px ${T.accent}55`,
                transition: "transform .1s",
              }}>
                <Icon size={20} strokeWidth={2.5} />
              </span>
            </button>
          );
        }

        // ── Feeds drawer trigger ──────────────────────────────
        if (special === "feeds") {
          const isActive = active.startsWith("folder:") || active.startsWith("feed:") || active.startsWith("smart:");
          return (
            <button
              key="feeds"
              onClick={onOpenFeeds}
              aria-label="Open feeds list"
              aria-expanded={false}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 4, padding: "8px 4px 6px",
                border: "none", background: "transparent",
                color: isActive ? T.accent : T.textTertiary,
                cursor: "pointer", fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent",
                minHeight: 54, transition: "color .12s",
              }}
              onTouchStart={e => { e.currentTarget.style.opacity = "0.6"; }}
              onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
              onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.7} />
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, letterSpacing: ".01em" }}>Feeds</span>
            </button>
          );
        }

        // ── Standard nav tab ─────────────────────────────────
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 4, padding: "8px 4px 6px",
              border: "none", background: "transparent",
              color: isActive ? T.accent : T.textTertiary,
              cursor: "pointer", fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
              minHeight: 54, transition: "color .12s",
            }}
            onTouchStart={e => { e.currentTarget.style.opacity = "0.6"; }}
            onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
            onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
          >
            <span style={{ position: "relative", display: "flex" }}>
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.7} />
              {id === "inbox" && unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: -3, right: -8,
                  background: T.accent, color: T.accentText,
                  fontSize: 9, fontWeight: 700, lineHeight: 1,
                  padding: "2px 4px", borderRadius: 8,
                  minWidth: 14, textAlign: "center",
                  boxShadow: "0 1px 4px rgba(0,0,0,.25)",
                }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, letterSpacing: ".01em" }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
