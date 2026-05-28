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

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function isInboxPage(active) {
  return (
    active === "inbox" ||
    active === "all" ||
    active.startsWith("feed:") ||
    active.startsWith("folder:") ||
    active.startsWith("smart:")
  );
}

// ── Shared label reveal: animates in when isActive ─────────────
function RevealLabel({ label, isActive }) {
  return (
    <span style={{
      display: "block",
      overflow: "hidden",
      maxHeight: isActive ? "16px" : "0px",
      opacity: isActive ? 1 : 0,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: ".01em",
      lineHeight: 1,
      marginTop: isActive ? 4 : 0,
      transition: "max-height .18s ease, opacity .15s, margin-top .18s",
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

const NAV_ITEMS = [
  { id: "feeds",  Icon: ListIcon,   label: "Feeds",  special: "feeds" },
  { id: "inbox",  Icon: InboxIcon,  label: "Inbox"  },
  { id: "today",  Icon: TodayIcon,  label: "Today"  },
  { id: "cards",  Icon: CardIcon,   label: "Cards"  },
  { id: "review", Icon: ReviewIcon, label: "Review" },
];

export default function BottomNav({
  active,
  onNavigate,
  onOpenFeeds,
  unreadCount = 0,
  inboxFilter = "unread",
  inboxUnreadCount = 0,
}) {
  const { T, isDark } = useTheme();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    function onNavDir(e) { setVisible(e.detail !== "down"); }
    window.addEventListener("fb-nav-dir", onNavDir);
    return () => window.removeEventListener("fb-nav-dir", onNavDir);
  }, []);

  function sendAction(action) {
    window.dispatchEvent(new CustomEvent("fb-inbox-action", { detail: action }));
  }

  const pillBase = {
    position: "fixed",
    bottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
    left: "50%",
    zIndex: 600,
    background: hexToRgba(T.card, 0.94),
    backdropFilter: "blur(28px) saturate(200%)",
    WebkitBackdropFilter: "blur(28px) saturate(200%)",
    transform: `translateX(-50%) translateY(${visible ? "0" : "120px"})`,
    transition: "transform .3s cubic-bezier(.4,0,.2,1)",
    display: "flex",
    alignItems: "center",
    borderRadius: 999,
    border: `1px solid ${T.border}`,
    boxShadow: isDark
      ? "0 8px 40px rgba(0,0,0,.22), 0 1px 0 rgba(255,255,255,.06) inset"
      : "0 2px 16px rgba(0,0,0,.08)",
    padding: "0 6px",
    maxWidth: "calc(100vw - 32px)",
  };

  const btnStyle = (isActive, isDisabled) => ({
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: isActive ? "10px 18px" : "10px 14px",
    border: "none",
    background: isActive ? T.accentSurface : "transparent",
    borderRadius: 10,
    color: isActive ? T.accent : isDisabled ? T.textTertiary : T.textSecondary,
    opacity: isDisabled ? 0.35 : 1,
    cursor: isDisabled ? "default" : "pointer",
    fontFamily: "inherit",
    WebkitTapHighlightColor: "transparent",
    transition: "color .12s, background .12s, padding .18s",
    flexShrink: 0,
  });

  // ── Filter bar (inbox pages) ───────────────────────────────
  if (isInboxPage(active)) {
    const isSaved  = inboxFilter === "saved";
    const isUnread = inboxFilter === "unread";
    const noUnread = inboxUnreadCount === 0;

    return (
      <nav style={pillBase}>
        {/* Search */}
        <button
          style={btnStyle(false, false)}
          onClick={() => sendAction("search")}
          onTouchStart={e => { e.currentTarget.style.opacity = "0.55"; }}
          onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
          onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l3.5 3.5"/>
          </svg>
        </button>

        {/* ★ Saved */}
        <button
          style={btnStyle(isSaved, false)}
          onClick={() => sendAction({ type: "filter", value: isSaved ? "all" : "saved" })}
          onTouchStart={e => { e.currentTarget.style.opacity = "0.55"; }}
          onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
          onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1.5.87L8 11.5l-4.5 2.37A1 1 0 0 1 2 13V3a1 1 0 0 1 1-1z"/>
          </svg>
          <RevealLabel label="Saved" isActive={isSaved} />
        </button>

        {/* ● Unread — dot replaces old pill */}
        <button
          onClick={() => sendAction({ type: "filter", value: isUnread ? "all" : "unread" })}
          onTouchStart={e => { e.currentTarget.style.opacity = "0.55"; }}
          onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
          onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
          style={btnStyle(isUnread, false)}
        >
          {/* Dot with optional count badge */}
          <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{
              width: isUnread ? 10 : 8, height: isUnread ? 10 : 8,
              borderRadius: "50%",
              background: isUnread ? T.bg : T.accent,
              border: isUnread ? `2px solid ${T.accent}` : "none",
              display: "block",
              transition: "all .18s",
            }} />
            {inboxUnreadCount > 0 && !isUnread && (
              <span style={{
                position: "absolute", top: -6, right: -8,
                minWidth: 14, height: 14, borderRadius: 7,
                background: T.accent, color: T.accentText,
                fontSize: 8, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 3px", boxSizing: "border-box",
              }}>
                {inboxUnreadCount > 99 ? "99+" : inboxUnreadCount}
              </span>
            )}
          </span>
          <RevealLabel label="Unread" isActive={isUnread} />
        </button>

        {/* ≡ Display */}
        <button
          style={btnStyle(false, false)}
          onClick={() => sendAction("display")}
          onTouchStart={e => { e.currentTarget.style.opacity = "0.55"; }}
          onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
          onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M2 4h12M4 8h8M6 12h4"/>
          </svg>
        </button>

        {/* ✓ Mark all read */}
        <button
          style={btnStyle(false, noUnread)}
          onClick={noUnread ? undefined : () => sendAction("markAll")}
          onTouchStart={e => { if (!noUnread) e.currentTarget.style.opacity = "0.55"; }}
          onTouchEnd={e => { e.currentTarget.style.opacity = noUnread ? "0.35" : "1"; }}
          onTouchCancel={e => { e.currentTarget.style.opacity = noUnread ? "0.35" : "1"; }}
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 9l4 4 10-10"/><path d="M1 5l4 4 10-10" strokeOpacity=".4"/>
          </svg>
        </button>
      </nav>
    );
  }

  // ── Nav tabs (non-inbox pages) ─────────────────────────────
  return (
    <nav style={{ ...pillBase, padding: "0 6px" }}>
      {NAV_ITEMS.map(({ id, Icon, label, special }) => {

        if (special === "feeds") {
          const isActive = active === "readlater" || active.startsWith("folder:") || active.startsWith("feed:") || active.startsWith("smart:");
          return (
            <button
              key="feeds"
              onClick={onOpenFeeds}
              aria-label="Open feeds"
              style={btnStyle(isActive, false)}
              onTouchStart={e => { e.currentTarget.style.opacity = "0.6"; }}
              onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
              onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <Icon size={22} sw={isActive ? 1.8 : 1.4} />
              <RevealLabel label="Feeds" isActive={isActive} />
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
            onTouchStart={e => { e.currentTarget.style.opacity = "0.6"; }}
            onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
            onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
          >
            <span style={{ position: "relative", display: "flex" }}>
              <Icon size={22} sw={isActive ? 1.8 : 1.4} />
              {id === "inbox" && unreadCount > 0 && !isActive && (
                <span style={{
                  position: "absolute", top: -5, right: -7,
                  minWidth: 14, height: 14, borderRadius: 7,
                  background: T.accent, color: T.accentText,
                  fontSize: 8, fontWeight: 700, lineHeight: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 3px", boxSizing: "border-box",
                  boxShadow: "0 1px 4px rgba(0,0,0,.2)",
                }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            <RevealLabel label={label} isActive={isActive} />
          </button>
        );
      })}
    </nav>
  );
}
