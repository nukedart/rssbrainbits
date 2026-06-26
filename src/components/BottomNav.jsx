import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

// ── Icons ──────────────────────────────────────────────────────
const ListIcon   = ({ size, sw }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4.5h12M2 8h12M2 11.5h12"/>
  </svg>
);
const InboxIcon  = ({ size, sw }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="1.5" width="13" height="13" rx="2.5"/><path d="M1.5 10h3l1.5 2.5h4L11.5 10h3"/>
  </svg>
);
const TodayIcon  = ({ size, sw }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1.5v3M11 1.5v3M2 7h12"/>
  </svg>
);
const CardIcon   = ({ size, sw }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="3" width="13" height="10" rx="2"/><path d="M4 7h8M4 10h5"/>
  </svg>
);
const ReviewIcon = ({ size, sw }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 8a5.5 5.5 0 0 1-9.9 3.3M2.5 8a5.5 5.5 0 0 1 9.9-3.3"/>
    <path d="M11.5 4.5l.9-2.1 2.1.9"/><path d="M4.5 11.5l-.9 2.1-2.1-.9"/>
  </svg>
);
const SavedIcon = ({ size, sw, filled }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1.5.87L8 11.5l-4.5 2.37A1 1 0 0 1 2 13V3a1 1 0 0 1 1-1z"/>
  </svg>
);

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const NAV_ITEMS = [
  { id: "feeds",     Icon: ListIcon,   label: "Feeds",  special: "feeds" },
  { id: "inbox",     Icon: InboxIcon,  label: "Inbox"  },
  { id: "today",     Icon: TodayIcon,  label: "Today"  },
  { id: "readlater", Icon: SavedIcon,  label: "Saved"  },
  { id: "cards",     Icon: CardIcon,   label: "Cards"  },
  { id: "review",    Icon: ReviewIcon, label: "Review" },
];

function CountBadge({ count, T }) {
  const label = count > 99 ? "99+" : String(count);
  return (
    <span style={{
      position: "absolute", top: -5, right: label.length > 2 ? -2 : 1,
      minWidth: 15, height: 15,
      borderRadius: 99,
      background: T.accent,
      color: T.accentText,
      fontSize: 9,
      fontWeight: 700,
      lineHeight: "15px",
      textAlign: "center",
      padding: "0 3px",
      pointerEvents: "none",
    }}>
      {label}
    </span>
  );
}

export default function BottomNav({
  active,
  onNavigate,
  onOpenFeeds,
  unreadCount = 0,
  dueCount = 0,
}) {
  const { T, isDark } = useTheme();
  const [visible, setVisible] = useState(true);

  // Always show nav when switching pages
  useEffect(() => { setVisible(true); }, [active]);

  useEffect(() => {
    function onNavDir(e) { setVisible(e.detail !== "down"); }
    window.addEventListener("fb-nav-dir", onNavDir);
    return () => window.removeEventListener("fb-nav-dir", onNavDir);
  }, []);

  const pillBase = {
    position: "fixed",
    bottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
    left: "50%",
    zIndex: 600,
    background: hexToRgba(T.card, 0.92),
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    transform: `translateX(-50%) translateY(${visible ? "0" : "120px"})`,
    transition: "transform .3s cubic-bezier(.4,0,.2,1)",
    willChange: "transform",
    display: "flex",
    alignItems: "center",
    borderRadius: 999,
    border: `1px solid ${hexToRgba(T.border, 0.6)}`,
    boxShadow: isDark
      ? "0 4px 24px rgba(0,0,0,.28)"
      : "0 2px 12px rgba(0,0,0,.07)",
    padding: "0 4px",
    maxWidth: "calc(100vw - 32px)",
  };

  const btnStyle = (isActive, isDisabled) => ({
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "8px 2px",
    border: "none",
    background: "transparent",
    borderRadius: 8,
    color: isActive ? T.accent : isDisabled ? T.textTertiary : T.textSecondary,
    opacity: isDisabled ? 0.3 : 1,
    cursor: isDisabled ? "default" : "pointer",
    fontFamily: "inherit",
    WebkitTapHighlightColor: "transparent",
    transition: "color .14s",
    flexShrink: 0,
  });

  return (
    <nav aria-label="Main navigation" style={{ ...pillBase, padding: "0 6px" }}>
      {NAV_ITEMS.map(({ id, Icon, label, special }) => {

        if (special === "feeds") {
          const isActive = active.startsWith("folder:") || active.startsWith("feed:") || active.startsWith("smart:") ;
          return (
            <button
              key="feeds"
              onClick={onOpenFeeds}
              aria-label="Open feeds"
              aria-current={isActive ? "page" : undefined}
              style={btnStyle(isActive, false)}
              onTouchStart={e => { e.currentTarget.style.opacity = "0.5"; }}
              onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
              onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <span style={{ display: "flex", background: isActive ? T.accentSurface : "transparent", borderRadius: 10, padding: "6px 8px", transition: "background .14s" }}>
                <Icon size={22} sw={isActive ? 1.7 : 1.3} />
              </span>
            </button>
          );
        }

        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            style={btnStyle(isActive, false)}
            onTouchStart={e => { e.currentTarget.style.opacity = "0.5"; }}
            onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
            onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
          >
            <span style={{ position: "relative", display: "flex" }}>
              <span style={{ display: "flex", background: isActive ? T.accentSurface : "transparent", borderRadius: 10, padding: "6px 8px", transition: "background .14s" }}>
                <Icon size={22} sw={isActive ? 1.7 : 1.3} filled={isActive} />
              </span>
              {id === "inbox" && unreadCount > 0 && !isActive && (
                <CountBadge count={unreadCount} T={T} />
              )}
              {id === "review" && dueCount > 0 && !isActive && (
                <CountBadge count={dueCount} T={T} />
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
