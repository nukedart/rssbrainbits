import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { getReadLater, addReadLater, removeReadLater } from "../lib/supabase";
import { Spinner } from "../components/UI";

const ContentViewer = lazy(() => import("../components/ContentViewer"));

function navDirScroll(e) {
  const el = e.currentTarget, top = el.scrollTop, delta = top - (el._lastTop ?? top);
  el._lastTop = top;
  if (top < 80) { el._acc = 0; window.dispatchEvent(new CustomEvent("fb-nav-dir", { detail: "up" })); return; }
  if (Math.abs(delta) < 1) return;
  el._acc = (el._acc ?? 0) + delta;
  if (el._acc > 60) { el._acc = 0; window.dispatchEvent(new CustomEvent("fb-nav-dir", { detail: "down" })); }
  else if (el._acc < -60) { el._acc = 0; window.dispatchEvent(new CustomEvent("fb-nav-dir", { detail: "up" })); }
}

function relTime(iso) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7)  return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function favicon(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`; }
  catch { return null; }
}

function srcOf(item) {
  return item.source || ((() => { try { return new URL(item.url).hostname; } catch { return "?"; } })());
}

// ── Main page ─────────────────────────────────────────────────
export default function ReadLaterPage() {
  const { T }        = useTheme();
  const { user }     = useAuth();
  const { isMobile } = useBreakpoint();

  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [openItem,   setOpenItem]   = useState(null);
  const [activeSource, setActiveSrc] = useState("All");
  const [showAdd,    setShowAdd]    = useState(false);
  const [addUrl,     setAddUrl]     = useState("");
  const [addLoading, setAddLoad]    = useState(false);
  const [addError,   setAddError]   = useState("");

  useEffect(() => {
    if (!user) return;
    getReadLater(user.id).then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  function handleRemove(url, e) {
    e?.stopPropagation();
    removeReadLater(user.id, url).catch(() => {});
    setItems(prev => prev.filter(i => i.url !== url));
    if (openItem?.url === url) setOpenItem(null);
  }

  async function handleAddUrl() {
    if (!addUrl.trim()) return;
    setAddLoad(true); setAddError("");
    try {
      const url = addUrl.trim();
      let item = { url, title: url, source: (() => { try { return new URL(url).hostname; } catch { return url; } })() };
      try {
        const { fetchArticleContent } = await import("../lib/fetchers");
        const c = await fetchArticleContent(url);
        item = { url, title: c.title || url, source: new URL(url).hostname, description: c.description, image: c.image };
      } catch {}
      await addReadLater(user.id, item);
      setItems(prev => [{ ...item, saved_at: new Date().toISOString(), is_read_later: true }, ...prev]);
      setAddUrl(""); setShowAdd(false);
    } catch (err) {
      setAddError(err.message || "Failed to save article.");
    } finally { setAddLoad(false); }
  }

  // Source pills — sorted by count desc
  const sources = useMemo(() => {
    const map = {};
    items.forEach(i => { const s = srcOf(i); map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([src, count]) => ({ src, count }));
  }, [items]);

  const filtered = useMemo(
    () => activeSource === "All" ? items : items.filter(i => srcOf(i) === activeSource),
    [items, activeSource]
  );

  const { todayItems, weekItems, olderItems } = useMemo(() => {
    const now = Date.now();
    const bucket = (i) => {
      const age = now - new Date(i.saved_at || 0).getTime();
      if (age < 86400000)  return "today";
      if (age < 604800000) return "week";
      return "older";
    };
    return {
      todayItems: filtered.filter(i => bucket(i) === "today"),
      weekItems:  filtered.filter(i => bucket(i) === "week"),
      olderItems: filtered.filter(i => bucket(i) === "older"),
    };
  }, [filtered]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{
        padding: "14px 20px 12px", borderBottom: `1px solid ${T.border}`,
        flexShrink: 0, display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: "-.01em" }}>Saved</div>
          {!loading && (
            <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>
              {items.length} article{items.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          title="Save article URL"
          aria-label="Save article URL"
          aria-expanded={showAdd}
          style={{
            width: 32, height: 32, borderRadius: 9, border: "none",
            background: showAdd ? T.accent : T.surface2,
            color: showAdd ? T.accentText : T.textSecondary,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
            <path d="M8 2v12M2 8h12"/>
          </svg>
        </button>
      </div>

      {/* ── Add URL bar ─────────────────────────────────────── */}
      {showAdd && (
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, flexShrink: 0, background: T.surface }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              autoFocus value={addUrl}
              onChange={e => { setAddUrl(e.target.value); setAddError(""); }}
              onKeyDown={e => {
                if (e.key === "Enter") handleAddUrl();
                if (e.key === "Escape") { setShowAdd(false); setAddUrl(""); setAddError(""); }
              }}
              placeholder="Paste an article URL…"
              style={{
                flex: 1, background: T.bg, border: `1.5px solid ${T.accent}`,
                borderRadius: 10, padding: "9px 14px", fontSize: 13,
                color: T.text, fontFamily: "inherit", outline: "none",
              }}
            />
            <button onClick={handleAddUrl} disabled={!addUrl.trim() || addLoading} style={{
              background: T.accent, border: "none", borderRadius: 10,
              padding: "9px 18px", cursor: "pointer", fontSize: 13,
              fontWeight: 600, color: T.accentText, fontFamily: "inherit",
              opacity: (!addUrl.trim() || addLoading) ? 0.5 : 1, flexShrink: 0,
            }}>{addLoading ? "Saving…" : "Save"}</button>
            <button onClick={() => { setShowAdd(false); setAddUrl(""); setAddError(""); }} style={{
              background: T.surface2, border: "none", borderRadius: 10,
              padding: "9px 14px", cursor: "pointer", fontSize: 13,
              color: T.textSecondary, fontFamily: "inherit", flexShrink: 0,
            }}>Cancel</button>
          </div>
          {addError && (
            <div style={{ fontSize: 12, color: T.danger, marginTop: 8, padding: "6px 10px", background: `${T.danger}18`, borderRadius: 7 }}>
              {addError}
            </div>
          )}
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────── */}
      <div onScroll={navDirScroll} style={{ flex: 1, overflowY: "auto" }}>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
            <Spinner size={28} />
          </div>
        )}

        {!loading && items.length === 0 && <EmptyState T={T} />}

        {!loading && items.length > 0 && (
          <>
            {/* Source filter pills */}
            {sources.length > 1 && (
              <div style={{
                display: "flex", gap: 6, padding: "10px 20px",
                overflowX: "auto", scrollbarWidth: "none",
                borderBottom: `1px solid ${T.border}`,
              }}>
                {[{ src: "All", count: items.length }, ...sources].map(({ src, count }) => {
                  const active = activeSource === src;
                  return (
                    <button key={src} onClick={() => setActiveSrc(src)} style={{
                      background: active ? T.accent : T.surface,
                      color: active ? T.accentText : T.textSecondary,
                      border: `1px solid ${active ? T.accent : T.border}`,
                      borderRadius: 100, padding: "5px 12px",
                      fontSize: 12, fontWeight: active ? 700 : 500,
                      cursor: "pointer", flexShrink: 0, fontFamily: "inherit",
                      whiteSpace: "nowrap", transition: "background .1s",
                    }}>
                      {src}&nbsp;<span style={{ opacity: 0.65, fontSize: 11 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Grouped content */}
            <div style={{ padding: isMobile ? "0 0 96px" : "0 0 48px" }}>
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", fontSize: 13, color: T.textTertiary }}>
                  Nothing from {activeSource}
                </div>
              )}

              {todayItems.length > 0 && (
                <Group label="Today" T={T}>
                  {isMobile
                    ? <ListGroup items={todayItems} T={T} onOpen={setOpenItem} onRemove={handleRemove} />
                    : <CardGrid items={todayItems} T={T} onOpen={setOpenItem} onRemove={handleRemove} />
                  }
                </Group>
              )}

              {weekItems.length > 0 && (
                <Group label="This Week" T={T}>
                  {isMobile
                    ? <ListGroup items={weekItems} T={T} onOpen={setOpenItem} onRemove={handleRemove} />
                    : <CardGrid items={weekItems} T={T} onOpen={setOpenItem} onRemove={handleRemove} />
                  }
                </Group>
              )}

              {olderItems.length > 0 && (
                <Group label="Older" T={T} warn>
                  <ListGroup items={olderItems} T={T} onOpen={setOpenItem} onRemove={handleRemove} />
                </Group>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Reader ──────────────────────────────────────────── */}
      {openItem && (
        <Suspense fallback={null}>
          <ContentViewer
            item={openItem}
            isSaved={true}
            onUnsave={() => { setItems(prev => prev.filter(i => i.url !== openItem.url)); setOpenItem(null); }}
            onClose={() => { setOpenItem(null); window.dispatchEvent(new CustomEvent("fb-nav-dir", { detail: "up" })); }}
          />
        </Suspense>
      )}
    </div>
  );
}

// ── Section group ─────────────────────────────────────────────
function Group({ label, warn, T, children }) {
  return (
    <div style={{ padding: "20px 20px 0" }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: ".14em",
        textTransform: "uppercase", marginBottom: 14,
        color: warn ? T.warning : T.textTertiary,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {label}
        {warn && <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: "none", fontSize: 11 }}>— clear your backlog</span>}
      </div>
      {children}
    </div>
  );
}

// ── Desktop card grid ─────────────────────────────────────────
function CardGrid({ items, T, onOpen, onRemove }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      {items.map(i => <Card key={i.url} item={i} T={T} onOpen={onOpen} onRemove={onRemove} />)}
    </div>
  );
}

function Card({ item, T, onOpen, onRemove }) {
  const [hov, setHov] = useState(false);
  const fav = favicon(item.url);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(item); } }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-label={item.title || item.url}
      style={{
        borderRadius: 14, overflow: "hidden", cursor: "pointer",
        background: T.card, border: `1px solid ${T.border}`,
        transition: "transform .15s, box-shadow .15s",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? "0 10px 28px rgba(0,0,0,.13)" : "none",
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", paddingBottom: "58%", background: T.surface2, overflow: "hidden" }}>
        {item.image ? (
          <img
            src={item.image} alt=""
            loading="lazy" decoding="async"
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", transition: "transform .3s",
              transform: hov ? "scale(1.04)" : "scale(1)",
            }}
            onError={e => { e.target.style.display = "none"; }}
          />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(135deg, ${T.accent}22, ${T.surface2})`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontSize: 38, fontWeight: 800, opacity: 0.18, color: T.accent,
              fontFamily: "var(--reader-font-family)", letterSpacing: "-.04em",
            }}>
              {srcOf(item).charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {/* Delete on hover */}
        <button
          onClick={e => onRemove(item.url, e)}
          aria-label="Remove"
          style={{
            position: "absolute", top: 8, right: 8,
            width: 26, height: 26, borderRadius: "50%", border: "none",
            background: "rgba(0,0,0,.55)", color: "#fff",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hov ? 1 : 0, transition: "opacity .15s",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8"/>
          </svg>
        </button>
      </div>

      {/* Text */}
      <div style={{ padding: "10px 12px 13px" }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden", marginBottom: item.description ? 4 : 6, letterSpacing: "-.01em",
        }}>
          {item.title || item.url}
        </div>
        {item.description && (
          <div style={{
            fontSize: 11.5, color: T.textSecondary, lineHeight: 1.45, marginBottom: 6,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {item.description}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {fav && (
            <img src={fav} alt="" width={12} height={12}
              style={{ borderRadius: 2, opacity: 0.7, flexShrink: 0 }}
              onError={e => { e.target.style.display = "none"; }}
            />
          )}
          <span style={{ fontSize: 11, color: T.textTertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {srcOf(item)}
          </span>
          <span style={{ fontSize: 11, color: T.textTertiary, flexShrink: 0 }}>· {relTime(item.saved_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Compact list (older / mobile) ─────────────────────────────
function ListGroup({ items, T, onOpen, onRemove }) {
  return (
    <div>
      {items.map(i => <ListRow key={i.url} item={i} T={T} onOpen={onOpen} onRemove={onRemove} />)}
    </div>
  );
}

function ListRow({ item, T, onOpen, onRemove }) {
  const [hov, setHov] = useState(false);
  const fav = favicon(item.url);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(item); } }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-label={item.title || item.url}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 4px",
        borderBottom: `1px solid ${T.border}`,
        cursor: "pointer",
        background: hov ? T.surface : "transparent",
        borderRadius: 6,
        margin: "0 -4px",
        transition: "background .1s",
      }}
    >
      {/* Thumb */}
      <div style={{ width: 68, height: 52, flexShrink: 0, borderRadius: 8, overflow: "hidden", background: T.surface2 }}>
        {item.image
          ? <img src={item.image} alt="" loading="lazy" decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => { e.target.style.display = "none"; }} />
          : <div style={{
              width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              background: `linear-gradient(135deg, ${T.accent}20, ${T.surface2})`,
            }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: T.accent, opacity: 0.28 }}>
                {srcOf(item).charAt(0).toUpperCase()}
              </span>
            </div>
        }
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden", marginBottom: 3,
        }}>
          {item.title || item.url}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {fav && <img src={fav} alt="" width={12} height={12} loading="lazy" decoding="async" style={{ borderRadius: 2, opacity: 0.7, flexShrink: 0 }} onError={e => { e.target.style.display = "none"; }} />}
          <span style={{ fontSize: 11, color: T.textTertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{srcOf(item)}</span>
          <span style={{ fontSize: 11, color: T.textTertiary, flexShrink: 0 }}>· {relTime(item.saved_at)}</span>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={e => onRemove(item.url, e)}
        aria-label="Remove"
        style={{
          background: "none", border: "none", cursor: "pointer", flexShrink: 0,
          color: T.textTertiary, padding: "6px 8px", borderRadius: 7,
          opacity: hov ? 1 : 0, transition: "opacity .15s, color .1s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = T.danger; }}
        onMouseLeave={e => { e.currentTarget.style.color = T.textTertiary; }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8"/>
        </svg>
      </button>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ T }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 24px", color: T.textTertiary }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.textTertiary} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16, opacity: 0.5 }}>
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>Nothing saved yet</div>
      <div style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 280, margin: "0 auto" }}>
        Press <kbd style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 4, padding: "1px 6px", fontSize: 11 }}>L</kbd> while reading to save for later, or paste a URL with the + button above.
      </div>
    </div>
  );
}
