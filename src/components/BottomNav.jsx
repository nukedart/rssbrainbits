import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const Icons = {
  Feeds:    () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h12M3 18h8"/></svg>),
  Inbox:    () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="4"/><path d="M2 15h5l2 4h6l2-4h5"/></svg>),
  Today:    () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M7 2v4M17 2v4M3 10h18"/><path d="M8 15h2M11 15h2M14 15h2M8 18h2M11 18h2"/></svg>),
  Saved:    () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>),
  Cards:    () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 10h12M6 14h8"/></svg>),
  Review:   () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-15.8 5.9"/><path d="M3 12a9 9 0 0 1 15.8-5.9"/><path d="M17.5 5.8l1.5-3.5 3.5 1.5"/><path d="M6.5 18.2l-1.5 3.5-3.5-1.5"/></svg>),
};

// Filled versions for active state
const IconsFilled = {
  Feeds:    () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h12M3 18h8" strokeWidth="2.2"/></svg>),
  Inbox:    () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="2" y="2" width="20" height="20" rx="4" opacity=".15"/><rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M2 15h5l2 4h6l2-4h5" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>),
  Today:    () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M7 2v4M17 2v4M3 10h18" strokeWidth="2"/><path d="M8 15h2M11 15h2M14 15h2M8 18h2M11 18h2" strokeWidth="2.2"/></svg>),
  Saved:    () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>),
  Cards:    () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 10h12M6 14h8"/></svg>),
  Review:   () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-15.8 5.9"/><path d="M3 12a9 9 0 0 1 15.8-5.9"/><path d="M17.5 5.8l1.5-3.5 3.5 1.5"/><path d="M6.5 18.2l-1.5 3.5-3.5-1.5"/></svg>),
};

const NAV = [
  { id: "feeds",     Icon: Icons.Feeds,     IconFilled: IconsFilled.Feeds,     label: "Feeds",   special: "feeds" },
  { id: "inbox",     Icon: Icons.Inbox,     IconFilled: IconsFilled.Inbox,     label: "Inbox"   },
  { id: "add",       Icon: null,            IconFilled: null,                  label: "Add"     },
  { id: "cards",     Icon: Icons.Cards,     IconFilled: IconsFilled.Cards,     label: "Cards"   },
  { id: "review",    Icon: Icons.Review,    IconFilled: IconsFilled.Review,    label: "Review"  },
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
      borderTop: `0.5px solid ${T.border}`,
      transform: hidden ? "translateY(100%)" : "translateY(0)",
      transition: "transform .25s ease",
      display: "flex", alignItems: "stretch",
      paddingBottom: "env(safe-area-inset-bottom, 16px)",
      paddingLeft: "env(safe-area-inset-left, 0px)",
      paddingRight: "env(safe-area-inset-right, 0px)",
    }}>
      {NAV.map(({ id, Icon, IconFilled, label, special }) => {

        // ── Centre Add (+) button ─────────────────────────────
        if (id === "add") {
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
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M10 3v14M3 10h14"/>
                </svg>
              </span>
            </button>
          );
        }

        // ── Feeds drawer trigger ──────────────────────────────
        if (special === "feeds") {
          const isFeedsActive = active.startsWith("folder:") || active.startsWith("feed:") || active.startsWith("smart:");
          const ActiveIcon = isFeedsActive ? IconFilled : Icon;
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
                color: isFeedsActive ? T.accent : T.textTertiary,
                cursor: "pointer", fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent",
                minHeight: 54, transition: "color .12s",
              }}
              onTouchStart={e => { e.currentTarget.style.opacity = "0.6"; }}
              onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
              onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <ActiveIcon />
              <span style={{ fontSize: 10, fontWeight: isFeedsActive ? 600 : 400, letterSpacing: ".01em" }}>Feeds</span>
            </button>
          );
        }

        // ── Standard nav tab ─────────────────────────────────
        const isActive = active === id || (id === "inbox" && active === "inbox");
        const ActiveIcon = isActive ? IconFilled : Icon;
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
              <ActiveIcon />
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
