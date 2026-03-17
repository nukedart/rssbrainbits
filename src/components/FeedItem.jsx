import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
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

// Returns a favicon URL for a given article URL using Google's service

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

// ── List view item (Reeder-style compact row) ────────────────
function ListItem({ item, onClick, onSave, onReadLater, onMarkRead, isSelected, isRead, cardSize = "md" }) {
  const { T } = useTheme();
  const [hovered, setHovered] = useState(false);
  const yt = item.url ? parseYouTubeUrl(item.url) : { isYouTube: false };
  const favicon = faviconUrl(item.url);
  const thumb = yt.isYouTube
    ? `https://img.youtube.com/vi/${yt.videoId}/mqdefault.jpg`
    : item.image || null;

  return (
    <div
      onClick={onClick}
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

      {/* Thumbnail — size adapts to cardSize */}
      {thumb && (
        <img src={thumb} alt="" loading="lazy" onError={e => { e.target.style.display = "none"; }}
          style={{
            width:  cardSize === "lg" ? 96 : cardSize === "sm" ? 36 : 60,
            height: cardSize === "lg" ? 64 : cardSize === "sm" ? 36 : 44,
            borderRadius: 7, objectFit: "cover", flexShrink: 0, background: T.surface2,
          }} />
      )}

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: cardSize === "lg" ? 14 : cardSize === "sm" ? 12 : 13, fontWeight: isRead ? 400 : 500, color: isRead ? T.textTertiary : T.text, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: cardSize === "lg" ? "normal" : "nowrap", WebkitLineClamp: cardSize === "lg" ? 2 : 1, display: cardSize === "lg" ? "-webkit-box" : "block", WebkitBoxOrient: "vertical" }}>
          {item.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: T.textTertiary, fontWeight: 500 }}>{item.source}</span>
          {item.date && <span style={{ fontSize: 11, color: T.textTertiary }}>· {formatDate(item.date)}</span>}
          {item.description && <span style={{ fontSize: 11, color: T.textTertiary }}>· {readingTime(item.description)}</span>}
        </div>
      </div>

      {/* Hover actions */}
      {hovered && (
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <ActionBtn icon={isRead ? "○" : "●"} title={isRead ? "Mark unread" : "Mark read"} onClick={onMarkRead} T={T} />
          <ActionBtn icon="🔖" title="Save" onClick={onSave} T={T} />
          <ActionBtn icon="⏱" title="Read later" onClick={onReadLater} T={T} />
          <ActionBtn icon="↗" title="Open original" onClick={() => window.open(item.url, "_blank")} T={T} />
        </div>
      )}
    </div>
  );
}

// ── Card view item (Reeder magazine-style) ───────────────────
function CardItem({ item, onClick, onSave, onReadLater, onMarkRead, isSelected, isRead, cardSize='md' }) {
  const { T } = useTheme();
  const [hovered, setHovered] = useState(false);
  const yt = item.url ? parseYouTubeUrl(item.url) : { isYouTube: false };
  const favicon = faviconUrl(item.url);
  const thumb = yt.isYouTube
    ? `https://img.youtube.com/vi/${yt.videoId}/mqdefault.jpg`
    : item.image || null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isSelected ? T.accentSurface : T.card,
        border: `1px solid ${isSelected ? T.accent : hovered ? T.borderStrong : T.border}`,
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color .12s, box-shadow .12s",
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,.08)" : "0 1px 3px rgba(0,0,0,.04)",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Hero image — size adapts to cardSize */}
      <div style={{
        aspectRatio: cardSize === "lg" ? "16/7" : cardSize === "sm" ? "16/12" : "16/9",
        overflow: "hidden", flexShrink: 0,
        background: thumb ? T.surface2 : `linear-gradient(135deg, ${T.surface2} 0%, ${T.border} 100%)`,
        position: "relative",
      }}>
        {thumb ? (
          <img src={thumb} alt="" loading="lazy"
            onError={e => {
              e.target.style.display = "none";
              e.target.parentElement.style.background = `linear-gradient(135deg, ${T.surface2} 0%, ${T.border} 100%)`;
            }}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform .4s ease" }}
            onMouseEnter={e => { e.target.style.transform = "scale(1.04)"; }}
            onMouseLeave={e => { e.target.style.transform = "scale(1)"; }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {favicon
              ? <img src={favicon} alt="" style={{ width: 28, height: 28, borderRadius: 6, opacity: 0.5 }} />
              : <span style={{ fontSize: 28, opacity: 0.3 }}>📰</span>
            }
            <span style={{ fontSize: 10, color: T.textTertiary, opacity: 0.6, maxWidth: "80%", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.source}
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 14px 10px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Source row with favicon */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div style={{ width: 16, height: 16, borderRadius: 3, overflow: "hidden", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {favicon
              ? <img src={favicon} alt="" width={14} height={14} style={{ display: "block" }} onError={e => { e.target.style.display = "none"; }} />
              : <span style={{ fontSize: 9 }}>📰</span>
            }
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.source}
          </span>
          {item.date && <span style={{ fontSize: 10, color: T.textTertiary, flexShrink: 0 }}>{formatDate(item.date)}</span>}
        </div>

        {/* Title */}
        <div style={{
          fontSize: cardSize === "lg" ? 15 : cardSize === "sm" ? 12 : 13,
          fontWeight: 600, color: T.text, lineHeight: 1.45,
          flex: 1,
          display: "-webkit-box",
          WebkitLineClamp: cardSize === "lg" ? 4 : cardSize === "sm" ? 2 : 3,
          WebkitBoxOrient: "vertical", overflow: "hidden",
          marginBottom: 10,
        }}>
          {item.title}
        </div>

        {/* Description — hidden on small cards */}
        {item.description && cardSize !== "sm" && (
          <div style={{
            fontSize: cardSize === "lg" ? 13 : 12,
            color: T.textSecondary, lineHeight: 1.6, marginBottom: 10,
            display: "-webkit-box",
            WebkitLineClamp: cardSize === "lg" ? 4 : 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {item.description}
          </div>
        )}

        {/* Action row */}
        <div style={{ display: "flex", gap: 6, marginTop: "auto" }} onClick={e => e.stopPropagation()}>
          <ActionBtn icon="📖" label="Read" onClick={onClick} T={T} small />
          <ActionBtn icon="🔖" label="Save" onClick={onSave} T={T} small />
          <ActionBtn icon="⏱" label="Later" onClick={onReadLater} T={T} small />
          <div style={{ flex: 1 }} />
          <ActionBtn icon="↗" title="Open original" onClick={() => window.open(item.url, "_blank")} T={T} />
        </div>
      </div>
    </div>
  );
}

// ── Shared action button ──────────────────────────────────────
function ActionBtn({ icon, label, title, onClick, T, small = false }) {
  const [flash, setFlash] = useState(false);
  function handleClick(e) {
    e.stopPropagation();
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
    onClick?.(e);
  }
  return (
    <button onClick={handleClick} title={title || label} style={{
      display: "flex", alignItems: "center", gap: 4,
      background: flash ? T.accentSurface : T.surface,
      border: `1px solid ${flash ? T.accent : T.border}`,
      borderRadius: 7, padding: small ? "4px 8px" : "4px 7px",
      cursor: "pointer", fontSize: 11, fontWeight: 600,
      color: flash ? T.accentText : T.textSecondary,
      fontFamily: "inherit", transition: "all .15s",
      whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      {label && <span>{label}</span>}
    </button>
  );
}

// ── Public export — switches between list/card based on viewMode ──
export default function FeedItem({ item, onClick, onDelete, onSave, onReadLater, onMarkRead, isSelected = false, isRead = false, viewMode = "list", cardSize = "md" }) {
  if (viewMode === "card") {
    return <CardItem item={item} onClick={onClick} onSave={onSave} onReadLater={onReadLater} onMarkRead={onMarkRead} isSelected={isSelected} isRead={isRead} cardSize={cardSize} />;
  }
  return <ListItem item={item} onClick={onClick} onSave={onSave} onReadLater={onReadLater} onMarkRead={onMarkRead} isSelected={isSelected} isRead={isRead} cardSize={cardSize} />;
}
