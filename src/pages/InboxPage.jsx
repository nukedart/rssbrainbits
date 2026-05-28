import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useTheme } from "../hooks/useTheme";
import { useSwipe } from "../hooks/useSwipe.js";
import { useAuth } from "../hooks/useAuth";
import { getFeeds, addFeed, deleteFeed, addToHistory, saveItem, unsaveItem, getSaved,
         addReadLater, removeReadLater, getReadUrls, markRead, markAllRead, markUnread, matchesSmartFeed } from "../lib/supabase";
import { fetchRSSFeed, fetchArticleContent, parseYouTubeUrl, resolveYouTubeChannelRSS } from "../lib/fetchers";
import { getCachedFeed, invalidateAllFeeds, invalidateCachedFeed, cacheAge } from "../lib/feedCache";
import FeedItem from "../components/FeedItem";
const ContentViewer = lazy(() => import("../components/ContentViewer"));
import AddModal from "../components/AddModal";
import { Button, EmptyState, Spinner } from "../components/UI";
import PlanGate from "../components/PlanGate";
import { checkLimit } from "../lib/plan";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import SearchBar from "../components/SearchBar";
import OPMLImport from "../components/OPMLImport";
import { track } from "../lib/analytics";

function dateBucket(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const itemStart  = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((todayStart - itemStart) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7)   return d.toLocaleDateString("en-US", { weekday: "long" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return null; }
}

export default function InboxPage({ filterMode = "all", smartFeedDef = null, feedDef = null, folderDef = null, ytFeedIds = null, onUnreadCount, onFeedErrors, onFeedUnreadCounts, folders = [], feeds: propFeeds = null, onFeedAdded, onFeedDeleted, onAddFolder, onEditFolder, onMoveFeedToFolder, onPlayPodcast, user: propUser = null, forceShowAdd = false, onForcedAddClose, forceOpenSearch = false, onForcedSearchClose, onNavigate }) {
  const { T } = useTheme();
  const { user: authUser } = useAuth();
  const user = propUser || authUser;
  const { isMobile, isTablet } = useBreakpoint();

  const [_localFeeds, _setLocalFeeds]   = useState([]);
  // Use lifted feeds from App.jsx if provided — eliminates folder_id drift
  const feeds    = propFeeds !== null ? propFeeds : _localFeeds;
  const setFeeds = propFeeds !== null
    ? (updater) => {} // no-op: App.jsx owns state; use callbacks instead
    : _setLocalFeeds;
  const [allItems, setAllItems]         = useState([]);
  const [activeSource, setActiveSource] = useState("all");
  const [loadingFeeds, setLoadingFeeds] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [showAdd, setShowAdd]           = useState(false);
  const [openItem, setOpenItem]         = useState(null);
  const [openIdx, setOpenIdx]           = useState(-1);
  const [expandedView, setExpandedView] = useState(false);
  const [cursorIdx, setCursorIdx]       = useState(0); // keyboard nav cursor
  const [viewMode, setViewMode]         = useState(() => isMobile ? (localStorage.getItem("fb-viewmode-mobile") || "list") : (localStorage.getItem("fb-viewmode") || "list"));
  const [cardSize, setCardSize]           = useState(() => localStorage.getItem("fb-cardsize") || "lg");
  const [readUrls, setReadUrls]         = useState(() => {
    // Seed synchronously from localStorage so the unread filter works on first render,
    // preventing already-read items from flashing as unread while Supabase loads.
    try {
      const uid = propUser?.id;
      if (!uid) return new Set();
      const cached = localStorage.getItem(`fb-readurls-${uid}`);
      return cached ? new Set(JSON.parse(cached)) : new Set();
    } catch { return new Set(); }
  });
  const readUrlsRef = useRef(readUrls);
  useEffect(() => { readUrlsRef.current = readUrls; }, [readUrls]);
  // Snapshot of readUrls used for list filtering — frozen at session/filter start so
  // marking items read during scroll doesn't remove them from the list mid-scroll.
  // Live readUrls still drives the visual isRead state (dimming/opacity).
  const sessionFilterUrlsRef = useRef(new Set(readUrls));
  const [savedUrls, setSavedUrls]       = useState(new Set());
  const [readFilter, setReadFilter]     = useState("unread"); // "all" | "unread"
  const [autoMarkRead, setAutoMarkRead] = useState(() => localStorage.getItem("fb-automark") === "true");
  const [toast, setToast]               = useState(null);
  const [searchResult, setSearchResult]   = useState(null);
  const [liveSearch, setLiveSearch]       = useState(""); // client-side search across unread
  const [feedErrors, setFeedErrors]         = useState({});   // feedId -> error message
  const [feedLoading, setFeedLoading]       = useState({});   // feedId -> bool
  const [lastRefresh, setLastRefresh]       = useState(null);
  const [newArticleCount, setNewArticleCount] = useState(0);
  const prevItemUrlsRef = useRef(new Set());
  const newItemUrlsRef = useRef(new Set()); // tracks which URLs arrived in background refreshes
  const [showOPML, setShowOPML]           = useState(false);
  const [opmlProgress, setOpmlProgress]   = useState(null); // null | { done, total }
  const [dragFeedId, setDragFeedId]         = useState(null);
  const [openFolders, setOpenFolders]       = useState(() => new Set());
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [pullY, setPullY]           = useState(0);
  const [isPulling, setIsPulling]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(null);
  const pullStartY = useRef(null); // touch start Y for pull-to-refresh
  const fetchAllRef = useRef(null); // stable ref to fetchAll — accessible from PTR handlers
  const [draggingFeed, setDraggingFeed]     = useState(null); // feed id being dragged
  const [displayedCount, setDisplayedCount] = useState(60);
  const [viewMenuOpen, setViewMenuOpen]     = useState(false);
  const viewMenuRef = useRef(null);
  const [searchOpen, setSearchOpen]         = useState(false);
  const [errorPopoverOpen, setErrorPopoverOpen] = useState(false);
  const errorPopoverRef = useRef(null);
  const [sourceDropOpen, setSourceDropOpen] = useState(false);
  const sourceDropRef = useRef(null);

  function toggleFolderOpen(id) {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  const listRef = useRef(null);
  const searchBarRef = useRef(null); // for f-key focus
  const markReadFnRef = useRef(null);
  const autoMarkReadRef = useRef(autoMarkRead);
  const lastScrollRef = useRef(0); // timestamp of last real scroll — gates auto-mark-read

  // BottomNav + button: open AddModal when App.jsx signals forceShowAdd
  useEffect(() => {
    if (forceShowAdd) {
      setShowAdd(true);
      onForcedAddClose?.();
    }
  }, [forceShowAdd]);

  // Global `/` shortcut: open search from any page
  useEffect(() => {
    if (forceOpenSearch) {
      setSearchOpen(true);
      setTimeout(() => searchBarRef.current?.focusInput?.(), 50);
      onForcedSearchClose?.();
    }
  }, [forceOpenSearch]);

  // ── Background sync: listen for SW "BG_SYNC" message ─────
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (e) => {
      if (e.data?.type === "BG_SYNC") fetchAllRef.current?.(false);
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    // If feeds are lifted from App.jsx, don't re-fetch
    if (propFeeds !== null) { setLoadingFeeds(false); return; }
    getFeeds(user.id).then(_setLocalFeeds).catch(console.error).finally(() => setLoadingFeeds(false));
    // Open all folders by default when component mounts
    if (folders.length > 0) setOpenFolders(new Set(folders.map(f => f.id)));
    // Merge Supabase read URLs (authoritative) with localStorage cache
    const cacheKey = `fb-readurls-${user.id}`;
    getReadUrls(user.id).then(urls => {
      setReadUrls(urls);
      try { localStorage.setItem(cacheKey, JSON.stringify([...urls])); } catch {}
    }).catch(console.error);
    getSaved(user.id).then(items => setSavedUrls(new Set(items.map(i => i.url)))).catch(() => {});
  }, [user]);

  useEffect(() => {
    // Include youtube feeds — they use the same RSS fetch path
    const rssFeeds = feeds.filter((f) => f.type === "rss" || f.type === "podcast" || f.type === "youtube");
    if (!rssFeeds.length) { setAllItems([]); setLoadingItems(false); return; }

    setFeedErrors({});

    // Fetch all feeds — each resolves independently, items merge as they arrive.
    // fetchRSSFeed handles cache internally (returns cached data instantly when fresh).
    const fetchAll = async (forceRefresh = false) => {
      const itemMap = new Map();

      function normaliseUrl(url) {
        try {
          const u = new URL(url);
          u.protocol = "https:";
          u.hash = "";
          // remove common tracking params
          ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","ref","source"].forEach(p => u.searchParams.delete(p));
          return u.toString().replace(/\/$/, "");
        } catch { return url; }
      }

      function mergeAndSort(newItems) {
        newItems.forEach(item => { if (item.url) itemMap.set(normaliseUrl(item.url), { ...item }); });
        const sorted = [...itemMap.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (prevItemUrlsRef.current.size > 0) {
          const freshUrls = sorted.filter(i => !prevItemUrlsRef.current.has(i.url)).map(i => i.url);
          freshUrls.forEach(u => newItemUrlsRef.current.add(u));
          if (freshUrls.length > 0) setNewArticleCount(n => n + freshUrls.length);
        }
        setAllItems(sorted);
        setLoadingItems(false);
      }

      // ── Instant paint: synchronously seed itemMap from localStorage cache ──
      // This means users with any cached data see articles on the very first render,
      // with no loading spinner, while stale feeds refresh in the background.
      if (!forceRefresh) {
        rssFeeds.forEach(feed => {
          const cached = getCachedFeed(feed.url);
          if (cached?.data?.items) {
            cached.data.items.forEach(item => {
              if (item.url) itemMap.set(normaliseUrl(item.url), { ...item, feedId: feed.id, source: feed.name || cached.data.title, fetchFullContent: !!feed.fetch_full_content, type: feed.type || "rss" });
            });
          }
        });
        if (itemMap.size > 0) {
          setAllItems([...itemMap.values()].sort((a, b) => new Date(b.date) - new Date(a.date)));
          setLoadingItems(false);
        }
      }

      setFeedLoading(Object.fromEntries(rssFeeds.map(f => [f.id, true])));
      // Only show global spinner if we have nothing to show yet
      if (itemMap.size === 0) setLoadingItems(true);

      await Promise.allSettled(
        rssFeeds.map(async (feed) => {
          try {
            const data = await fetchRSSFeed(feed.url, { forceRefresh });
            if (!data?.items?.length) throw new Error("No items in feed");
            const items = data.items.map((item) => ({
              ...item,
              feedId: feed.id,
              source: feed.name || data.title,
              fetchFullContent: !!feed.fetch_full_content,
              type: feed.type || "rss",
            }));
            mergeAndSort(items);
            setFeedErrors(prev => { const n = { ...prev }; delete n[feed.id]; return n; });
          } catch (err) {
            setFeedErrors(prev => ({ ...prev, [feed.id]: err.message || "Failed to load" }));
          } finally {
            setFeedLoading(prev => ({ ...prev, [feed.id]: false }));
          }
        })
      );

      setLoadingItems(false);
      setLastRefresh(new Date());
      // Store all known URLs for new-article detection on next refresh
      setAllItems(prev => { prevItemUrlsRef.current = new Set(prev.map(i => i.url)); return prev; });
    };

    fetchAllRef.current = fetchAll;
    fetchAll();

    // ── Auto-refresh every 30 minutes ────────────────────────
    const REFRESH_INTERVAL = 30 * 60 * 1000;
    const timer = setInterval(() => fetchAll(false), REFRESH_INTERVAL);

    return () => clearInterval(timer);
  }, [feeds]);

  // ── Filtered + sorted item list ───────────────────────────────
  const baseItems = (() => {
    let items = activeSource === "all" ? allItems : allItems.filter((i) => i.feedId === activeSource);
    if (filterMode === "today") {
      const yesterday = Date.now() - 86400000;
      items = items.filter((i) => i.date && new Date(i.date) > yesterday);
    }
    if (filterMode === "unread") {
      items = items.filter((i) => !sessionFilterUrlsRef.current.has(i.url));
    }
    if (filterMode === "smart") {
      if (!smartFeedDef) return []; // still loading — return empty
      items = items.filter((i) => matchesSmartFeed(i, smartFeedDef));
    }
    if (filterMode === "feed") {
      if (!feedDef) return [];
      items = items.filter((i) => i.feedId === feedDef.id);
    }
    if (filterMode === "youtube-all") {
      const ids = ytFeedIds || [];
      items = items.filter((i) => ids.includes(i.feedId));
    }
    if (filterMode === "folder") {
      if (!folderDef) return [];
      const folderFeedIds = feeds.filter(f => f.folder_id === folderDef.id).map(f => f.id);
      items = items.filter((i) => folderFeedIds.includes(i.feedId));
    }
    if (filterMode !== "unread" && readFilter === "unread") items = items.filter((i) => !sessionFilterUrlsRef.current.has(i.url));
    if (filterMode !== "unread" && readFilter === "read")   items = items.filter((i) =>  sessionFilterUrlsRef.current.has(i.url));
    // Client-side live search across in-memory items
    if (liveSearch.trim().length > 1) {
      const q = liveSearch.toLowerCase();
      items = items.filter(i =>
        (i.title||"").toLowerCase().includes(q) ||
        (i.description||"").toLowerCase().includes(q) ||
        (i.source||"").toLowerCase().includes(q) ||
        (i.author||"").toLowerCase().includes(q)
      );
    }
    return items.sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));
  })();

  // ── Feed → folder color map (for per-feed colored dots in list rows) ────────
  const FCOLS = { gray:"#8A9099", teal:"#accfae", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };
  const feedColorMap = (() => {
    const map = {};
    feeds.forEach(feed => {
      if (feed.folder_id) {
        const folder = folders.find(f => f.id === feed.folder_id);
        if (folder?.color) map[feed.id] = FCOLS[folder.color] || "#8A9099";
      }
    });
    return map;
  })();

  // Reset displayed count and refresh the read-URL snapshot when the view changes.
  // Deliberately excludes readUrls from deps — we only want to re-snapshot on
  // explicit navigation (source/filter change), not on every mark-read action.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setDisplayedCount(60);
    sessionFilterUrlsRef.current = new Set(readUrlsRef.current);
  }, [readFilter, liveSearch, activeSource, filterMode, allItems]);

  // Reset new-article banner when the user switches source/folder/filter context
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { newItemUrlsRef.current = new Set(); setNewArticleCount(0); }, [activeSource, filterMode, folderDef?.id, feedDef?.id, smartFeedDef?.id]);

  // ── Open item by index ────────────────────────────────────────
  function openByIdx(idx) {
    if (idx < 0 || idx >= baseItems.length) return;
    const item = baseItems[idx];
    setOpenItem(item);
    setOpenIdx(idx);
    addToHistory(user.id, item).catch(console.error);
    handleMarkRead(item.url);
    track("article_opened", { source: item.source, filter: filterMode, type: item.type || "rss" });
  }

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      // Don't fire when typing in an input
      if (["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) return;

      switch (e.key) {
        case "j": case "ArrowDown":
          e.preventDefault();
          if (openItem) {
            const nx = openIdx < baseItems.length - 1 ? openIdx + 1 : openIdx;
            setDisplayedCount(c => nx >= c - 5 ? Math.min(c + 40, baseItems.length) : c);
            openByIdx(nx);
          } else {
            const nx = Math.min(cursorIdx + 1, baseItems.length - 1);
            setDisplayedCount(c => nx >= c - 5 ? Math.min(c + 40, baseItems.length) : c);
            setCursorIdx(nx);
          }
          break;
        case "k": case "ArrowUp":
          e.preventDefault();
          if (openItem) {
            openByIdx(openIdx > 0 ? openIdx - 1 : 0);
          } else {
            setCursorIdx(prev => Math.max(prev - 1, 0));
          }
          break;
        case "o": case "Enter":
          if (openItem) break;
          if (cursorIdx >= 0) openByIdx(cursorIdx);
          break;
        case " ":
          if (!openItem && cursorIdx >= 0 && baseItems[cursorIdx]) {
            e.preventDefault();
            const cur = baseItems[cursorIdx];
            readUrls.has(cur.url) ? handleMarkUnread(cur.url) : handleMarkRead(cur.url);
          }
          break;
        case "m":
          if (!openItem && cursorIdx >= 0 && baseItems[cursorIdx]) {
            const cur = baseItems[cursorIdx];
            readUrls.has(cur.url) ? handleMarkUnread(cur.url) : handleMarkRead(cur.url);
          }
          break;
        case "r":
          if (openItem) {
            readUrls.has(openItem.url) ? handleMarkUnread(openItem.url) : handleMarkRead(openItem.url);
          }
          break;
        case "l":
          if (openItem) handleReadLater(openItem);
          break;
        case "s":
          if (openItem) handleSaveItem(openItem);
          break;
        case "Escape":
          setOpenItem(null); setOpenIdx(-1); setExpandedView(false);
          break;
        case "a":
          setShowAdd(true);
          break;
        default: break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, openItem, baseItems, readUrls]);

  useEffect(() => {
    function onMarkFeedRead(e) {
      const urls = e.detail?.urls || [];
      if (!urls.length) return;
      setReadUrls(prev => { const n = new Set(prev); urls.forEach(u => n.add(u)); return n; });
    }
    window.addEventListener("fb-mark-feed-read", onMarkFeedRead);
    return () => window.removeEventListener("fb-mark-feed-read", onMarkFeedRead);
  }, []);

  // ── Action handlers ───────────────────────────────────────────
  const handleAdd = useCallback(async ({ url, type, name }) => {
    if (type === "rss" || type === "podcast") {
      const limit = checkLimit(user, "feeds", feeds.length);
      if (!limit.allowed) { track("plan_limit_hit", { resource: "feeds", count: feeds.length }); throw new Error(limit.reason); }
      const feedData = await fetchRSSFeed(url);
      const record   = await addFeed(user.id, { url, type: type === "podcast" ? "podcast" : "rss", name: name || feedData.title });
      if (onFeedAdded) onFeedAdded(record);
      else setFeeds((prev) => [...prev, record]);
      track("feed_added", { type: record.type });
    } else if (type === "youtube") {
      const limit = checkLimit(user, "feeds", feeds.length);
      if (!limit.allowed) { track("plan_limit_hit", { resource: "feeds", count: feeds.length }); throw new Error(limit.reason); }
      const rssUrl = await resolveYouTubeChannelRSS(url);
      if (!rssUrl) throw new Error("Could not find an RSS feed for this YouTube channel.");
      const feedData = await fetchRSSFeed(rssUrl).catch(() => ({ title: name || "YouTube Channel" }));
      const record   = await addFeed(user.id, { url: rssUrl, type: "youtube", name: name || feedData.title });
      if (onFeedAdded) onFeedAdded(record);
      else setFeeds((prev) => [...prev, record]);
      track("feed_added", { type: "youtube" });
    } else {
      const yt = parseYouTubeUrl(url);
      let item;
      if (yt.isYouTube) {
        item = { url, type: "youtube", title: "YouTube Video", source: "YouTube" };
      } else {
        const content = await fetchArticleContent(url);
        item = { url, type: "article", title: content.title, source: new URL(url).hostname, description: content.description, image: content.image };
      }
      await addToHistory(user.id, item);
      setOpenItem(item); setOpenIdx(-1);
    }
  }, [user]);

  // Force-refresh all feeds, bypassing cache
  function handleRefreshAll() {
    invalidateAllFeeds();
    fetchAllRef.current?.(true);
  }

  async function handleOPMLImport(feedOrList) {
    // Accept a single feed OR an array (bulk OPML import)
    const list = Array.isArray(feedOrList) ? feedOrList : [feedOrList];
    setOpmlProgress({ done: 0, total: list.length });
    let imported = 0;
    for (let i = 0; i < list.length; i++) {
      const feed = list[i];
      try {
        const feedData = await fetchRSSFeed(feed.url).catch(() => ({ title: feed.name || feed.url, items: [] }));
        const record   = await addFeed(user.id, { url: feed.url, type: "rss", name: feed.name || feedData.title });
        if (onFeedAdded) onFeedAdded(record);
        else setFeeds(prev => [...prev, record]);
        imported++;
      } catch (err) {
        console.error("OPML import error:", feed.url, err);
      }
      setOpmlProgress({ done: i + 1, total: list.length });
    }
    setOpmlProgress(null);
    track("opml_imported", { total: list.length, imported });
  }

  async function handleRetryFeed(feed) {
    setFeedErrors(prev => { const n = {...prev}; delete n[feed.id]; return n; });
    setFeedLoading(prev => ({ ...prev, [feed.id]: true }));
    try {
      invalidateCachedFeed(feed.url);
      const data = await fetchRSSFeed(feed.url, { forceRefresh: true });
      const items = data.items.map(item => ({
        ...item, feedId: feed.id, source: feed.name || data.title, type: "rss",
      }));
      setAllItems(prev => {
        const filtered = prev.filter(i => i.feedId !== feed.id);
        return [...filtered, ...items].sort((a,b) => new Date(b.date)-new Date(a.date));
      });
    } catch (err) {
      setFeedErrors(prev => ({ ...prev, [feed.id]: err.message || "Failed to load" }));
    } finally {
      setFeedLoading(prev => ({ ...prev, [feed.id]: false }));
    }
  }

  async function handleDeleteFeed(feedId) {
    await deleteFeed(feedId);
    if (onFeedDeleted) onFeedDeleted(feedId);
    else setFeeds((prev) => prev.filter((f) => f.id !== feedId));
    if (activeSource === feedId) setActiveSource("all");
    track("feed_deleted");
  }

  function handleMarkRead(url) {
    // Optimistic update — sidebar counts and unread filter respond instantly
    setReadUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set([...prev, url]);
      try { localStorage.setItem(`fb-readurls-${user.id}`, JSON.stringify([...next])); } catch {}
      return next;
    });
    if (newItemUrlsRef.current.has(url)) {
      newItemUrlsRef.current.delete(url);
      setNewArticleCount(n => Math.max(0, n - 1));
    }
    // Persist in background — don't block the UI
    markRead(user.id, url).catch(console.error);
  }
  // Keep ref current every render so the IntersectionObserver callback never closes over a stale copy
  markReadFnRef.current = handleMarkRead;

  function handleMarkUnread(url) {
    setReadUrls((prev) => {
      const next = new Set(prev); next.delete(url);
      try { localStorage.setItem(`fb-readurls-${user.id}`, JSON.stringify([...next])); } catch {}
      return next;
    });
    markUnread(user.id, url).catch(console.error);
  }

  function markAboveRead() {
    if (!listRef.current) return;
    const containerTop = listRef.current.getBoundingClientRect().top;
    const urlsToMark = [];
    listRef.current.querySelectorAll("[data-url]").forEach(el => {
      if (el.getBoundingClientRect().bottom < containerTop) {
        const u = el.dataset.url;
        if (u && !readUrlsRef.current.has(u)) urlsToMark.push(u);
      }
    });
    if (!urlsToMark.length) return;
    urlsToMark.forEach(u => handleMarkRead(u));
    showToast(`✓ ${urlsToMark.length} marked read`);
  }

  async function handleMarkAllRead() {
    const urlsToMark = baseItems.map(i => i.url).filter(u => !readUrls.has(u));
    if (urlsToMark.length === 0) return;
    if (!window.confirm(`Mark all ${urlsToMark.length} article${urlsToMark.length !== 1 ? "s" : ""} as read?`)) return;
    await markAllRead(user.id, urlsToMark);
    setReadUrls(prev => {
      const next = new Set([...prev, ...urlsToMark]);
      try { localStorage.setItem(`fb-readurls-${user.id}`, JSON.stringify([...next])); } catch {}
      return next;
    });
    showToast(`✓ Marked ${urlsToMark.length} as read`);
    track("mark_all_read", { count: urlsToMark.length });
  }

  async function handleQuickAddFeed(url, name) {
    try {
      await handleAdd({ url, type: "rss", name });
      showToast(`✓ Added ${name}`);
    } catch (err) {
      showToast(`Failed: ${err.message}`);
    }
  }

  async function handleSaveItem(item) {
    if (savedUrls.has(item.url)) {
      await unsaveItem(user.id, item.url);
      setSavedUrls(prev => { const next = new Set(prev); next.delete(item.url); return next; });
      showToast("Removed from Saved");
    } else {
      await saveItem(user.id, { ...item });
      setSavedUrls(prev => { const next = new Set(prev); next.add(item.url); return next; });
      showToast("Saved");
    }
  }

  async function handleSaveForLater({ url, type }) {
    // Fetch article metadata then save as read-later
    let item = { url, type: "article", title: url, source: new URL(url).hostname };
    try {
      const { fetchArticleContent } = await import("../lib/fetchers");
      const content = await fetchArticleContent(url);
      item = { url, type: "article", title: content.title || url, source: new URL(url).hostname, description: content.description, image: content.image };
    } catch { /* use fallback */ }
    await addReadLater(user.id, item);
    showToast("🔖 Saved");
  }

  async function handleReadLater(item) {
    await addReadLater(user.id, { ...item });
    showToast("🔖 Saved");
    track("article_saved_for_later", { source: item.source });
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function toggleViewMode(mode) { setViewMode(mode); localStorage.setItem(isMobile ? "fb-viewmode-mobile" : "fb-viewmode", mode); }

  useEffect(() => {
    if (!viewMenuOpen) return;
    const h = e => { if (viewMenuRef.current && !viewMenuRef.current.contains(e.target)) setViewMenuOpen(false); };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, [viewMenuOpen]);

  useEffect(() => {
    if (!sourceDropOpen) return;
    const h = e => { if (sourceDropRef.current && !sourceDropRef.current.contains(e.target)) setSourceDropOpen(false); };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, [sourceDropOpen]);

  useEffect(() => {
    if (!errorPopoverOpen) return;
    const h = e => { if (errorPopoverRef.current && !errorPopoverRef.current.contains(e.target)) setErrorPopoverOpen(false); };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, [errorPopoverOpen]);

  const activeFeedName = filterMode === "today"       ? "Today"
    : filterMode === "unread"     ? "Unread"
    : filterMode === "smart"      ? (smartFeedDef?.name || "Smart Feed")
    : filterMode === "feed"       ? (feedDef?.name || "Feed")
    : filterMode === "folder"     ? (folderDef?.name || "Folder")
    : filterMode === "youtube-all" ? "YouTube Channels"
    : activeSource === "all" ? "All Items"
    : feeds.find((f) => f.id === activeSource)?.name || "Feed";

  const unreadCount = allItems.filter((i) => !readUrls.has(i.url)).length;

  // Report total unread count to parent (for sidebar badge)
  useEffect(() => {
    onUnreadCount?.(unreadCount);
  }, [unreadCount]);

  // Report per-feed unread counts to parent (for sidebar feed tree)
  useEffect(() => {
    if (!onFeedUnreadCounts) return;
    const counts = {};
    allItems.forEach(item => {
      if (!readUrls.has(item.url) && item.feedId) {
        counts[item.feedId] = (counts[item.feedId] || 0) + 1;
      }
    });
    onFeedUnreadCounts(counts);
  }, [unreadCount, allItems.length]);

  // Report feed error count to parent (for Sources badge)
  useEffect(() => {
    onFeedErrors?.(Object.keys(feedErrors).length);
  }, [feedErrors]);

  // ── Auto-mark-read on scroll ─────────────────────────────
  // Mark an item as read once its bottom edge has scrolled above the
  // top of the list container (i.e. the user has fully scrolled past it).
  //
  // Design: one stable IntersectionObserver for the component's lifetime.
  // All mutable values (handleMarkRead, autoMarkRead) are accessed via refs
  // so the callback never closes over stale data.
  useEffect(() => { autoMarkReadRef.current = autoMarkRead; }, [autoMarkRead]);

  const observerRef = useRef(null);

  // Create the observer once after the list mounts. root=listRef.current is
  // stable — React reuses the same DOM node for the lifetime of InboxPage.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const obs = new IntersectionObserver(entries => {
      if (!autoMarkReadRef.current) return;
      // Guard: only fire during/shortly after a real scroll event.
      // Layout shifts (items disappearing when marked read) also trigger
      // IntersectionObserver, which causes a cascade of all items being
      // marked read. Scroll events don't fire during layout shifts.
      if (Date.now() - lastScrollRef.current > 1200) return;
      entries.forEach(entry => {
        // Only fire when the item's bottom has scrolled above the container top
        if (!entry.isIntersecting && entry.boundingClientRect.bottom < (entry.rootBounds?.top ?? 0)) {
          const url = entry.target.dataset.url;
          if (url && !readUrlsRef.current.has(url)) markReadFnRef.current?.(url);
        }
      });
    }, { root: list, threshold: 0 });
    observerRef.current = obs;
    return () => obs.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Register items with the observer whenever the list content changes.
  // observe() on an already-observed element is a no-op, so this is safe.
  useEffect(() => {
    const obs = observerRef.current;
    const list = listRef.current;
    if (!obs || !list) return;
    list.querySelectorAll("[data-url]").forEach(el => obs.observe(el));
  }, [baseItems, displayedCount, autoMarkRead]);

  // ── Pull-to-refresh (mobile) ─────────────────────────────
  function handlePTRStart(e) {
    if (!isMobile) return;
    const el = pullRef.current;
    if (!el || (el.scrollTop || 0) > 0) return;
    pullStartY.current = e.touches[0].clientY;
    setIsPulling(true);
  }
  function handlePTRMove(e) {
    if (!isMobile || pullStartY.current === null) return;
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy > 0) {
      e.preventDefault();
      setPullY(Math.min(dy * 0.4, 72)); // dampen pull
    }
  }
  async function handlePTREnd() {
    if (!isMobile) return;
    setIsPulling(false);
    if (pullY > 55) {
      setRefreshing(true);
      setPullY(44); // snap to loading position
      await fetchAllRef.current?.(true);
      setRefreshing(false);
    }
    setPullY(0);
    pullStartY.current = null;
  }

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>


      {/* ── Article list ── */}
      <div style={{ flex: !isMobile && openItem ? "0 0 420px" : 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", background: T.bg, transition: "flex .2s ease" }}>

        {/* Toolbar */}
        <div style={{ padding: isMobile ? "0 14px" : "0 12px", background: T.bg, display: "flex", alignItems: "center", gap: isMobile ? 6 : 5, flexShrink: 0, flexWrap: "nowrap", minWidth: 0, height: isMobile ? 72 : 54, borderBottom: `1px solid ${T.border}` }}>

          {/* Title + unread badge + error badge — hidden when search open */}
          {!searchOpen && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 1, minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: isMobile ? 20 : 17, fontWeight: 700, color: T.text, letterSpacing: "-.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {activeFeedName}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAboveRead}
                  title="Tap to mark scrolled-past items as read"
                  style={{ fontSize: isMobile ? 13 : 11, fontWeight: 600, background: T.accent, color: T.accentText, padding: isMobile ? "3px 10px" : "1px 7px", borderRadius: 20, flexShrink: 0, letterSpacing: "-.01em", border: "none", cursor: "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}
                >
                  {unreadCount}
                </button>
              )}
              {/* Red ! error badge with popover */}
              {Object.keys(feedErrors).length > 0 && (
                <div ref={errorPopoverRef} style={{ position: "relative", flexShrink: 0 }}>
                  <button
                    onClick={() => setErrorPopoverOpen(v => !v)}
                    title={`${Object.keys(feedErrors).length} feed error${Object.keys(feedErrors).length > 1 ? "s" : ""} — click for details`}
                    style={{
                      width: 17, height: 17, borderRadius: "50%", border: "none",
                      background: T.danger, color: T.dangerText, cursor: "pointer",
                      fontSize: 10, fontWeight: 700, fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >!</button>
                  {errorPopoverOpen && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 8px)", left: 0,
                      background: T.card, border: `1px solid ${T.border}`,
                      borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.2)",
                      zIndex: 950, minWidth: 230, overflow: "hidden",
                      animation: "fadeIn .12s ease",
                    }}>
                      <div style={{ padding: "8px 12px 4px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: T.textTertiary }}>
                        Failed Feeds
                      </div>
                      {feeds.filter(f => feedErrors[f.id]).map(feed => (
                        <div key={feed.id} style={{ padding: "5px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ flex: 1, fontSize: 12, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {feed.name || feed.url}
                          </span>
                          <button
                            onClick={() => { handleRetryFeed(feed); setErrorPopoverOpen(false); }}
                            style={{ background: T.accentSurface, color: T.accent, border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                          >Retry</button>
                        </div>
                      ))}
                      <div style={{ borderTop: `1px solid ${T.border}`, margin: "4px 0 0" }}>
                        <button
                          onClick={() => { feeds.filter(f => feedErrors[f.id]).forEach(f => handleRetryFeed(f)); setErrorPopoverOpen(false); }}
                          style={{ width: "100%", background: "transparent", color: T.textSecondary, border: "none", padding: "7px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}
                        >Retry all</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Source filter dropdown — only in inbox mode with multiple feeds, desktop only */}
          {!searchOpen && !isMobile && filterMode === "all" && feeds.length > 1 && (
            <div ref={sourceDropRef} style={{ position: "relative", flexShrink: 0 }}>
              <button onClick={() => setSourceDropOpen(v => !v)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px 4px 10px", borderRadius: 20,
                border: `1px solid ${activeSource !== "all" ? T.accent : "transparent"}`,
                background: activeSource !== "all" ? T.accentSurface : T.surface,
                color: activeSource !== "all" ? T.accent : T.textSecondary,
                cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "inherit",
                transition: "all .12s", whiteSpace: "nowrap",
              }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 4h12M4 8h8M6 12h4"/></svg>
                {activeSource === "all" ? "All sources" : feeds.find(f => f.id === activeSource)?.name || "Source"}
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 3.5l3 3 3-3"/></svg>
              </button>
              {sourceDropOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0,
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.18)",
                  zIndex: 900, minWidth: 200, maxHeight: 320, overflowY: "auto",
                  padding: "4px 0", animation: "fadeIn .12s ease",
                }}>
                  {[{ id: "all", name: "All sources" }, ...feeds].map(f => (
                    <button key={f.id} onClick={() => { setActiveSource(f.id); setSourceDropOpen(false); }} style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "7px 14px", background: activeSource === f.id ? T.accentSurface : "none",
                      border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                      fontSize: 13, color: activeSource === f.id ? T.accent : T.text,
                      fontWeight: activeSource === f.id ? 600 : 400, transition: "background .1s",
                    }}
                      onMouseEnter={e => { if (activeSource !== f.id) e.currentTarget.style.background = T.surface2; }}
                      onMouseLeave={e => { if (activeSource !== f.id) e.currentTarget.style.background = "none"; }}
                    >
                      {f.id === "all" ? "📥 All sources" : f.name || new URL(f.url).hostname}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Spacer — pushes controls right when title is visible */}
          {!searchOpen && <div style={{ flex: 1 }} />}

          {/* All / Unread toggle */}
          {filterMode !== "unread" && !searchOpen && (
            <div style={{ display: "flex", background: T.surface, borderRadius: 100, padding: 2, gap: 0, flexShrink: 0 }}>
              {[{ label: "Unread", val: "unread" }, { label: "All", val: "all" }].map(({ label, val }) => (
                <button key={label} onClick={() => setReadFilter(val)} style={{
                  padding: "3px 11px", borderRadius: 100, border: "none",
                  background: readFilter === val ? T.bg : "transparent",
                  color: readFilter === val ? T.text : T.textTertiary,
                  fontWeight: readFilter === val ? 600 : 400,
                  fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                  transition: "all .15s",
                }}>{label}</button>
              ))}
            </div>
          )}

          {/* Mark all read — icon button */}
          {unreadCount > 0 && !searchOpen && (
            <button onClick={handleMarkAllRead} title="Mark all as read"
              style={{
                background: "transparent", border: "none", borderRadius: 9,
                width: isMobile ? 40 : 30, height: isMobile ? 40 : 30, cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: T.textTertiary, transition: "all .15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = T.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textTertiary; }}
            >
              <svg width={isMobile ? 17 : 14} height={isMobile ? 17 : 14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 9l4 4 10-10"/><path d="M1 5l4 4 10-10" strokeOpacity=".3"/>
              </svg>
            </button>
          )}

          {/* Search input — expands when open */}
          {searchOpen && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <SearchBar ref={searchBarRef} onSelectResult={(item) => { setSearchResult(item); setSearchOpen(false); setLiveSearch(""); }} onLiveSearch={setLiveSearch} onClose={() => { setLiveSearch(""); setSearchOpen(false); }} allItems={allItems} />
            </div>
          )}

          {/* Image size toggle — mobile list view only */}
          {isMobile && viewMode === "list" && !searchOpen && (
            <button
              onClick={() => {
                const next = cardSize === "sm" ? "md" : cardSize === "md" ? "lg" : "sm";
                setCardSize(next);
                localStorage.setItem("fb-cardsize", next);
              }}
              title={`Image size: ${cardSize === "sm" ? "hidden" : cardSize === "md" ? "small" : "large"}`}
              style={{
                background: cardSize !== "sm" ? T.accentSurface : "transparent", border: "none", borderRadius: 9,
                width: 40, height: 40, cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: cardSize !== "sm" ? T.accent : T.textTertiary, transition: "all .15s",
              }}
            >
              {cardSize === "sm"
                ? <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="14" height="10" rx="2"/><line x1="1" y1="8" x2="15" y2="8" strokeOpacity=".3"/></svg>
                : cardSize === "md"
                ? <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="14" height="10" rx="2"/><path d="M4.5 9.5l2-2.5 2 2 1.5-1.5 2 2" strokeWidth="1.5"/></svg>
                : <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="2" width="14" height="12" rx="2"/><path d="M4 10.5l2.5-3 2.5 2.5 1.5-2 2 2.5" strokeWidth="1.5"/></svg>
              }
            </button>
          )}

          {/* Search icon toggle */}
          <button
            onClick={() => { const next = !searchOpen; setSearchOpen(next); if (next) setTimeout(() => searchBarRef.current?.focusInput?.(), 50); else setLiveSearch(""); }}
            title="Search"
            style={{
              background: searchOpen ? T.accentSurface : "transparent", border: "none", borderRadius: 9,
              width: isMobile ? 40 : 30, height: isMobile ? 40 : 30, cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: searchOpen ? T.accent : T.textTertiary, transition: "all .15s",
            }}
            onMouseEnter={e => { if (!searchOpen) { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = T.text; } }}
            onMouseLeave={e => { if (!searchOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textTertiary; } }}
          >
            <svg width={isMobile ? 18 : 14} height={isMobile ? 18 : 14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l3.5 3.5"/>
            </svg>
          </button>

          {/* Settings — mobile only; not in sidebar/BottomNav */}
          {isMobile && !searchOpen && onNavigate && (
            <button
              onClick={() => onNavigate("settings")}
              title="Settings"
              style={{
                background: "transparent", border: "none", borderRadius: 9,
                width: 40, height: 40, cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: T.textTertiary, transition: "all .15s",
                WebkitTapHighlightColor: "transparent",
              }}
              onTouchStart={e => { e.currentTarget.style.background = T.surface; }}
              onTouchEnd={e => { e.currentTarget.style.background = "transparent"; }}
              onTouchCancel={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="2.5"/>
                <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.6 3.6l1.3 1.3M11.1 11.1l1.3 1.3M3.6 12.4l1.3-1.3M11.1 4.9l1.3-1.3"/>
              </svg>
            </button>
          )}


          {/* Refresh button — desktop only; mobile uses pull-to-refresh */}
          {!isMobile && <button onClick={handleRefreshAll} title={lastRefresh ? `Last refreshed ${Math.round((Date.now()-lastRefresh)/60000)}m ago` : "Refresh feeds"} style={{
            background: "transparent", border: "none", borderRadius: 8,
            width: 30, height: 30, cursor: "pointer", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: T.textTertiary, transition: "all .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = T.accent; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textTertiary; }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5"/><path d="M13.5 2.5v3.5h-3.5"/>
            </svg>
          </button>}

          {/* View options — desktop only */}
          {!isMobile && <div ref={viewMenuRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setViewMenuOpen(v => !v)}
              title="View options"
              style={{
                width: 30, height: 30, borderRadius: 8, border: "none",
                background: viewMenuOpen ? T.surface2 : "transparent",
                color: viewMenuOpen ? T.text : T.textTertiary,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all .15s",
              }}
              onMouseEnter={e => { if (!viewMenuOpen) { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = T.text; } }}
              onMouseLeave={e => { if (!viewMenuOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textTertiary; } }}
            >
              {viewMode === "card"
                ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>
                : <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
              }
            </button>
            {viewMenuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.18)",
                zIndex: 900, minWidth: 160, overflow: "hidden",
                animation: "fadeIn .12s ease",
              }}>
                <div style={{ padding: "10px 12px 6px" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Layout</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[{ mode: "list", label: "List", icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 4h12M2 8h12M2 12h12"/></svg> },
                      { mode: "card", label: "Cards", icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg> }
                    ].map(({ mode, label, icon }) => (
                      <button key={mode} onClick={() => toggleViewMode(mode)} style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                        padding: "6px 8px", borderRadius: 8, border: "none",
                        background: viewMode === mode ? T.accentSurface : T.surface,
                        color: viewMode === mode ? T.accent : T.textSecondary,
                        cursor: "pointer", fontSize: 12, fontWeight: viewMode === mode ? 600 : 400,
                        fontFamily: "inherit", transition: "all .12s",
                      }}>{icon}{label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "6px 12px 10px" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Size</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[{ size: "sm", label: "S" }, { size: "md", label: "M" }, { size: "lg", label: "L" }].map(({ size, label }) => (
                      <button key={size} onClick={() => { setCardSize(size); localStorage.setItem("fb-cardsize", size); }} style={{
                        flex: 1, padding: "5px 0", borderRadius: 8, border: "none",
                        background: cardSize === size ? T.accentSurface : T.surface,
                        color: cardSize === size ? T.accent : T.textSecondary,
                        cursor: "pointer", fontSize: 12, fontWeight: cardSize === size ? 700 : 400,
                        fontFamily: "inherit", transition: "all .12s",
                      }}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>}

          <button
            onClick={() => setShowAdd(true)}
            title="Add feed or article"
            aria-label="Add feed or article"
            style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap: 5,
              height: isMobile ? 34 : 30, padding: isMobile ? "0 14px" : "0 12px",
              background: T.accent, color: T.accentText,
              border:"none", borderRadius:8, cursor:"pointer",
              fontFamily:"inherit", flexShrink:0,
              fontSize:12, fontWeight:600, letterSpacing:"-.01em",
              transition:"opacity .12s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="5" y1="1" x2="5" y2="9"/>
              <line x1="1" y1="5" x2="9" y2="5"/>
            </svg>
            {!isMobile && "Add"}
          </button>
        </div>

        {/* Article list / grid */}
        <div
          ref={el => { listRef.current = el; pullRef.current = el; }}
          onTouchStart={isMobile ? handlePTRStart : undefined}
          onTouchMove={isMobile ? handlePTRMove : undefined}
          onTouchEnd={isMobile ? handlePTREnd : undefined}
          onScroll={e => {
            lastScrollRef.current = Date.now();
            const el = e.currentTarget;
            if (isMobile) {
              const top = el.scrollTop;
              const delta = top - (el._lastTop ?? top);
              el._lastTop = top;
              if (top < 80) { el._acc = 0; window.dispatchEvent(new CustomEvent("fb-nav-dir", { detail: "up" })); }
              else if (Math.abs(delta) >= 1) {
                el._acc = (el._acc ?? 0) + delta;
                if (el._acc > 60) { el._acc = 0; window.dispatchEvent(new CustomEvent("fb-nav-dir", { detail: "down" })); }
                else if (el._acc < -60) { el._acc = 0; window.dispatchEvent(new CustomEvent("fb-nav-dir", { detail: "up" })); }
              }
            }
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
              setDisplayedCount(c => c < baseItems.length ? Math.min(c + 40, baseItems.length) : c);
            }
          }}
          style={{ flex: 1, overflowY: "auto", padding: viewMode === "card" ? (isMobile ? "8px 8px 96px" : "14px") : "0", paddingBottom: viewMode !== "card" && isMobile ? "96px" : undefined, WebkitOverflowScrolling: "touch" }}>
          {/* New articles banner — shown after a background refresh detects new items */}
          {newArticleCount > 0 && !loadingItems && (
            <button
              onClick={() => { newItemUrlsRef.current = new Set(); setNewArticleCount(0); listRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{
                width: "100%", border: "none", background: T.accent, color: T.accentText,
                padding: "10px 16px", cursor: "pointer", fontFamily: "inherit",
                fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center",
                justifyContent: "center", gap: 7, transition: "opacity .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 10V2M2 6l4-4 4 4"/>
              </svg>
              {newArticleCount} new article{newArticleCount !== 1 ? "s" : ""} — scroll to top
            </button>
          )}

          {loadingItems && (
            viewMode === "card"
              ? <SkeletonList count={8} cardSize={cardSize} viewMode="card" />
              : <div style={{ padding: "8px 0" }}>
                  {[...Array(8)].map((_, i) => (
                    <SkeletonRow key={i} delay={i * 40} T={T} />
                  ))}
                </div>
          )}

          {!loadingItems && feeds.length === 0 && (
            <OnboardingCard
              onAddFeed={() => setShowAdd(true)}
              onQuickAdd={handleQuickAddFeed}
              T={T}
            />
          )}

          {!loadingItems && baseItems.length === 0 && feeds.length > 0 && (
            <EmptyState
              icon={readFilter === "unread" ? "✅" : "⏳"}
              title={readFilter === "unread" ? "All caught up!" : "Fetching articles…"}
              subtitle={readFilter === "unread" ? "No unread articles. Switch to All to see everything." : "Loading from your feeds."}
            />
          )}

          {viewMode === "card" ? (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : `repeat(auto-fill, minmax(${cardSize === "sm" ? 180 : cardSize === "lg" ? 340 : 260}px, 1fr))`, gap: isMobile ? 8 : (cardSize === "lg" ? 18 : 14) }}>
              {baseItems.slice(0, displayedCount).map((item, i) => (
                <div key={item.url + i}>
                <FeedItem item={item} viewMode="card" cardSize={isMobile ? "sm" : cardSize}
                  isSelected={openItem?.url === item.url}
                  isRead={readUrls.has(item.url)}
                  feedColor={feedColorMap[item.feedId]}
                  onClick={() => { openByIdx(i); }}
                  onSave={() => handleSaveItem(item)}
                  isSaved={savedUrls.has(item.url)}
                  onReadLater={() => handleReadLater(item)}
                  onMarkRead={() => readUrls.has(item.url) ? handleMarkUnread(item.url) : handleMarkRead(item.url)}
                  onPlayPodcast={onPlayPodcast}
                /></div>
              ))}
            </div>
          ) : (() => {
            const rows = [];
            let lastBucket = null;
            baseItems.slice(0, displayedCount).forEach((item, i) => {
              const bucket = dateBucket(item.date);
              if (bucket && bucket !== lastBucket) {
                lastBucket = bucket;
                rows.push(
                  <div key={`hdr-${bucket}-${i}`} style={{
                    padding: isMobile ? "14px 16px 6px" : "14px 20px 6px",
                    fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
                    textTransform: "uppercase", color: T.textTertiary,
                    userSelect: "none",
                  }}>{bucket}</div>
                );
              }
              rows.push(
                <div key={item.url + i} data-url={item.url} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <FeedItem item={item} viewMode="list" cardSize={cardSize}
                    isSelected={openItem ? openItem?.url === item.url : (!isMobile && cursorIdx === i)}
                    isRead={readUrls.has(item.url)}
                    isSaved={savedUrls.has(item.url)}
                    feedColor={feedColorMap[item.feedId]}
                    onClick={() => { setCursorIdx(i); openByIdx(i); }}
                    onSave={() => handleSaveItem(item)}
                    onReadLater={() => handleReadLater(item)}
                    onMarkRead={() => readUrls.has(item.url) ? handleMarkUnread(item.url) : handleMarkRead(item.url)}
                    onPlayPodcast={onPlayPodcast}
                  />
                </div>
              );
            });
            return rows;
          })()}

          {/* Load-more indicator — shows while there are items beyond displayedCount */}
          {!loadingItems && displayedCount < baseItems.length && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "18px 0", gap: 8, color: T.textTertiary, fontSize: 12 }}>
              <div style={{ width: 10, height: 10, border: `1.5px solid ${T.textTertiary}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
              {baseItems.length - displayedCount} more
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: isMobile ? 72 : 24, left: "50%", transform: "translateX(-50%)",
          background: T.text, color: T.bg, borderRadius: 20,
          padding: "8px 18px", fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,.2)", zIndex: 1100,
          animation: "slideUp .2s ease", pointerEvents: "none",
        }}>{toast}</div>
      )}

      {/* ── Right panel — shown on desktop when an article is open ── */}
      {!isMobile && openItem && !expandedView && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: `1px solid ${T.border}` }}>
          <Suspense fallback={null}>
            <ContentViewer
              inline={true}
              item={openItem}
              isSaved={savedUrls.has(openItem?.url)}
              onSave={() => setSavedUrls(prev => { const n = new Set(prev); n.add(openItem.url); return n; })}
              onUnsave={() => setSavedUrls(prev => { const n = new Set(prev); n.delete(openItem.url); return n; })}
              onClose={() => { setOpenItem(null); setOpenIdx(-1); }}
              onNext={openIdx < baseItems.length - 1 ? () => openByIdx(openIdx + 1) : undefined}
              onPrev={openIdx > 0 ? () => openByIdx(openIdx - 1) : undefined}
              currentIdx={openIdx}
              totalCount={baseItems.length}
              onExpand={() => setExpandedView(true)}
            />
          </Suspense>
        </div>
      )}
      {/* ── Full-screen expanded view (desktop) ── */}
      {!isMobile && openItem && expandedView && (
        <Suspense fallback={null}>
          <ContentViewer
            item={openItem}
            isSaved={savedUrls.has(openItem?.url)}
            onSave={() => setSavedUrls(prev => { const n = new Set(prev); n.add(openItem.url); return n; })}
            onUnsave={() => setSavedUrls(prev => { const n = new Set(prev); n.delete(openItem.url); return n; })}
            onClose={() => setExpandedView(false)}
            onNext={openIdx < baseItems.length - 1 ? () => openByIdx(openIdx + 1) : undefined}
            onPrev={openIdx > 0 ? () => openByIdx(openIdx - 1) : undefined}
            currentIdx={openIdx}
            totalCount={baseItems.length}
          />
        </Suspense>
      )}

      {showAdd && <AddModal onAdd={handleAdd} onClose={() => setShowAdd(false)} onSaveForLater={handleSaveForLater} />}
      {/* Mobile: ContentViewer as full-screen overlay */}
      {openItem && isMobile && (
        <Suspense fallback={null}>
          <ContentViewer
            item={openItem}
            isSaved={savedUrls.has(openItem?.url)}
            onSave={() => setSavedUrls(prev => { const n = new Set(prev); n.add(openItem.url); return n; })}
            onUnsave={() => setSavedUrls(prev => { const n = new Set(prev); n.delete(openItem.url); return n; })}
            onClose={() => { setOpenItem(null); setOpenIdx(-1); window.dispatchEvent(new CustomEvent("fb-nav-dir", { detail: "up" })); }}
            onNext={openIdx < baseItems.length - 1 ? () => openByIdx(openIdx + 1) : undefined}
            onPrev={openIdx > 0 ? () => openByIdx(openIdx - 1) : undefined}
            currentIdx={openIdx}
            totalCount={baseItems.length}
          />
        </Suspense>
      )}
      {searchResult && (
        <Suspense fallback={null}>
          <ContentViewer item={searchResult} onClose={() => setSearchResult(null)} />
        </Suspense>
      )}
      {showOPML && <OPMLImport onImport={handleOPMLImport} onClose={() => setShowOPML(false)} />}
      {opmlProgress && (
        <div style={{ position:"fixed", bottom: isMobile?80:24, left:"50%", transform:"translateX(-50%)", zIndex:2000, background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:"12px 20px", boxShadow:"0 4px 24px rgba(0,0,0,.15)", display:"flex", alignItems:"center", gap:12, minWidth:220 }}>
          <div style={{ width:10, height:10, border:`2px solid ${T.accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .7s linear infinite", flexShrink:0 }} />
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:T.text }}>Importing feeds…</div>
            <div style={{ fontSize:11, color:T.textTertiary, marginTop:2 }}>{opmlProgress.done} of {opmlProgress.total} done</div>
          </div>
          <div style={{ marginLeft:"auto" }}>
            <div style={{ width:80, height:4, background:T.surface2, borderRadius:2 }}>
              <div style={{ width:`${(opmlProgress.done/opmlProgress.total)*100}%`, height:"100%", background:T.accent, borderRadius:2, transition:"width .3s" }} />
            </div>
          </div>
        </div>
      )}
      {/* FolderModal is owned by App.jsx — onAddFolder/onEditFolder props trigger it */}
    </div>
  );
}

// ── Onboarding card — shown to new users with no feeds ────────
function OnboardingCard({ onAddFeed, onQuickAdd, T }) {
  const SUGGESTIONS = [
    { name: "Hacker News", url: "https://news.ycombinator.com/rss", emoji: "🟠" },
    { name: "The Verge",   url: "https://www.theverge.com/rss/index.xml", emoji: "⚡" },
    { name: "Wired",       url: "https://www.wired.com/feed/rss", emoji: "🔵" },
    { name: "NASA",        url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", emoji: "🚀" },
    { name: "BBC News",    url: "https://feeds.bbci.co.uk/news/rss.xml", emoji: "🌍" },
    { name: "TechCrunch",  url: "https://techcrunch.com/feed/", emoji: "🟢" },
  ];
  const STEPS = [
    { icon: "📡", title: "Add a feed", desc: "Paste any RSS URL, YouTube channel, or article link" },
    { icon: "📖", title: "Read calmly", desc: "Clean reader view, swipe between articles, no noise" },
    { icon: "⭐", title: "Star what matters", desc: "Highlight, tag, and export to Markdown" },
  ];
  return (
    <div style={{ maxWidth: 560, margin: "40px auto 0", padding: "0 20px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-.02em", marginBottom: 8 }}>
          Welcome to Feedbox
        </div>
        <div style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
          A calm reading space for RSS, YouTube, and articles — no algorithm, no noise.
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 28 }}>
        {STEPS.map((step, i) => (
          <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{step.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>{step.title}</div>
            <div style={{ fontSize: 11, color: T.textTertiary, lineHeight: 1.5 }}>{step.desc}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button onClick={onAddFeed} style={{
        display: "block", width: "100%", padding: "13px 0", background: T.accent, color: T.accentText,
        border: "none", borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: "pointer",
        fontFamily: "inherit", letterSpacing: "-.01em", marginBottom: 24,
        boxShadow: "0 2px 12px rgba(47,111,237,.25)", transition: "opacity .15s",
      }}
        onMouseEnter={e => e.currentTarget.style.opacity=".88"}
        onMouseLeave={e => e.currentTarget.style.opacity="1"}
      >+ Add your first feed</button>

      {/* Suggestions */}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: T.textTertiary, marginBottom: 10 }}>
        Or start with a popular feed
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {SUGGESTIONS.map(s => (
          <button key={s.url} onClick={() => onQuickAdd(s.url, s.name)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "border-color .12s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor=T.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor=T.border}
          >
            <span style={{ fontSize: 18 }}>{s.emoji}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: T.text }}>{s.name}</span>
            <span style={{ fontSize: 11, color: T.accent, fontWeight: 600 }}>Add →</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Feed error classifier ─────────────────────────────────────
function classifyFeedError(msg = "") {
  if (msg.includes("Could not reach") || msg.includes("block external") || msg.includes("blocked"))
    return "Feed unreachable — site may block proxies, or the URL changed.";
  if (msg.includes("Invalid RSS") || msg.includes("Invalid XML") || msg.includes("parsererror"))
    return "Invalid feed format — URL doesn't point to valid RSS/Atom XML.";
  if (msg.includes("timed out") || msg.includes("abort") || msg.includes("Timeout"))
    return "Feed timed out — server is too slow or temporarily unavailable.";
  if (msg.includes("404") || msg.includes("Not Found"))
    return "Feed not found (404) — the URL may have moved or been deleted.";
  if (msg.includes("403") || msg.includes("Forbidden") || msg.includes("401"))
    return "Access denied — this feed may require authentication.";
  if (msg.includes("No items"))
    return "Feed is empty — no articles were found.";
  return msg || "Failed to load feed.";
}

// ── Source sidebar item ───────────────────────────────────────

// ── Skeleton loading row ──────────────────────────────────────
function SkeletonRow({ delay = 0, T }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 16px",
      opacity: 0, animation: `fadeIn .3s ease ${delay}ms forwards`,
    }}>
      <div style={{ width: 20, height: 20, borderRadius: 4, background: T.surface2, animation: "shimmer 1.4s infinite", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ height: 13, borderRadius: 4, background: T.surface2, animation: "shimmer 1.4s infinite", width: `${60 + Math.random() * 30}%` }} />
        <div style={{ height: 11, borderRadius: 4, background: T.surface2, animation: "shimmer 1.4s infinite", width: `${30 + Math.random() * 20}%` }} />
      </div>
    </div>
  );
}

// ── Skeleton loader — shown during initial feed fetch ─────────
function SkeletonList({ count = 8, cardSize = "md", viewMode = "list" }) {
  const { T } = useTheme();
  if (viewMode === "card") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize === "sm" ? 180 : cardSize === "lg" ? 340 : 260}px, 1fr))`, gap: 14, padding: 14 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ background: T.card, borderRadius: 12, overflow: "hidden", animation: `fadeIn .3s ease both`, animationDelay: `${i * 50}ms` }}>
            <div className="skeleton" style={{ aspectRatio: "16/9", width: "100%" }} />
            <div style={{ padding: "12px 14px 14px" }}>
              <div className="skeleton" style={{ height: 10, width: "40%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 13, width: "90%", marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 13, width: "75%", marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 10, width: "55%" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: cardSize === "lg" ? "14px 18px" : "10px 16px", animation: `fadeIn .25s ease both`, animationDelay: `${i * 40}ms` }}>
          <div className="skeleton" style={{ width: cardSize === "lg" ? 96 : 60, height: cardSize === "lg" ? 64 : 44, borderRadius: 7, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="skeleton" style={{ height: 13, width: `${60 + (i % 3) * 15}%`, marginBottom: 7 }} />
            <div className="skeleton" style={{ height: 10, width: "35%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Source item — clean Reeder-style feed row ─────────────────
function SourceItem({ label, icon, feedUrl, feedId, active, onClick, onDelete, onRetry, onMoveToFolder, count, isLoading, error, folders = [] }) {
  const { T } = useTheme();
  const [hovered, setHovered] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const menuRef = useRef(null);
  const favicon = feedUrl ? `https://www.google.com/s2/favicons?domain=${new URL(feedUrl).hostname}&sz=32` : null;
  const FCOLS = { gray:"#8A9099", teal:"#accfae", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };

  useEffect(() => {
    if (!showFolderMenu) return;
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowFolderMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showFolderMenu]);

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "5px 8px 5px 10px", borderRadius: 8,
          cursor: "pointer", marginBottom: 1,
          background: active ? T.accentSurface : hovered ? T.surface2 : "transparent",
          transition: "background .12s",
        }}
      >
        {/* Drag handle — separate from click area */}
        {feedId && hovered && (
          <span
            draggable
            onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("feedId", feedId); e.dataTransfer.effectAllowed = "move"; }}
            onClick={e => e.stopPropagation()}
            title="Drag to folder"
            style={{ cursor:"grab", color:T.textTertiary, fontSize:10, flexShrink:0, userSelect:"none", marginLeft:-4, marginRight:-4 }}
          >⠿</span>
        )}
        <div style={{ width: 14, height: 14, borderRadius: 3, overflow: "hidden", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: active ? 1 : 0.7 }}>
          {favicon
            ? <img src={favicon} alt="" width={12} height={12} style={{ display: "block" }} onError={e => { e.target.style.display = "none"; }} />
            : <span style={{ fontSize: 8 }}>{icon || "•"}</span>}
        </div>

        <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 400, color: error ? T.warning : active ? T.accentText : T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-.01em" }}>
          {label}
        </span>

        {isLoading && <span style={{ width: 9, height: 9, border: `1.5px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />}
        {error && !isLoading && !hovered && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.danger, flexShrink: 0 }} />}
        {count > 0 && !error && !isLoading && !hovered && (
          <span style={{ fontSize: 11, fontWeight: 600, color: active ? T.accent : T.textTertiary, flexShrink: 0 }}>{count}</span>
        )}

        {hovered && !isLoading && (
          <span style={{ display: "flex", gap: 1, flexShrink: 0 }}>
            {onMoveToFolder && folders.length > 0 && (
              <button onClick={e => { e.stopPropagation(); setShowFolderMenu(v => !v); }}
                title="Move to folder"
                style={{ background: "none", border: "none", color: T.textTertiary, cursor: "pointer", fontSize: 12, padding: "1px 4px", borderRadius: 4, lineHeight: 1, fontFamily: "inherit" }}
                onMouseEnter={e => e.currentTarget.style.color = T.accent}
                onMouseLeave={e => e.currentTarget.style.color = T.textTertiary}
              >⤴</button>
            )}
            {error && (
              <button onClick={e => { e.stopPropagation(); setShowError(v => !v); }}
                style={{ background: `${T.danger}18`, border: "none", borderRadius: 4, color: T.danger, cursor: "pointer", fontSize: 10, fontWeight: 700, padding: "1px 4px", fontFamily: "inherit" }}>!</button>
            )}
            {onDelete && (
              <button onClick={e => { e.stopPropagation(); onDelete(); }}
                style={{ background: "none", border: "none", color: T.textTertiary, cursor: "pointer", fontSize: 14, padding: "0 3px", lineHeight: 1, fontFamily: "inherit" }}
                onMouseEnter={e => e.currentTarget.style.color = T.danger}
                onMouseLeave={e => e.currentTarget.style.color = T.textTertiary}
              >×</button>
            )}
          </span>
        )}
      </div>

      {/* Folder picker */}
      {showFolderMenu && (
        <div ref={menuRef} style={{ position: "absolute", right: 6, top: "100%", zIndex: 100, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,.14)", minWidth: 152, padding: "4px 0", animation: "fadeInScale .12s ease" }}>
          <div style={{ padding: "5px 12px 6px", fontSize: 10, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".07em", borderBottom: `1px solid ${T.border}`, marginBottom: 3 }}>Move to folder</div>
          <div onClick={e => { e.stopPropagation(); onMoveToFolder(null); setShowFolderMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", color: T.textSecondary }}
            onMouseEnter={e => e.currentTarget.style.background = T.surface2}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", border: `1px solid ${T.border}`, flexShrink: 0 }} />
            No folder
          </div>
          {folders.map(f => (
            <div key={f.id}
              onClick={e => { e.stopPropagation(); onMoveToFolder(f.id); setShowFolderMenu(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", color: T.text }}
              onMouseEnter={e => e.currentTarget.style.background = T.surface2}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: FCOLS[f.color] || "#8A9099", flexShrink: 0 }} />
              {f.name}
            </div>
          ))}
        </div>
      )}

      {/* Error panel */}
      {error && showError && (
        <div style={{ margin: "0 6px 6px", background: `${T.danger}10`, border: `1px solid ${T.danger}30`, borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: T.danger, lineHeight: 1.5, marginBottom: 6 }}>
            {classifyFeedError(error)}
          </div>
          {onRetry && (
            <button onClick={e => { e.stopPropagation(); onRetry(); setShowError(false); }}
              style={{ background: T.accent, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: T.accentText, fontFamily: "inherit" }}>
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
