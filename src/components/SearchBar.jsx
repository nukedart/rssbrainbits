import { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import Fuse from "fuse.js";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { searchItems } from "../lib/supabase";
import { track } from "../lib/analytics";

// ── SearchIcon SVG ────────────────────────────────────────────
function SearchIcon({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4.5"/>
      <path d="M10.5 10.5l3 3"/>
    </svg>
  );
}

const SearchBar = forwardRef(function SearchBar({ onSelectResult, onClose, onLiveSearch, allItems = [] }, ref) {
  const { T } = useTheme();
  const { user } = useAuth();

  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState(false);
  const inputRef  = useRef(null);
  const timerRef  = useRef(null);
  const panelRef  = useRef(null);

  useImperativeHandle(ref, () => ({
    focusInput: () => { inputRef.current?.focus(); inputRef.current?.select(); }
  }));

  // Auto-focus when mounted
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose?.(); onLiveSearch?.(""); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Memoize Fuse index — only rebuild when the item list changes, not on every keystroke
  const fuse = useMemo(() => {
    if (!allItems.length) return null;
    return new Fuse(allItems, {
      keys: [{ name: "title", weight: 0.6 }, { name: "description", weight: 0.25 }, { name: "source", weight: 0.1 }, { name: "author", weight: 0.05 }],
      threshold: 0.35, includeScore: true, minMatchCharLength: 2,
    });
  }, [allItems]);

  // Debounced search — fuzzy local first, then Supabase full-text
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); return; }

    // Instant local fuzzy search across in-memory feed items
    if (fuse) {
      const localHits = fuse.search(query).slice(0, 12).map(r => ({ ...r.item, _score: r.score }));
      setResults(localHits);
    }

    // Also query Supabase history/saved (debounced)
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchItems(user.id, query);
        // Merge: prefer local hits but append Supabase-only results
        setResults(prev => {
          const localUrls = new Set(prev.map(i => i.url));
          const merged = [...prev, ...r.filter(i => !localUrls.has(i.url))];
          return merged.slice(0, 20);
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
    <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
      {/* Input */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: focused ? T.card : T.surface2,
        border: `1px solid ${focused ? T.accent : T.border}`,
        borderRadius: 10, padding: "5px 10px",
        transition: "all .15s",
      }}>
        <span style={{ color: T.textTertiary, display: "flex", flexShrink: 0 }}>
          <SearchIcon size={14} />
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); onLiveSearch?.(e.target.value); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search…"
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            fontSize: 13, color: T.text, fontFamily: "inherit",
          }}
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.textTertiary, fontSize: 16, padding: 0, lineHeight: 1 }}>
            ×
          </button>
        )}
      </div>

      {/* Results panel */}
      {showPanel && (
        <div ref={panelRef} style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: T.card, border: `1px solid ${T.borderStrong}`,
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,.16)",
          zIndex: 1000, overflow: "hidden", animation: "slideUp .15s ease",
          maxHeight: 420, overflowY: "auto",
        }}>
          {/* Header */}
          <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".06em", flex: 1 }}>
              {loading ? "Searching…" : results.length > 0 ? `${results.length} result${results.length !== 1 ? "s" : ""}` : "No results"}
            </span>
            {results.length > 0 && (
              <span style={{ fontSize: 10, color: T.textTertiary }}>from history & saved</span>
            )}
          </div>

          {/* Empty state */}
          {!loading && results.length === 0 && query.trim() && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: T.textTertiary, fontSize: 13 }}>
              No articles found for "{query}"
            </div>
          )}

          {/* Results */}
          {results.map((item) => {
            const favicon = item.url ? `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=32` : null;
            return (
              <div
                key={item.url}
                onClick={() => { track("search_performed", { query_length: query.length, results: results.length }); onSelectResult(item); setQuery(""); setResults([]); }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "10px 14px", cursor: "pointer",
                  borderBottom: `1px solid ${T.border}`,
                  transition: "background .08s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surface; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* Favicon */}
                <div style={{ width: 18, height: 18, borderRadius: 4, overflow: "hidden", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {favicon
                    ? <img src={favicon} alt="" width={14} height={14} style={{ display: "block" }} onError={e => { e.target.style.display = "none"; }} />
                    : <span style={{ fontSize: 9 }}>📰</span>
                  }
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {highlightMatch(item.title || item.url, query, T)}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center" }}>
                    {item.source && <span style={{ fontSize: 11, color: T.textTertiary, fontWeight: 500 }}>{item.source}</span>}
                    <span style={{ fontSize: 11, color: T.textTertiary }}>
                      · {formatDate(item.read_at || item.saved_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default SearchBar;

// Highlight matching text in results
function highlightMatch(text, query, T) {
  if (!text || !query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(101,213,196,0.35)", borderRadius: 2, padding: "0 1px", color: "inherit" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}
