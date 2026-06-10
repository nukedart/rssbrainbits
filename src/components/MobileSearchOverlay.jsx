import { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { searchItems } from "../lib/supabase";
import { track } from "../lib/analytics";

function highlightMatch(text, query, T) {
  if (!text || !query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: `${T.accent}33`, borderRadius: 3, padding: "0 1px", color: "inherit" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr), now = new Date(), diff = now - d;
    if (diff < 86400000)  return `${Math.round(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.round(diff / 86400000)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

export default function MobileSearchOverlay({ onClose, onSelectResult, onLiveSearch, allItems = [] }) {
  const { T } = useTheme();
  const { user } = useAuth();
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [FuseClass, setFuseClass] = useState(null);

  // Focus input on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  // Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") handleClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lazy-load Fuse
  useEffect(() => {
    if (query.trim() && !FuseClass) {
      import("fuse.js").then(m => setFuseClass(() => m.default));
    }
  }, [query, FuseClass]);

  const fuse = useMemo(() => {
    if (!allItems.length || !FuseClass) return null;
    return new FuseClass(allItems, {
      keys: [
        { name: "title",       weight: 0.55 },
        { name: "description", weight: 0.22 },
        { name: "fullText",    weight: 0.12 },
        { name: "source",      weight: 0.07 },
        { name: "author",      weight: 0.04 },
      ],
      threshold: 0.35, includeScore: true, minMatchCharLength: 2,
    });
  }, [allItems, FuseClass]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    onLiveSearch?.(query);
    if (!query.trim()) { setResults([]); return; }
    if (fuse) {
      setResults(fuse.search(query).slice(0, 12).map(r => ({ ...r.item, _score: r.score })));
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchItems(user.id, query);
        setResults(prev => {
          const seen = new Set(prev.map(i => i.url));
          return [...prev, ...r.filter(i => !seen.has(i.url))].slice(0, 20);
        });
      } catch (e) { console.error("Search error:", e); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(timerRef.current);
  }, [query, user, fuse]);

  function handleClose() {
    onLiveSearch?.("");
    onClose();
  }

  function handleSelect(item) {
    track("search_performed", { query_length: query.length, results: results.length });
    onLiveSearch?.("");
    onSelectResult(item);
  }

  function clearQuery() {
    setQuery("");
    setResults([]);
    onLiveSearch?.("");
    inputRef.current?.focus();
  }

  const hasQuery = query.trim().length > 0;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1100,
      display: "flex", flexDirection: "column",
      background: T.bg,
      animation: "mso-slide-up .22s cubic-bezier(.32,.72,0,1)",
    }}>

      {/* ── Search bar row ── */}
      <div role="search" aria-label="Search articles" style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px",
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        {/* Input pill */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10,
          background: T.surface2, borderRadius: 14,
          padding: "11px 14px",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            stroke={T.textTertiary} strokeWidth="1.7" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l3.5 3.5"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search articles, saved, history…"
            aria-label="Search articles, saved, history"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: 17, color: T.text, fontFamily: "inherit", minWidth: 0,
            }}
          />
          {hasQuery && (
            <button
              onClick={clearQuery}
              style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: T.textTertiary + "33", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: T.textSecondary, cursor: "pointer", padding: 0,
                fontSize: 15, lineHeight: 1,
                WebkitTapHighlightColor: "transparent",
              }}
              onTouchStart={e => { e.currentTarget.style.opacity = "0.6"; }}
              onTouchEnd={e =>   { e.currentTarget.style.opacity = "1"; }}
              onTouchCancel={e =>{ e.currentTarget.style.opacity = "1"; }}
            >×</button>
          )}
        </div>

        {/* Cancel */}
        <button
          onClick={handleClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: T.accent, fontSize: 16, fontWeight: 500,
            fontFamily: "inherit", flexShrink: 0, padding: "8px 0",
            WebkitTapHighlightColor: "transparent",
          }}
          onTouchStart={e => { e.currentTarget.style.opacity = "0.6"; }}
          onTouchEnd={e =>   { e.currentTarget.style.opacity = "1"; }}
          onTouchCancel={e =>{ e.currentTarget.style.opacity = "1"; }}
        >Cancel</button>
      </div>

      {/* ── Results area ── */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>

        {/* Empty / prompt state */}
        {!hasQuery && (
          <div style={{
            padding: "52px 24px", textAlign: "center",
            color: T.textTertiary, fontSize: 15, lineHeight: 1.6,
          }}>
            Search articles, saved items, and reading history
          </div>
        )}

        {/* Loading — only before local results land */}
        {hasQuery && loading && results.length === 0 && (
          <div style={{ padding: "40px 24px", textAlign: "center", color: T.textTertiary, fontSize: 14 }}>
            Searching…
          </div>
        )}

        {/* No results */}
        {hasQuery && !loading && results.length === 0 && (
          <div style={{ padding: "40px 24px", textAlign: "center", color: T.textTertiary, fontSize: 14 }}>
            Nothing found for "<strong style={{ color: T.textSecondary }}>{query}</strong>"
          </div>
        )}

        {/* Result rows */}
        {results.map((item, i) => {
          let favicon = null;
          try { favicon = item.url ? `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=32` : null; } catch {}
          const date = formatDate(item.read_at || item.saved_at);
          return (
            <div
              key={item.url || i}
              role="button"
              tabIndex={0}
              aria-label={item.title || item.url}
              onClick={() => handleSelect(item)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(item); } }}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "14px 16px",
                borderBottom: `1px solid ${T.border}`,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                transition: "background .08s",
              }}
              onTouchStart={e =>  { e.currentTarget.style.background = T.surface; }}
              onTouchEnd={e =>    { e.currentTarget.style.background = "transparent"; }}
              onTouchCancel={e => { e.currentTarget.style.background = "transparent"; }}
            >
              {/* Favicon */}
              <div style={{
                width: 28, height: 28, borderRadius: 7, overflow: "hidden",
                background: T.surface2, flexShrink: 0, marginTop: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {favicon
                  ? <img src={favicon} alt="" width={18} height={18} style={{ display: "block" }}
                      onError={e => { e.target.style.display = "none"; }} />
                  : <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={T.textTertiary} strokeWidth="1.5" strokeLinecap="round"><path d="M2 3h12M2 8h8M2 13h10"/></svg>
                }
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 15, fontWeight: 500, color: T.text,
                  lineHeight: 1.35, overflow: "hidden",
                  display: "-webkit-box", WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  marginBottom: 3,
                }}>
                  {highlightMatch(item.title || item.url, query, T)}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {item.source && (
                    <span style={{ fontSize: 12, color: T.textTertiary, fontWeight: 500,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                      {item.source}
                    </span>
                  )}
                  {date && <span style={{ fontSize: 12, color: T.textTertiary }}>· {date}</span>}
                </div>
              </div>
            </div>
          );
        })}

        {/* Bottom padding so last result clears the BottomNav */}
        {results.length > 0 && (
          <div style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }} />
        )}
      </div>
    </div>
  );
}
