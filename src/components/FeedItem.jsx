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

function getStoredProgress(url) {
  if (!url) return 0;
  try { return parseInt(localStorage.getItem(`fb-prog-${encodeURIComponent(url)}`), 10) || 0; } catch { return 0; }
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
  Star:       () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1.5l1.76 3.58 3.95.57-2.86 2.79.68 3.94L8 10.35l-3.53 1.03.68-3.94L2.29 5.65l3.95-.57L8 1.5z"/></svg>,
  StarFilled: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" stroke="none"><path d="M8 1.5l1.76 3.58 3.95.57-2.86 2.79.68 3.94L8 10.35l-3.53 1.03.68-3.94L2.29 5.65l3.95-.57L8 1.5z"/></svg>,
  Clock:    () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 1.2"/></svg>,
  External: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2.5h4.5V7M9.5 6.5l4-4M7 3H3.5A1 1 0 0 0 2.5 4v8.5A1 1 0 0 0 3.5 13.5H12A1 1 0 0 0 13 12.5V9"/></svg>,
  Play:     () => <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" stroke="none"><path d="M4 2.8l9 5.2-9 5.2V2.8z"/></svg>,
};

// ── Ghost action button (hover controls, no border/bg) ────────
function ActionBtn({ icon, title, onClick, T, color }) {
  function handleClick(e) {
    e.stopPropagation();
    onClick?.(e);
  }
  return (
    <button onClick={handleClick} title={title} aria-label={title} style={{
      background: "transparent", border: "none", borderRadius: 7,
      width: 28, height: 28,
      cursor: "pointer",
      color: color || T.textTertiary, fontFamily: "inherit",
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
// Left-swipe: reveals Read / Later / Star action buttons
// Right-swipe: directly marks read (green flash + haptic)
function SwipeRow({ children, onMarkRead, onReadLater, onSave, isRead, T, isMobile }) {
  const ACTION_W  = 140;
  const RIGHT_SNAP = 64;   // px to drag right before snapping to mark-read
  const [swipeX, setSwipeX] = useState(0);
  const [swiped, setSwiped]  = useState(false);
  const [rightX, setRightX] = useState(0);
  const touchRef = useRef(null);

  if (!isMobile) return <>{typeof children === "function" ? children({ swiped: false, close: () => {} }) : children}</>;

  function haptic() { try { navigator.vibrate?.(8); } catch {} }

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
      setRightX(0);
    } else if (swiped && dx > 0) {
      // Close the left panel
      e.preventDefault();
      setSwipeX(Math.min(0, -ACTION_W + dx));
    } else if (!swiped && dx > 0) {
      // Right swipe — mark-read reveal
      e.preventDefault();
      setRightX(Math.min(dx, RIGHT_SNAP + 16));
    }
  }
  function onTouchEnd() {
    touchRef.current = null;
    if (rightX >= RIGHT_SNAP) {
      haptic();
      onMarkRead?.();
      setRightX(0);
      setSwipeX(0);
      setSwiped(false);
    } else if (swipeX < -ACTION_W / 2) {
      setSwipeX(-ACTION_W); setSwiped(true);
    } else {
      setSwipeX(0); setSwiped(false);
    }
    setRightX(0);
  }
  function close() { setSwipeX(0); setSwiped(false); }

  const revealProgress = Math.min(rightX / RIGHT_SNAP, 1);

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* Left-side green mark-read reveal (right swipe) — only mounted when dragging */}
      {rightX > 0 && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: rightX,
          background: "#27AE60",
          display: "flex", alignItems: "center", paddingLeft: 16,
          overflow: "hidden",
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: Math.min(revealProgress * 2, 1), transform: `scale(${0.5 + revealProgress * 0.5})`, flexShrink: 0 }}>
            <path d="M3 10l5 5 9-9"/>
          </svg>
        </div>
      )}
      {/* Revealed action buttons (left-swipe → right side, iOS Mail style) */}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: ACTION_W, display: "flex" }}>
        <button onClick={e => { e.stopPropagation(); haptic(); onMarkRead?.(); close(); }}
          style={{ flex: 1, border: "none", background: isRead ? "#636366" : "#007AFF", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, letterSpacing: "-.01em" }}>
          {isRead ? <Ic.Unread /> : <Ic.Read />}
          {isRead ? "Unread" : "Read"}
        </button>
        <button onClick={e => { e.stopPropagation(); haptic(); onReadLater?.(); close(); }}
          style={{ flex: 1, border: "none", background: "#FF9500", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, letterSpacing: "-.01em" }}>
          <Ic.Clock />
          Later
        </button>
        <button onClick={e => { e.stopPropagation(); haptic(); onSave?.(); close(); }}
          style={{ flex: 1, border: "none", background: "#34C759", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, letterSpacing: "-.01em" }}>
          <Ic.Star />
          Star
        </button>
      </div>
      {/* Sliding row — translates for both left and right swipe */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${swipeX + rightX}px)`, transition: touchRef.current ? "none" : "transform .25s cubic-bezier(.25,.46,.45,.94)", position: "relative", zIndex: 1 }}
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

// ── List thumbnail — always rendered for visual consistency ──
function ListThumb({ item, cardSize, T }) {
  const ph = sourcePlaceholder(item.source);
  const fav = faviconUrl(item.url);
  const w = cardSize === "lg" ? 106 : 80;
  const h = cardSize === "lg" ? 80 : 60;
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = item.image && !imgFailed;
  const progress = getStoredProgress(item.url);

  return (
    <div style={{
      width: w, height: h, borderRadius: 9, flexShrink: 0, overflow: "hidden",
      background: showImg ? T.surface2 : ph.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      {showImg ? (
        <img src={item.image} alt="" loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setImgFailed(true)}
        />
      ) : fav ? (
        <img src={fav} alt="" width={cardSize === "lg" ? 31 : 24} height={cardSize === "lg" ? 31 : 24}
          style={{ borderRadius: 5, opacity: 0.9 }}
          onError={e => { e.target.style.display = "none"; }}
        />
      ) : (
        <span style={{ fontSize: cardSize === "lg" ? 24 : 19, fontWeight: 800, color: ph.color, opacity: 0.9 }}>
          {ph.initial}
        </span>
      )}
      {progress > 5 && progress < 95 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(0,0,0,.25)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: T.accent, transition: "width .3s" }} />
        </div>
      )}
    </div>
  );
}

// ── Square image thumbnail for mobile rows ────────────────────
function MobileThumb({ item, T }) {
  const ph = sourcePlaceholder(item.source);
  const yt = item.url ? parseYouTubeUrl(item.url) : { isYouTube: false };
  const src = yt.isYouTube
    ? `https://img.youtube.com/vi/${yt.videoId}/mqdefault.jpg`
    : item.image || null;
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;  // no image = no thumb, text fills full width
  return (
    <div style={{
      width: 92, height: 92, borderRadius: 11, flexShrink: 0,
      overflow: "hidden", background: T.surface2,
    }}>
      <img src={src} alt="" loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

// ── List view item (Things 3 task-row pattern) ───────────────
function ListItem({ item, onClick, onSave, onReadLater, onMarkRead, onPlayPodcast, isSelected, isRead, isSaved, cardSize = "md" }) {
  const { T } = useTheme();
  const { isMobile } = useBreakpoint();
  const [hovered, setHovered] = useState(false);
  const favicon = faviconUrl(item.url);

  // ── Mobile: iOS-style row — text left, square image right ──
  if (isMobile) {
    return (
      <SwipeRow onMarkRead={onMarkRead} onReadLater={onReadLater} onSave={onSave} isRead={isRead} T={T} isMobile={isMobile}>
        {({ swiped, close } = {}) => (
          <div
            onClick={swiped ? close : onClick}
            style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "14px 16px",
              cursor: "pointer",
              background: isSelected ? T.accentSurface : T.bg,
            }}
          >
            {/* Text LEFT */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Source + unread dot + date */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                {!isRead && (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.accent, flexShrink: 0 }} />
                )}
                <span style={{
                  fontSize: 12, fontWeight: 600, color: T.accent,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                }}>
                  {item.source}
                </span>
                {item.date && (
                  <span style={{ fontSize: 11, color: T.textTertiary, flexShrink: 0 }}>
                    {formatDate(item.date)}
                  </span>
                )}
              </div>

              {/* Title */}
              <div style={{
                fontFamily: "var(--reader-font-family)",
                fontSize: 18,
                fontWeight: isRead ? 400 : 600,
                color: isRead ? T.textSecondary : T.text,
                lineHeight: 1.35,
                overflow: "hidden", display: "-webkit-box",
                WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                letterSpacing: "-.01em",
                marginBottom: 6,
              }}>
                {item.title}
              </div>

              {/* Reading time / podcast duration */}
              <div style={{ fontSize: 12, color: T.textTertiary }}>
                {item.isPodcast && item.audioDuration
                  ? `▶ ${item.audioDuration}`
                  : item.description ? readingTime(item.description) : null}
              </div>
            </div>

            {/* Square image RIGHT */}
            <MobileThumb item={item} T={T} />
          </div>
        )}
      </SwipeRow>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────
  const vPad = cardSize === "sm" ? "8px 16px" : cardSize === "lg" ? "15px 20px" : "13px 18px";
  return (
    <SwipeRow onMarkRead={onMarkRead} onReadLater={onReadLater} onSave={onSave} isRead={isRead} T={T} isMobile={false}>
      {({ swiped, close } = {}) => (
        <div
          onClick={swiped ? close : onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: "relative",
            display: "flex", alignItems: "center", gap: 12,
            padding: vPad,
            margin: "0 6px",
            borderRadius: 12,
            cursor: "pointer",
            background: isSelected ? T.accentSurface : hovered ? T.surface : "transparent",
            transition: "background .15s",
          }}
        >
          {/* Thumbnail (md/lg) or type icon (sm) */}
          {cardSize !== "sm"
            ? <ListThumb item={item} cardSize={cardSize} T={T} />
            : <div style={{ width:26, height:26, flexShrink:0, borderRadius:7, background:hovered?T.accentSurface:T.surface, display:"flex", alignItems:"center", justifyContent:"center", color:hovered?T.accent:T.textTertiary, transition:"all .15s" }}><ContentTypeIcon item={item} /></div>
          }

          {/* Text block — layout never changes */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: cardSize !== "sm" ? "var(--reader-font-family)" : "inherit",
              fontSize: cardSize === "lg" ? 19 : cardSize === "sm" ? 14 : 17,
              fontWeight: isRead ? 400 : 600,
              color: isRead ? T.textTertiary : T.text,
              lineHeight: 1.35,
              overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: cardSize !== "sm" ? "normal" : "nowrap",
              display: "-webkit-box", WebkitLineClamp: cardSize === "lg" ? 3 : 2, WebkitBoxOrient: "vertical",
              letterSpacing: "-.01em",
              marginBottom: 4,
            }}>
              {item.title}
            </div>
            {cardSize !== "sm" && item.description && (
              <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", marginBottom: 4 }}>
                {item.description}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
              {favicon && (
                <img src={favicon} alt="" width={12} height={12}
                  style={{ borderRadius: 2, opacity: 0.75, flexShrink: 0 }}
                  onError={e => { e.target.style.display = "none"; }} />
              )}
              <span style={{ fontSize: 11, color: T.textTertiary }}>{item.source}</span>
              {item.date && <span style={{ fontSize: 11, color: T.textTertiary }}>· {formatDate(item.date)}</span>}
              {item.isPodcast && item.audioDuration && <span style={{ fontSize: 11, color: T.accent }}>· {item.audioDuration}</span>}
              {!item.isPodcast && item.description && <span style={{ fontSize: 11, color: T.textTertiary }}>· {readingTime(item.description)}</span>}
            </div>
          </div>

          {/* Unread dot — absolute so it doesn't affect layout */}
          {!isRead && !hovered && (
            <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", width: 6, height: 6, borderRadius: "50%", background: T.accent, pointerEvents: "none" }} />
          )}

          {/* Action buttons — absolute overlay, right-aligned, never shifts layout */}
          {hovered && (
            <div style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 0, background: T.bg, borderRadius: 8, boxShadow: `0 1px 6px rgba(0,0,0,.1)` }} onClick={e => e.stopPropagation()}>
              {item.isPodcast && onPlayPodcast && (
                <ActionBtn icon={<Ic.Play />} title="Play episode" onClick={() => onPlayPodcast(item)} T={T} />
              )}
              <ActionBtn icon={isRead ? <Ic.Unread /> : <Ic.Read />} title={isRead ? "Mark unread" : "Mark read"} onClick={onMarkRead} T={T} />
              <ActionBtn icon={<Ic.Clock />} title="Save for later" onClick={onReadLater} T={T} />
              <ActionBtn icon={isSaved ? <Ic.StarFilled /> : <Ic.Star />} title={isSaved ? "Starred" : "Star"} onClick={onSave} T={T} color={isSaved ? "#F59E0B" : undefined} />
              <ActionBtn icon={<Ic.External />} title="Open original" onClick={() => window.open(item.url, "_blank")} T={T} />
            </div>
          )}
        </div>
      )}
    </SwipeRow>
  );
}

// ── Card view item ────────────────────────────────────────────
function CardItem({ item, onClick, onSave, onReadLater, onMarkRead, onPlayPodcast, isSelected, isRead, isSaved, cardSize = "md" }) {
  const { T } = useTheme();
  const { isMobile } = useBreakpoint();
  const [hovered, setHovered] = useState(false);
  const yt = item.url ? parseYouTubeUrl(item.url) : { isYouTube: false };
  const favicon = faviconUrl(item.url);
  const thumb = yt.isYouTube
    ? `https://img.youtube.com/vi/${yt.videoId}/mqdefault.jpg`
    : item.image || null;
  const progress = getStoredProgress(item.url);

  return (
    <SwipeRow onMarkRead={onMarkRead} onReadLater={onReadLater} onSave={onSave} isRead={isRead} T={T} isMobile={isMobile}>
      {({ swiped, close } = {}) => (
        <div
          onClick={swiped ? close : onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: "relative",
            background: isSelected ? T.accentSurface : hovered ? T.surface : T.card,
            borderRadius: 12, overflow: "hidden", cursor: "pointer",
            transition: "background .15s",
            display: "flex", flexDirection: "column",
            height: "100%",
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
            {progress > 5 && progress < 95 && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(0,0,0,.25)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: T.accent }} />
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
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

          </div>

          {/* Action buttons — absolute overlay at card bottom, desktop hover only */}
          {hovered && !isMobile && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", alignItems: "center", padding: "6px 8px", background: T.surface }} onClick={e => e.stopPropagation()}>
              {item.isPodcast && onPlayPodcast && <ActionBtn icon={<Ic.Play />} title="Play" onClick={() => onPlayPodcast(item)} T={T} />}
              <ActionBtn icon={isRead ? <Ic.Unread /> : <Ic.Read />} title={isRead ? "Mark unread" : "Mark read"} onClick={onMarkRead} T={T} />
              <ActionBtn icon={<Ic.Clock />} title="Save for later" onClick={onReadLater} T={T} />
              <ActionBtn icon={isSaved ? <Ic.StarFilled /> : <Ic.Star />} title={isSaved ? "Starred" : "Star"} onClick={onSave} T={T} color={isSaved ? "#F59E0B" : undefined} />
              <div style={{ marginLeft: "auto" }}>
                <ActionBtn icon={<Ic.External />} title="Open original" onClick={() => window.open(item.url, "_blank")} T={T} />
              </div>
            </div>
          )}
        </div>
      )}
    </SwipeRow>
  );
}

// ── Public export ─────────────────────────────────────────────
export default function FeedItem({ item, viewMode = "list", cardSize = "md", onClick, onSave, onReadLater, onMarkRead, onPlayPodcast, isSelected = false, isRead = false, isSaved = false }) {
  if (viewMode === "card") {
    return <CardItem item={item} onClick={onClick} onSave={onSave} onReadLater={onReadLater} onMarkRead={onMarkRead} onPlayPodcast={onPlayPodcast} isSelected={isSelected} isRead={isRead} isSaved={isSaved} cardSize={cardSize} />;
  }
  return <ListItem item={item} onClick={onClick} onSave={onSave} onReadLater={onReadLater} onMarkRead={onMarkRead} onPlayPodcast={onPlayPodcast} isSelected={isSelected} isRead={isRead} isSaved={isSaved} cardSize={cardSize} />;
}
