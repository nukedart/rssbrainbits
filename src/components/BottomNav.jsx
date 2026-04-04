import { List, Inbox, Plus, CreditCard, RefreshCw } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const NAV_ITEMS = [
  { id: "feeds",  Icon: List,       label: "Feeds",  special: "feeds" },
  { id: "inbox",  Icon: Inbox,      label: "Inbox"  },
  { id: "add",    Icon: Plus,       label: "Add",    special: "add"   },
  { id: "cards",  Icon: CreditCard, label: "Cards"  },
  { id: "review", Icon: RefreshCw,  label: "Review" },
];

export default function BottomNav({ active, onNavigate, onAdd, onOpenFeeds, unreadCount = 0 }) {
  const { T } = useTheme();

  return (
    <nav style={{
      position: "fixed",
      bottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
      left: "50%",
      zIndex: 600,
      background: hexToRgba(T.card, 0.94),
      backdropFilter: "blur(28px) saturate(200%)",
      WebkitBackdropFilter: "blur(28px) saturate(200%)",
      transform: "translateX(-50%)",
      display: "flex", alignItems: "center",
      borderRadius: 999,
      border: `1px solid ${T.border}`,
      boxShadow: "0 8px 40px rgba(0,0,0,.22), 0 1px 0 rgba(255,255,255,.06) inset",
      padding: "0 8px",
      width: "max-content",
      maxWidth: "calc(100vw - 32px)",
    }}>
      {NAV_ITEMS.map(({ id, Icon, label, special }) => {

        // ── Add button ───────────────────────────────────────
        if (special === "add") {
          return (
            <button
              key="add"
              onClick={onAdd}
              aria-label="Add feed"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "6px 8px",
                border: "none", background: "transparent",
                cursor: "pointer", fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent",
              }}
              onTouchStart={e => e.currentTarget.firstChild.style.transform = "scale(0.88)"}
              onTouchEnd={e => e.currentTarget.firstChild.style.transform = "scale(1)"}
              onTouchCancel={e => e.currentTarget.firstChild.style.transform = "scale(1)"}
            >
              <span style={{
                width: 42, height: 42, borderRadius: 999,
                background: T.accent, color: T.accentText,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 2px 10px ${T.accent}55`,
                transition: "transform .1s",
              }}>
                <Icon size={20} strokeWidth={2.5} />
              </span>
            </button>
          );
        }

        // ── Feeds drawer trigger ──────────────────────────────
        if (special === "feeds") {
          const isActive = active === "today" || active === "readlater" || active.startsWith("folder:") || active.startsWith("feed:") || active.startsWith("smart:");
          return (
            <button
              key="feeds"
              onClick={onOpenFeeds}
              aria-label="Open feeds list"
              aria-expanded={false}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 4, padding: "11px 18px",
                border: "none",
                background: isActive ? T.accentSurface : "transparent",
                borderRadius: 10,
                color: isActive ? T.accent : T.textTertiary,
                cursor: "pointer", fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent",
                transition: "color .12s, background .12s",
              }}
              onTouchStart={e => { e.currentTarget.style.opacity = "0.6"; }}
              onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
              onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <Icon size={24} strokeWidth={isActive ? 2.2 : 1.7} />
              <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, letterSpacing: ".01em" }}>Feeds</span>
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
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 4, padding: "11px 18px",
              border: "none",
              background: isActive ? T.accentSurface : "transparent",
              borderRadius: 10,
              color: isActive ? T.accent : T.textTertiary,
              cursor: "pointer", fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
              transition: "color .12s, background .12s",
            }}
            onTouchStart={e => { e.currentTarget.style.opacity = "0.6"; }}
            onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
            onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
          >
            <span style={{ position: "relative", display: "flex" }}>
              <Icon size={24} strokeWidth={isActive ? 2.2 : 1.7} />
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
            <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, letterSpacing: ".01em" }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
