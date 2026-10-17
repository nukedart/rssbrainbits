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

// Small index { url: timestamp } so eviction never has to parse entries
const INDEX_KEY = "fb-feed-index"; // starts with CACHE_PREFIX — excluded explicitly below

function isEntryKey(k) { return k.startsWith(CACHE_PREFIX) && k !== INDEX_KEY; }

function readIndex() {
  try {
    const idx = JSON.parse(localStorage.getItem(INDEX_KEY));
    if (idx && typeof idx === "object") return idx;
  } catch {}
  // Missing/corrupt index — rebuild lazily from existing entries
  const idx = {};
  try {
    for (const k of Object.keys(localStorage)) {
      if (!isEntryKey(k)) continue;
      try { idx[k.slice(CACHE_PREFIX.length)] = JSON.parse(localStorage.getItem(k))?.timestamp || 0; }
      catch { idx[k.slice(CACHE_PREFIX.length)] = 0; }
    }
  } catch {}
  return idx;
}

function writeIndex(idx) {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(idx)); } catch {}
}

function evictOldest(idx, count) {
  const urls = Object.keys(idx).sort((a, b) => idx[a] - idx[b]).slice(0, count);
  for (const u of urls) {
    try { localStorage.removeItem(cacheKey(u)); } catch {}
    delete idx[u];
  }
}

function isQuotaError(e) {
  return e && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22 || e.code === 1014);
}

export function setCachedFeed(feedUrl, data) {
  try {
    const idx = readIndex();
    delete idx[feedUrl];
    const over = Object.keys(idx).length - (MAX_ENTRIES - 1);
    if (over > 0) evictOldest(idx, over);
    const now = Date.now();
    const payload = JSON.stringify({ data, timestamp: now });
    try {
      localStorage.setItem(cacheKey(feedUrl), payload);
    } catch (e) {
      if (!isQuotaError(e)) throw e;
      evictOldest(idx, 10);
      localStorage.setItem(cacheKey(feedUrl), payload); // retry once
    }
    idx[feedUrl] = now;
    writeIndex(idx);
  } catch {}
}

export function invalidateCachedFeed(feedUrl) {
  try {
    localStorage.removeItem(cacheKey(feedUrl));
    const idx = readIndex();
    if (feedUrl in idx) { delete idx[feedUrl]; writeIndex(idx); }
  } catch {}
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
