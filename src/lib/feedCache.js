// ── Feed cache — stale-while-revalidate with localStorage ─────
// Strategy: serve stale data instantly while fetching fresh data
// in the background. Users see content immediately on every load.

const CACHE_TTL_MS   = 30 * 60 * 1000; // 30 min — fresh threshold
const CACHE_STALE_MS = 4 * 60 * 60 * 1000; // 4h — max stale age
const CACHE_PREFIX   = "fb-feed-";
const MAX_ENTRIES    = 60;

function cacheKey(feedUrl) {
  return CACHE_PREFIX + feedUrl;
}

// Returns { data, isStale } or null if no cache at all
export function getCachedFeed(feedUrl) {
  try {
    const raw = localStorage.getItem(cacheKey(feedUrl));
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    const age    = Date.now() - timestamp;
    if (age > CACHE_STALE_MS) {
      localStorage.removeItem(cacheKey(feedUrl));
      return null;
    }
    return { data, isStale: age > CACHE_TTL_MS };
  } catch {
    return null;
  }
}

export function setCachedFeed(feedUrl, data) {
  try {
    // Evict oldest if at limit
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .sort((a, b) => {
        try {
          return (JSON.parse(localStorage.getItem(a))?.timestamp || 0) -
                 (JSON.parse(localStorage.getItem(b))?.timestamp || 0);
        } catch { return 0; }
      });
    while (keys.length >= MAX_ENTRIES) localStorage.removeItem(keys.shift());
    localStorage.setItem(cacheKey(feedUrl), JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

export function invalidateCachedFeed(feedUrl) {
  try { localStorage.removeItem(cacheKey(feedUrl)); } catch {}
}

export function invalidateAllFeeds() {
  try {
    Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}

export function cacheAge(feedUrl) {
  try {
    const raw = localStorage.getItem(cacheKey(feedUrl));
    if (!raw) return null;
    return Math.round((Date.now() - JSON.parse(raw).timestamp) / 60000);
  } catch { return null; }
}
