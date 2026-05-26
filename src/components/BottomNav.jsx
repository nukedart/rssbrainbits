import { useState, useEffect } from "react";

const ListIcon   = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4.5h12M2 8h12M2 11.5h12"/>
  </svg>
);
const InboxIcon  = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="1.5" width="13" height="13" rx="2.5"/><path d="M1.5 10h3l1.5 2.5h4L11.5 10h3"/>
  </svg>
);
const TodayIcon  = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1.5v3M11 1.5v3M2 7h12"/>
  </svg>
);
const CardIcon   = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="3" width="13" height="10" rx="2"/><path d="M4 7h8M4 10h5"/>
  </svg>
);
const ReviewIcon = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 8a5.5 5.5 0 0 1-9.9 3.3M2.5 8a5.5 5.5 0 0 1 9.9-3.3"/>
    <path d="M11.5 4.5l.9-2.1 2.1.9"/><path d="M4.5 11.5l-.9 2.1-2.1-.9"/>
  </svg>
);
import { useTheme } from "../hooks/useTheme";

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const NAV_ITEMS = [
  { id: "feeds",  Icon: ListIcon,   label: "Feeds",  special: "feeds" },
  { id: "inbox",  Icon: InboxIcon,  label: "Inbox"  },
  { id: "today",  Icon: TodayIcon,  label: "Today"  },
  { id: "cards",  Icon: CardIcon,   label: "Cards"  },
  { id: "review", Icon: ReviewIcon, label: "Review" },
];

export default function BottomNav({ active, onNavigate, onOpenFeeds, unreadCount = 0 }) {
  const { T, isDark } = useTheme();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    function onNavDir(e) { setVisible(e.detail !== "down"); }
    window.addEventListener("fb-nav-dir", onNavDir);
    return () => window.removeEventListener("fb-nav-dir", onNavDir);
  }, []);

  return (
    <nav style={{
      position: "fixed",
      bottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
      left: "50%",
      zIndex: 600,
      background: hexToRgba(T.card, 0.94),
      backdropFilter: "blur(28px) saturate(200%)",
      WebkitBackdropFilter: "blur(28px) saturate(200%)",
      transform: `translateX(-50%) translateY(${visible ? "0" : "120px"})`,
      transition: "transform .3s cubic-bezier(.4,0,.2,1)",
      display: "flex", alignItems: "center",
      borderRadius: 999,
      border: `1px solid ${T.border}`,
      boxShadow: isDark ? "0 8px 40px rgba(0,0,0,.22), 0 1px 0 rgba(255,255,255,.06) inset" : "0 2px 16px rgba(0,0,0,.08)",
      padding: "0 8px",
      width: "max-content",
      maxWidth: "calc(100vw - 32px)",
    }}>
      {NAV_ITEMS.map(({ id, Icon, label, special }) => {

        // ── Feeds drawer trigger ──────────────────────────────
        if (special === "feeds") {
          const isActive = active === "readlater" || active.startsWith("folder:") || active.startsWith("feed:") || active.startsWith("smart:");
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
              <Icon size={24} strokeWidth={isActive ? 1.7 : 1.2} />
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
              <Icon size={24} strokeWidth={isActive ? 1.7 : 1.2} />
              {id === "inbox" && unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: -5, right: -7,
                  minWidth: 15, height: 15, borderRadius: 8,
                  background: T.accent, color: T.accentText,
                  fontSize: 9, fontWeight: 700, lineHeight: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 3px", boxSizing: "border-box",
                  boxShadow: "0 1px 4px rgba(0,0,0,.2)",
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
