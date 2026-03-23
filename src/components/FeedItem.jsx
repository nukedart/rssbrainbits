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

function sourcePlaceholder(source) {
  // Deterministic color from source name
  let hash = 0;
  for (let i = 0; i < (source || "").length; i++) hash = (hash * 31 + source.charCodeAt(i)) & 0xffffffff;
  const hue = Math.abs(hash) % 360;
  return {
    bg: `linear-gradient(135deg, hsl(${hue},45%,28%) 0%, hsl(${(hue+40)%360},35%,18%) 100%)`,
    initial: (source || "?")[0].toUpperCase(),
    color: `hsl(${hue},60%,75%)`,
  };
}

// ── Cohesive SVG icon set for feed item actions ───────────────
const Ic = {
  Read:     () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 8C3.2 4.2 5.4 2.8 8 2.8S12.8 4.2 14.5 8C12.8 11.8 10.6 13.2 8 13.2S3.2 11.8 1.5 8z"/><circle cx="8" cy="8" r="2.3"/></svg>,
  Unread:   () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 8C3.2 4.2 5.4 2.8 8 2.8S12.8 4.2 14.5 8C12.8 11.8 10.6 13.2 8 13.2S3.2 11.8 1.5 8z"/><circle cx="8" cy="8" r="2.3" fill="currentColor"/></svg>,
  Star:     () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1.5l1.76 3.58 3.95.57-2.86 2.79.68 3.94L8 10.35l-3.53 1.03.68-3.94L2.29 5.65l3.95-.57L8 1.5z"/></svg>,
  Clock:    () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 1.2"/></svg>,
  External: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2.5h4.5V7M9.5 6.5l4-4M7 3H3.5A1 1 0 0 0 2.5 4v8.5A1 1 0 0 0 3.5 13.5H12A1 1 0 0 0 13 12.5V9"/></svg>,
  Play:     () => <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" stroke="none"><path d="M4 2.8l9 5.2-9 5.2V2.8z"/></svg>,
};

// ── Ghost action button (hover controls, no border/bg) ────────
function ActionBtn({ icon, title, onClick, T }) {
  function handleClick(e) {
    e.stopPropagation();
    onClick?.(e);
  }
  return (
    <button onClick={handleClick} title={title} style={{
      background: "transparent", border: "none", borderRadius: 7,
      width: 28, height: 28,
      cursor: "pointer",
      color: T.textTertiary, fontFamily: "inherit",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "color .1s, background .1s",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.color = T.text; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textTertiary; }}
    >
      {icon}
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
          style={{ flex: 1, border: "none", background: isRead ? "#8A9099" : "#2F6FED", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {isRead ? <Ic.Unread /> : <Ic.Read />}
          {isRead ? "Unread" : "Read"}
        </button>
        <button onClick={e => { e.stopPropagation(); onReadLater?.(); close(); }}
          style={{ flex: 1, border: "none", background: "#AA8439", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <Ic.Clock />
          Later
        </button>
        <button onClick={e => { e.stopPropagation(); onSave?.(); close(); }}
          style={{ flex: 1, border: "none", background: "#accfae", color: "#03210b", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <Ic.Star />
          Star
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

// ── Content type icon ─────────────────────────────────────────
function ContentTypeIcon({ item }) {
  const isYT = item.url ? parseYouTubeUrl(item.url).isYouTube : false;
  if (item.isPodcast) return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="3"/>
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"/>
    </svg>
  );
  if (isYT) return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 5.5l4 2.5-4 2.5V5.5z" fill="currentColor" stroke="none"/>
      <rect x="1.5" y="2.5" width="13" height="11" rx="3"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="2" y="1.5" width="12" height="13" rx="2"/>
      <path d="M5 5.5h6M5 8h5M5 10.5h3.5"/>
    </svg>
  );
}

// ── List view item (Things 3 task-row pattern) ───────────────
function ListItem({ item, onClick, onSave, onReadLater, onMarkRead, onPlayPodcast, isSelected, isRead, cardSize = "md" }) {
  const { T } = useTheme();
  const { isMobile } = useBreakpoint();
  const [hovered, setHovered] = useState(false);
  const vPad = cardSize === "sm" ? (isMobile ? "9px 16px" : "6px 16px") : cardSize === "lg" ? "14px 20px" : (isMobile ? "12px 16px" : "11px 20px");

  return (
    <SwipeRow onMarkRead={onMarkRead} onReadLater={onReadLater} onSave={onSave} isRead={isRead} T={T} isMobile={isMobile}>
      {({ swiped, close } = {}) => (
        <div
          onClick={swiped ? close : onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: vPad,
            margin: "0 6px",
            borderRadius: 12,
            cursor: "pointer",
            background: isSelected ? T.accentSurface : hovered ? T.surface : "transparent",
            transition: "background .15s",
          }}
        >
          {/* Content type icon — small pill */}
          <div style={{
            width: 26, height: 26, flexShrink: 0, borderRadius: 7,
            background: hovered ? T.accentSurface : T.surface,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: hovered ? T.accent : T.textTertiary,
            transition: "all .15s",
          }}>
            <ContentTypeIcon item={item} />
          </div>

          {/* Thumbnail — LEFT of text, always shown when available */}
          {item.image && cardSize !== "sm" && (
            <img src={item.image} alt="" loading="lazy"
              style={{
                width: cardSize === "lg" ? 88 : 64,
                height: cardSize === "lg" ? 66 : 48,
                borderRadius: 8, objectFit: "cover", flexShrink: 0, background: T.surface2,
              }}
              onError={e => { e.target.style.display = "none"; }} />
          )}

          {/* Text block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: cardSize === "lg" ? 15 : 14,
              fontWeight: isRead ? 400 : 500,
              color: isRead ? T.textTertiary : T.text,
              lineHeight: 1.35,
              overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: (isMobile || cardSize === "lg") ? "normal" : "nowrap",
              ...(isMobile && { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }),
              letterSpacing: "-.01em",
            }}>
              {item.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
              {faviconUrl(item.url) && (
                <img src={faviconUrl(item.url)} alt="" width={12} height={12}
                  style={{ borderRadius: 2, opacity: 0.75, flexShrink: 0 }}
                  onError={e => { e.target.style.display = "none"; }} />
              )}
              <span style={{ fontSize: 11, color: T.textTertiary }}>{item.source}</span>
              {item.date && <span style={{ fontSize: 11, color: T.textTertiary }}>· {formatDate(item.date)}</span>}
              {item.isPodcast && item.audioDuration && <span style={{ fontSize: 11, color: T.accent }}>· {item.audioDuration}</span>}
              {!item.isPodcast && item.description && <span style={{ fontSize: 11, color: T.textTertiary }}>· {readingTime(item.description)}</span>}
            </div>
          </div>

          {/* Right: hover actions or unread dot */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            {/* Hover actions */}
            {hovered && !isMobile && (
              <div style={{ display: "flex", gap: 0, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {item.isPodcast && onPlayPodcast && (
                  <ActionBtn icon={<Ic.Play />} title="Play episode" onClick={() => onPlayPodcast(item)} T={T} />
                )}
                <ActionBtn icon={isRead ? <Ic.Unread /> : <Ic.Read />} title={isRead ? "Mark unread" : "Mark read"} onClick={onMarkRead} T={T} />
                <ActionBtn icon={<Ic.Star />} title="Star" onClick={onSave} T={T} />
                <ActionBtn icon={<Ic.Clock />} title="Save" onClick={onReadLater} T={T} />
                <ActionBtn icon={<Ic.External />} title="Open original" onClick={() => window.open(item.url, "_blank")} T={T} />
              </div>
            )}

            {/* Unread indicator dot (non-hover, desktop only) */}
            {!hovered && !isMobile && !isRead && (
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, flexShrink: 0, opacity: 0.9 }} />
            )}
          </div>
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
            background: isSelected ? T.accentSurface : hovered ? T.surface : T.card,
            borderRadius: 12, overflow: "hidden", cursor: "pointer",
            transition: "background .15s",
            display: "flex", flexDirection: "column",
          }}
        >
          {/* Hero image */}
          <div style={{
            position: "relative", flexShrink: 0, overflow: "hidden",
            paddingBottom: cardSize === "lg" ? "62.5%" : cardSize === "sm" ? "75%" : "72%",
            background: thumb ? T.surface2 : sourcePlaceholder(item.source).bg,
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
            {!thumb && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: cardSize === "lg" ? 40 : 28, fontWeight: 800, color: sourcePlaceholder(item.source).color, opacity: 0.9, letterSpacing: "-.02em", userSelect: "none" }}>
                  {sourcePlaceholder(item.source).initial}
                </span>
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
              fontFamily: "var(--reader-font-family)",
              fontSize: cardSize === "lg" ? 16 : cardSize === "sm" ? 13 : 14,
              fontWeight: isRead ? 400 : 600,
              color: isRead ? T.textTertiary : T.text,
              lineHeight: 1.35, marginBottom: 6,
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
              <ActionBtn icon="⭐" label="Star" onClick={onSave} T={T} small />
              <ActionBtn icon="🔖" label="Save" onClick={onReadLater} T={T} small />
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
