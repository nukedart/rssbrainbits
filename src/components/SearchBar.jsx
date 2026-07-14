import { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { SHAPE } from "../lib/tokens";
import { searchItems } from "../lib/supabase";
import { track } from "../lib/analytics";

const SearchBar = forwardRef(function SearchBar({ onSelectResult, onClose, onLiveSearch, allItems = [] }, ref) {
  const { T } = useTheme();
  const { user } = useAuth();

  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [focused, setFocused]     = useState(false);
  const [FuseClass, setFuseClass] = useState(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const panelRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focusInput: () => { inputRef.current?.focus(); inputRef.current?.select(); }
  }));

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") { onClose?.(); onLiveSearch?.(""); } }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (query.trim() && !FuseClass) {
      import("fuse.js").then(m => setFuseClass(() => m.default));
    }
  }, [query, FuseClass]);

  const fuse = useMemo(() => {
    if (!allItems.length || !FuseClass) return null;
    return new FuseClass(allItems, {
      keys: [{ name: "title", weight: 0.55 }, { name: "description", weight: 0.22 }, { name: "fullText", weight: 0.12 }, { name: "source", weight: 0.07 }, { name: "author", weight: 0.04 }],
      threshold: 0.35, includeScore: true, minMatchCharLength: 2,
    });
  }, [allItems, FuseClass]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); return; }
    if (fuse) {
      const localHits = fuse.search(query).slice(0, 12).map(r => ({ ...r.item, _score: r.score }));
      setResults(localHits);
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchItems(user.id, query);
        setResults(prev => {
          const localUrls = new Set(prev.map(i => i.url));
          return [...prev, ...r.filter(i => !localUrls.has(i.url))].slice(0, 20);
        });
      } catch (e) {
        console.error("Search error:", e);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timerRef.current);
  }, [query, user, fuse]);

  function formatDate(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr), now = new Date(), diff = now - d;
      if (diff < 86400000)  return `${Math.round(diff / 3600000)}h ago`;
      if (diff < 604800000) return `${Math.round(diff / 86400000)}d ago`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch { return ""; }
  }

  const showPanel = focused && (loading || results.length > 0 || query.trim().length > 0);

  return (
    <div role="search" style={{ position: "relative", flex: 1, minWidth: 0 }}>
      {/* Input pill */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: focused ? T.surface : T.surface2,
        borderRadius: 24,
        padding: "8px 12px",
        transition: "background .15s, box-shadow .15s",
        boxShadow: focused ? `0 0 0 2px ${T.accent}55` : "none",
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={T.textTertiary} strokeWidth="1.7" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); onLiveSearch?.(e.target.value); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search…"
          aria-label="Search"
          aria-haspopup="listbox"
          aria-expanded={showPanel}
          aria-controls="search-results-panel"
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            fontSize: 16, color: T.text, fontFamily: "inherit",
            minWidth: 0,
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); onLiveSearch?.(""); inputRef.current?.focus(); }}
            aria-label="Clear search"
            style={{
              width: 22, height: 22, borderRadius: "50%",
              background: T.textTertiary + "38",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.textSecondary, flexShrink: 0, padding: 0,
              fontSize: 14, lineHeight: 1,
              WebkitTapHighlightColor: "transparent",
            }}
            onTouchStart={e => { e.currentTarget.style.opacity = "0.6"; }}
            onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
            onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
          >×</button>
        )}
      </div>

      {/* Results panel */}
      {showPanel && (
        <div id="search-results-panel" ref={panelRef} role="listbox" aria-label="Search results" style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: SHAPE.radiusCard,
          boxShadow: "0 12px 40px rgba(0,0,0,.14)",
          zIndex: 1000, overflow: "hidden",
          animation: "fadeIn .12s ease",
          maxHeight: 400, overflowY: "auto",
        }}>
          {/* Status row */}
          <div style={{ padding: "10px 16px 8px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".07em", flex: 1 }}>
              {loading ? "Searching…" : results.length > 0 ? `${results.length} result${results.length !== 1 ? "s" : ""}` : "No results"}
            </span>
          </div>

          {/* Empty state */}
          {!loading && results.length === 0 && query.trim() && (
            <div style={{ padding: "28px 16px", textAlign: "center", color: T.textTertiary, fontSize: 13 }}>
              Nothing found for "{query}"
            </div>
          )}

          {/* Result rows */}
          {results.map(item => {
            const favicon = item.url ? `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=32` : null;
            return (
              <button
                key={item.url}
                onClick={() => { track("search_performed", { query_length: query.length, results: results.length }); onSelectResult(item); setQuery(""); setResults([]); onLiveSearch?.(""); }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10, width: "100%",
                  padding: "12px 16px", cursor: "pointer",
                  border: "none", background: "transparent",
                  borderBottom: `1px solid ${T.border}`,
                  transition: "background .08s",
                  fontFamily: "inherit", textAlign: "left",
                  WebkitTapHighlightColor: "transparent",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surface; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                onTouchStart={e => { e.currentTarget.style.background = T.surface; }}
                onTouchEnd={e => { e.currentTarget.style.background = "transparent"; }}
                onTouchCancel={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ width: 20, height: 20, borderRadius: SHAPE.radiusXs, overflow: "hidden", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {favicon
                    ? <img src={favicon} alt="" width={16} height={16} loading="lazy" decoding="async" style={{ display: "block" }} onError={e => { e.target.style.display = "none"; }} />
                    : <span style={{ fontSize: 10 }}>📰</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: T.text, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {highlightMatch(item.title || item.url, query, T)}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 2, alignItems: "center" }}>
                    {item.source && <span style={{ fontSize: 11, color: T.textTertiary, fontWeight: 500 }}>{item.source}</span>}
                    <span style={{ fontSize: 11, color: T.textTertiary }}>· {formatDate(item.read_at || item.saved_at)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default SearchBar;

function highlightMatch(text, query, T) {
  if (!text || !query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: `${T.accent}44`, borderRadius: 3, padding: "0 1px", color: "inherit" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}
