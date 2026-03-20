import { useState, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { parseYouTubeUrl } from "../lib/fetchers";

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr), now = new Date(), diff = now - d;
    if (diff < 3600000)   return `${Math.round(diff / 60000)}m ago`;
    if (diff < 86400000)  return `${Math.round(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.round(diff / 86400000)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

function readingTime(text) {
  if (!text) return null;
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

function faviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch { return null; }
}

// ── Action button (hover controls) ───────────────────────────
function ActionBtn({ icon, label, title, onClick, T, small = false }) {
  function handleClick(e) {
    e.stopPropagation();
    onClick?.(e);
  }
  return (
    <button onClick={handleClick} title={title || label} style={{
      background: T.surface2, border: "none", borderRadius: 7,
      padding: small ? "4px 8px" : "5px 9px",
      cursor: "pointer", fontSize: small ? 11 : 12,
      color: T.textSecondary, fontFamily: "inherit",
      display: "flex", alignItems: "center", gap: 4,
      transition: "background .1s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = T.surface}
      onMouseLeave={e => e.currentTarget.style.background = T.surface2}
    >
      <span>{icon}</span>
      {label && <span style={{ fontWeight: 500 }}>{label}</span>}
    </button>
  );
}

// ── Swipe wrapper — only active on mobile ─────────────────────
// Wraps a row and exposes 3 action buttons on swipe-left
function SwipeRow({ children, onMarkRead, onReadLater, onSave, isRead, T, isMobile }) {
  const ACTION_W = 140;
  const [swipeX, setSwipeX] = useState(0);
  const [swiped, setSwiped]  = useState(false);
  const touchRef = useRef(null);

  if (!isMobile) return <>{typeof children === "function" ? children({ swiped: false, close: () => {} }) : children}</>;

  function onTouchStart(e) {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchMove(e) {
    if (!touchRef.current) return;
    const dx = e.touches[0].clientX - touchRef.current.x;
    const dy = e.touches[0].clientY - touchRef.current.y;
    if (Math.abs(dy) > Math.abs(dx) + 8) { touchRef.current = null; return; }
    if (dx < 0) {
      e.preventDefault();
      setSwipeX(Math.max(dx, -ACTION_W));
    } else if (swiped && dx > 0) {
      e.preventDefault();
      setSwipeX(Math.min(0, -ACTION_W + dx));
    }
  }
  function onTouchEnd() {
    touchRef.current = null;
    if (swipeX < -ACTION_W / 2) { setSwipeX(-ACTION_W); setSwiped(true); }
    else { setSwipeX(0); setSwiped(false); }
  }
  function close() { setSwipeX(0); setSwiped(false); }

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* Revealed action buttons */}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: ACTION_W, display: "flex" }}>
        <button onClick={e => { e.stopPropagation(); onMarkRead?.(); close(); }}
          style={{ flex: 1, border: "none", background: isRead ? "#8A9099" : "#2F6FED", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
          <span style={{ fontSize: 16 }}>{isRead ? "○" : "●"}</span>
          {isRead ? "Unread" : "Read"}
        </button>
        <button onClick={e => { e.stopPropagation(); onReadLater?.(); close(); }}
          style={{ flex: 1, border: "none", background: "#AA8439", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
          <span style={{ fontSize: 16 }}>⏱</span>
          Later
        </button>
        <button onClick={e => { e.stopPropagation(); onSave?.(); close(); }}
          style={{ flex: 1, border: "none", background: "#4BBFAF", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
          <span style={{ fontSize: 16 }}>🔖</span>
          Save
        </button>
      </div>
      {/* Sliding row */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${swipeX}px)`, transition: touchRef.current ? "none" : "transform .25s cubic-bezier(.25,.46,.45,.94)", position: "relative", zIndex: 1 }}
      >
        {typeof children === "function" ? children({ swiped, close }) : children}
      </div>
    </div>
  );
}

// ── List view item ────────────────────────────────────────────
function ListItem({ item, onClick, onSave, onReadLater, onMarkRead, onPlayPodcast, isSelected, isRead, cardSize = "md" }) {
  const { T } = useTheme();
  const { isMobile } = useBreakpoint();
  const [hovered, setHovered] = useState(false);
  const favicon = faviconUrl(item.url);

  return (
    <SwipeRow onMarkRead={onMarkRead} onReadLater={onReadLater} onSave={onSave} isRead={isRead} T={T} isMobile={isMobile}>
      {({ swiped, close } = {}) => (
        <div
          onClick={swiped ? close : onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: cardSize === "lg" ? "14px 18px" : cardSize === "sm" ? "7px 14px" : "10px 16px",
            borderBottom: `1px solid ${T.border}`,
            cursor: "pointer",
            background: isSelected ? T.accentSurface : hovered ? T.surface : "transparent",
            transition: "background .1s",
          }}
        >
          {/* Favicon */}
          <div style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 4, overflow: "hidden", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {favicon
              ? <img src={favicon} alt="" width={16} height={16} style={{ display: "block" }} onError={e => { e.target.style.display = "none"; }} />
              : <span style={{ fontSize: 10 }}>📰</span>
            }
          </div>

          {/* Thumbnail */}
          {item.image && (
            <img src={item.image} alt="" loading="lazy"
              style={{ width: cardSize === "lg" ? 96 : cardSize === "sm" ? 36 : 60, height: cardSize === "lg" ? 64 : cardSize === "sm" ? 36 : 44, borderRadius: 7, objectFit: "cover", flexShrink: 0, background: T.surface2 }}
              onError={e => { e.target.style.display = "none"; }} />
          )}

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: cardSize === "lg" ? 15 : cardSize === "sm" ? 13 : 15, fontWeight: isRead ? 400 : 600, color: isRead ? T.textTertiary : T.text, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: (isMobile || cardSize === "lg") ? "normal" : "nowrap", ...(isMobile && { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }), letterSpacing: "-.01em" }}>
              {item.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: T.textTertiary, fontWeight: 500 }}>{item.source}</span>
              {item.date && <span style={{ fontSize: 11, color: T.textTertiary }}>· {formatDate(item.date)}</span>}
              {item.isPodcast && item.audioDuration && <span style={{ fontSize: 11, color: T.accent }}>· ▶ {item.audioDuration}</span>}
              {!item.isPodcast && item.description && <span style={{ fontSize: 11, color: T.textTertiary }}>· {readingTime(item.description)}</span>}
            </div>
          </div>

          {/* Hover actions — desktop only */}
          {hovered && !isMobile && (
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
              {item.isPodcast && onPlayPodcast && (
                <ActionBtn icon="▶" title="Play episode" onClick={() => onPlayPodcast(item)} T={T} />
              )}
              <ActionBtn icon={isRead ? "○" : "●"} title={isRead ? "Mark unread" : "Mark read"} onClick={onMarkRead} T={T} />
              <ActionBtn icon="🔖" title="Save" onClick={onSave} T={T} />
              <ActionBtn icon="⏱" title="Read later" onClick={onReadLater} T={T} />
              <ActionBtn icon="↗" title="Open original" onClick={() => window.open(item.url, "_blank")} T={T} />
            </div>
          )}
        </div>
      )}
    </SwipeRow>
  );
}

// ── Card view item ────────────────────────────────────────────
function CardItem({ item, onClick, onSave, onReadLater, onMarkRead, isSelected, isRead, cardSize = "md" }) {
  const { T } = useTheme();
  const { isMobile } = useBreakpoint();
  const [hovered, setHovered] = useState(false);
  const yt = item.url ? parseYouTubeUrl(item.url) : { isYouTube: false };
  const favicon = faviconUrl(item.url);
  const thumb = yt.isYouTube
    ? `https://img.youtube.com/vi/${yt.videoId}/mqdefault.jpg`
    : item.image || null;

  return (
    <SwipeRow onMarkRead={onMarkRead} onReadLater={onReadLater} onSave={onSave} isRead={isRead} T={T} isMobile={isMobile}>
      {({ swiped, close } = {}) => (
        <div
          onClick={swiped ? close : onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: isSelected ? T.accentSurface : T.card,
            border: `1px solid ${isSelected ? T.accent : hovered ? T.borderStrong : T.border}`,
            borderRadius: 12, overflow: "hidden", cursor: "pointer",
            transition: "border-color .12s, box-shadow .12s",
            boxShadow: hovered ? "0 4px 16px rgba(0,0,0,.08)" : "0 1px 3px rgba(0,0,0,.04)",
            display: "flex", flexDirection: "column",
          }}
        >
          {/* Hero image */}
          <div style={{
            position: "relative", flexShrink: 0, overflow: "hidden",
            paddingBottom: cardSize === "lg" ? "43.75%" : cardSize === "sm" ? "75%" : "56.25%", // 16/7, 16/12, 16/9
            background: thumb ? T.surface2 : `linear-gradient(135deg, ${T.surface2} 0%, ${T.border} 100%)`,
          }}>
            {thumb && (
              <img src={thumb} alt="" loading="lazy"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={e => { e.target.style.display = "none"; }}
              />
            )}
            {yt.isYouTube && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 14, marginLeft: 2 }}>▶</span>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", flex: 1 }}>
            {/* Source + date */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              {favicon && (
                <img src={favicon} alt="" width={12} height={12} style={{ borderRadius: 2, opacity: 0.7 }} onError={e => { e.target.style.display = "none"; }} />
              )}
              <span style={{ fontSize: 11, fontWeight: 600, color: T.accent, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.source}
              </span>
              {item.date && (
                <span style={{ fontSize: 10, color: T.textTertiary, marginLeft: "auto", flexShrink: 0 }}>{formatDate(item.date)}</span>
              )}
            </div>

            {/* Title */}
            <div style={{
              fontSize: cardSize === "lg" ? 15 : cardSize === "sm" ? 12 : 13,
              fontWeight: isRead ? 400 : 600,
              color: isRead ? T.textTertiary : T.text,
              lineHeight: 1.4, marginBottom: 6,
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: cardSize === "lg" ? 3 : 2,
              WebkitBoxOrient: "vertical",
              letterSpacing: "-.01em",
            }}>
              {item.title}
            </div>

            {/* Description */}
            {cardSize !== "sm" && item.description && (
              <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", marginBottom: 10, flex: 1 }}>
                {item.description}
              </div>
            )}

            {/* Reading time + date row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: cardSize !== "sm" ? 6 : 0, marginBottom: 8 }}>
              {item.description && (
                <span style={{ fontSize: 10, color: T.textTertiary }}>
                  {readingTime(item.description)}
                </span>
              )}
              {item.date && item.description && <span style={{ fontSize: 10, color: T.textTertiary }}>·</span>}
              {item.isPodcast && item.audioDuration && (
                <span style={{ fontSize: 10, color: T.accent }}>▶ {item.audioDuration}</span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 6, marginTop: "auto" }} onClick={e => e.stopPropagation()}>
              <ActionBtn icon="📖" label="Read" onClick={onClick} T={T} small />
              <ActionBtn icon="🔖" label="Save" onClick={onSave} T={T} small />
              <ActionBtn icon="⏱" label="Later" onClick={onReadLater} T={T} small />
              <div style={{ marginLeft: "auto" }}>
                <ActionBtn icon="↗" title="Open original" onClick={() => window.open(item.url, "_blank")} T={T} small />
              </div>
            </div>
          </div>
        </div>
      )}
    </SwipeRow>
  );
}

// ── Public export ─────────────────────────────────────────────
export default function FeedItem({ item, viewMode = "list", cardSize = "md", onClick, onSave, onReadLater, onMarkRead, onPlayPodcast, isSelected = false, isRead = false }) {
  if (viewMode === "card") {
    return <CardItem item={item} onClick={onClick} onSave={onSave} onReadLater={onReadLater} onMarkRead={onMarkRead} onPlayPodcast={onPlayPodcast} isSelected={isSelected} isRead={isRead} cardSize={cardSize} />;
  }
  return <ListItem item={item} onClick={onClick} onSave={onSave} onReadLater={onReadLater} onMarkRead={onMarkRead} onPlayPodcast={onPlayPodcast} isSelected={isSelected} isRead={isRead} cardSize={cardSize} />;
}
