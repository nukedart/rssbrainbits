import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useSwipe } from "../hooks/useSwipe.js";
import { useAuth } from "../hooks/useAuth";
import { getFeeds, addFeed, deleteFeed, addToHistory, saveItem,
         addReadLater, getReadUrls, markRead, markUnread, matchesSmartFeed } from "../lib/supabase";
import { fetchRSSFeed, fetchArticleContent, parseYouTubeUrl } from "../lib/fetchers";
import { invalidateAllFeeds, invalidateCachedFeed, cacheAge } from "../lib/feedCache";
import FeedItem from "../components/FeedItem";
import ContentViewer from "../components/ContentViewer";
import AddModal from "../components/AddModal";
import { Button, EmptyState, Spinner } from "../components/UI";
import PlanGate from "../components/PlanGate";
import { checkLimit } from "../lib/plan";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import SearchBar from "../components/SearchBar";
import OPMLImport from "../components/OPMLImport";

export default function InboxPage({ filterMode = "all", smartFeedDef = null, onUnreadCount, folders = [], feeds: propFeeds = null, onFeedAdded, onFeedDeleted, onAddFolder, onEditFolder, onMoveFeedToFolder, onPlayPodcast, user: propUser = null }) {
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
  const [cursorIdx, setCursorIdx]       = useState(0); // keyboard nav cursor
  const [viewMode, setViewMode]         = useState(() => localStorage.getItem("fb-viewmode") || "list");
  const [cardSize, setCardSize]           = useState(() => localStorage.getItem("fb-cardsize") || "md");
  const [readUrls, setReadUrls]         = useState(new Set());
  const [hideRead, setHideRead]         = useState(false);
  const [autoMarkRead, setAutoMarkRead] = useState(() => localStorage.getItem("fb-automark") === "true");
  const [toast, setToast]               = useState(null);
  const [searchResult, setSearchResult]   = useState(null);
  const [liveSearch, setLiveSearch]       = useState(""); // client-side search across unread
  const [feedErrors, setFeedErrors]         = useState({});   // feedId -> error message
  const [feedLoading, setFeedLoading]       = useState({});   // feedId -> bool
  const [lastRefresh, setLastRefresh]       = useState(null);
  const [newArticleCount, setNewArticleCount] = useState(0);
  const prevItemUrlsRef = useRef(new Set());
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

  function toggleFolderOpen(id) {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  const listRef = useRef(null);
  const searchBarRef = useRef(null); // for f-key focus

  useEffect(() => {
    if (!user) return;
    // If feeds are lifted from App.jsx, don't re-fetch
    if (propFeeds !== null) { setLoadingFeeds(false); return; }
    getFeeds(user.id).then(_setLocalFeeds).catch(console.error).finally(() => setLoadingFeeds(false));
    // Open all folders by default when component mounts
    if (folders.length > 0) setOpenFolders(new Set(folders.map(f => f.id)));
    // Load read URLs — seed from localStorage cache first for instant unread counts,
    // then merge with Supabase truth so the badge is never wrong after reload
    const cacheKey = `fb-readurls-${user.id}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) setReadUrls(new Set(JSON.parse(cached)));
    } catch {}
    getReadUrls(user.id).then(urls => {
      setReadUrls(urls);
      try { localStorage.setItem(cacheKey, JSON.stringify([...urls])); } catch {}
    }).catch(console.error);
  }, [user]);

  useEffect(() => {
    const rssFeeds = feeds.filter((f) => f.type === "rss" || f.type === "podcast");
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
        newItems.forEach(item => { if (item.url) itemMap.set(normaliseUrl(item.url), { ...item }); }); // keep original url, dedup by normalised key
        const sorted = [...itemMap.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
        // Count genuinely new articles (not seen in previous fetch)
        if (prevItemUrlsRef.current.size > 0) {
          const newCount = sorted.filter(i => !prevItemUrlsRef.current.has(i.url)).length;
          if (newCount > 0) setNewArticleCount(n => n + newCount);
        }
        setAllItems(sorted);
        setLoadingItems(false);
      }

      setFeedLoading(Object.fromEntries(rssFeeds.map(f => [f.id, true])));
      setLoadingItems(true);

      await Promise.allSettled(
        rssFeeds.map(async (feed) => {
          try {
            // fetchRSSFeed returns { title, items } — from cache or network
            const data = await fetchRSSFeed(feed.url, { forceRefresh });
            if (!data?.items?.length) throw new Error("No items in feed");
            const items = data.items.map((item) => ({
              ...item,
              feedId: feed.id,
              source: feed.name || data.title,
              fetchFullContent: !!feed.fetch_full_content,
              type:   "rss",
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
    const timer = setInterval(() => {
      // Silent background refresh — compare new items against known URLs
      const prevUrls = prevItemUrlsRef.current;
      fetchAll(false).then(() => {
        // newArticleCount updated inside fetchAll via setAllItems
      });
    }, REFRESH_INTERVAL);

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
      items = items.filter((i) => !readUrls.has(i.url));
    }
    if (filterMode === "smart") {
      if (!smartFeedDef) return []; // still loading — return empty
      items = items.filter((i) => matchesSmartFeed(i, smartFeedDef));
    }
    if (filterMode !== "unread" && hideRead) items = items.filter((i) => !readUrls.has(i.url));
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
    return items;
  })();

  // ── Open item by index ────────────────────────────────────────
  function openByIdx(idx) {
    if (idx < 0 || idx >= baseItems.length) return;
    const item = baseItems[idx];
    setOpenItem(item);
    setOpenIdx(idx);
    addToHistory(user.id, item).catch(console.error);
    handleMarkRead(item.url);
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
            openByIdx(openIdx < baseItems.length - 1 ? openIdx + 1 : openIdx);
          } else {
            setCursorIdx(prev => Math.min(prev + 1, baseItems.length - 1));
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
          setOpenItem(null); setOpenIdx(-1);
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

  // ── Action handlers ───────────────────────────────────────────
  const handleAdd = useCallback(async ({ url, type, name }) => {
    if (type === "rss") {
      const limit = checkLimit(user, "feeds", feeds.length);
      if (!limit.allowed) { throw new Error(limit.reason); }
      const feedData = await fetchRSSFeed(url);
      const record   = await addFeed(user.id, { url, type: "rss", name: name || feedData.title });
      if (onFeedAdded) onFeedAdded(record);
      else setFeeds((prev) => [...prev, record]);
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
    // Re-trigger feed effect by bumping a counter
    setFeeds(prev => [...prev]);
  }

  async function handleOPMLImport(feedOrList) {
    // Accept a single feed OR an array (bulk OPML import)
    const list = Array.isArray(feedOrList) ? feedOrList : [feedOrList];
    setOpmlProgress({ done: 0, total: list.length });
    for (let i = 0; i < list.length; i++) {
      const feed = list[i];
      try {
        const feedData = await fetchRSSFeed(feed.url).catch(() => ({ title: feed.name || feed.url, items: [] }));
        const record   = await addFeed(user.id, { url: feed.url, type: "rss", name: feed.name || feedData.title });
        setFeeds(prev => [...prev, record]);
      } catch (err) {
        console.error("OPML import error:", feed.url, err);
      }
      setOpmlProgress({ done: i + 1, total: list.length });
    }
    setOpmlProgress(null);
  }

  async function handleRetryFeed(feed) {
    setFeedErrors(prev => { const n = {...prev}; delete n[feed.id]; return n; });
    setFeedLoading(prev => ({ ...prev, [feed.id]: true }));
    try {
      const { invalidateCachedFeed } = await import("../lib/feedCache");
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
  }

  async function handleMarkRead(url) {
    await markRead(user.id, url);
    setReadUrls((prev) => {
      const next = new Set([...prev, url]);
      try { localStorage.setItem(`fb-readurls-${user.id}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  async function handleMarkUnread(url) {
    await markUnread(user.id, url);
    setReadUrls((prev) => {
      const next = new Set(prev); next.delete(url);
      try { localStorage.setItem(`fb-readurls-${user.id}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  async function handleSaveItem(item) {
    await saveItem(user.id, { ...item });
    showToast("✓ Saved");
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
    showToast("⏱ Saved for later");
  }

  async function handleReadLater(item) {
    await addReadLater(user.id, { ...item });
    showToast("⏱ Added to Read Later");
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function toggleViewMode(mode) { setViewMode(mode); localStorage.setItem("fb-viewmode", mode); }

  const activeFeedName = filterMode === "today"  ? "Today"
    : filterMode === "unread" ? "Unread"
    : filterMode === "smart"  ? (smartFeedDef?.name || "Smart Feed")
    : activeSource === "all" ? "All Items"
    : feeds.find((f) => f.id === activeSource)?.name || "Feed";

  const unreadCount = allItems.filter((i) => !readUrls.has(i.url)).length;

  // Report total unread count to parent (for sidebar badge)
  useEffect(() => {
    onUnreadCount?.(unreadCount);
  }, [unreadCount]);

  // ── Auto-mark-read on scroll ─────────────────────────────
  const observerRef = useRef(null);
  useEffect(() => {
    if (!autoMarkRead) {
      observerRef.current?.disconnect();
      return;
    }
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.9) {
          const url = entry.target.dataset.url;
          if (url && !readUrls.has(url)) {
            handleMarkRead(url);
          }
        }
      });
    }, { threshold: 0.9, rootMargin: "0px" });
    return () => observerRef.current?.disconnect();
  }, [autoMarkRead, readUrls]);

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

      {/* ── Source list (only on inbox/today mode) ── */}
      {filterMode !== "today" && filterMode !== "unread" && filterMode !== "smart" && !isMobile && !isTablet && (
        <div style={{ width: 234, flexShrink: 0, borderRight: `1px solid ${T.border}`, background: T.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "13px 12px 10px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center" }}>
            <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".08em" }}>Sources</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "6px 6px" }}>
            <SourceItem label="All Items" icon="📥" count={allItems.filter(i => !readUrls.has(i.url)).length}
              active={activeSource === "all"} onClick={() => setActiveSource("all")} />

            {/* ── Folders ── */}
            {folders.length > 0 && folders.map(folder => {
              const folderFeeds = feeds.filter(f => f.folder_id === folder.id);
              const folderUnread = folderFeeds.reduce((n, f) => n + allItems.filter(i => i.feedId === f.id && !readUrls.has(i.url)).length, 0);
              const FOLDER_COLORS = { gray:"#8A9099", teal:"#4BBFAF", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };
              const dotColor = FOLDER_COLORS[folder.color] || "#8A9099";
              const isOpen = openFolders.has(folder.id);
              return (
                <div key={folder.id}>
                  {/* Folder header row — drag target */}
                  <div
                    style={{ display:"flex", alignItems:"center", padding:"7px 8px 3px", cursor:"pointer", borderRadius:6, background: dragOverFolder===folder.id ? T.accentSurface : "transparent", border: `1px solid ${dragOverFolder===folder.id ? T.accent : "transparent"}`, transition:"all .1s" }}
                    onClick={() => toggleFolderOpen(folder.id)}
                    onMouseEnter={e => { if (dragOverFolder !== folder.id) e.currentTarget.style.background=T.surface2; }}
                    onMouseLeave={e => { if (dragOverFolder !== folder.id) e.currentTarget.style.background="transparent"; }}
                    onDragOver={e => { e.preventDefault(); setDragOverFolder(folder.id); }}
                    onDragLeave={() => setDragOverFolder(null)}
                    onDrop={async e => {
                      e.preventDefault();
                      const feedId = e.dataTransfer.getData("feedId");
                      if (feedId && onMoveFeedToFolder) {
                        // Update local feeds state immediately so sources panel re-renders
                        setFeeds(prev => prev.map(f => f.id === feedId ? { ...f, folder_id: folder.id } : f));
                        await onMoveFeedToFolder(feedId, folder.id);
                      }
                      setDragOverFolder(null);
                      setDraggingFeed(null);
                    }}
                  >
                    <span style={{ fontSize:9, color:dotColor, marginRight:5, display:"inline-block", transform: isOpen?"rotate(90deg)":"rotate(0deg)", transition:"transform .15s" }}>▶</span>
                    <span style={{ width:7, height:7, borderRadius:"50%", background:dotColor, flexShrink:0, marginRight:6 }} />
                    <span style={{ flex:1, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:T.textSecondary }}>{folder.name}</span>
                    {folderUnread > 0 && <span style={{ fontSize:9, fontWeight:700, color:T.accent, marginRight:4 }}>{folderUnread}</span>}
                    <span
                      onClick={e => { e.stopPropagation(); onEditFolder?.(folder); }}
                      style={{ fontSize:12, color:T.textTertiary, cursor:"pointer", opacity:0, padding:"0 4px", transition:"opacity .1s" }}
                      onMouseEnter={e => e.currentTarget.style.opacity="1"}
                      onMouseLeave={e => e.currentTarget.style.opacity="0"}
                    >···</span>
                  </div>
                  {/* Feeds inside folder */}
                  {isOpen && folderFeeds.map(feed => {
                    const feedUnread = allItems.filter(i => i.feedId === feed.id && !readUrls.has(i.url)).length;
                    return (
                      <div key={feed.id} style={{ paddingLeft: 10 }}>
                        <SourceItem
                          label={feed.name || new URL(feed.url).hostname}
                          feedUrl={feed.url}
                          feedId={feed.id}
                          count={feedUnread}
                          active={activeSource === feed.id}
                          onClick={() => setActiveSource(feed.id)}
                          onDelete={() => handleDeleteFeed(feed.id)}
                          onRetry={() => handleRetryFeed(feed)}
                          onMoveToFolder={async (folderId) => {
                setFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, folder_id: folderId } : f));
                await onMoveFeedToFolder?.(feed.id, folderId);
              }}
                          folders={folders}
                          isLoading={feedLoading[feed.id]}
                          error={feedErrors[feed.id]}
                        />
                      </div>
                    );
                  })}
                  {isOpen && folderFeeds.length === 0 && (
                    <div style={{ padding:"4px 8px 4px 28px", fontSize:11, color:T.textTertiary, fontStyle:"italic" }}>No feeds</div>
                  )}
                </div>
              );
            })}

            {/* ── Ungrouped feeds ── */}
            {feeds.filter(f => !f.folder_id).length > 0 && (
              <div style={{ padding: "8px 8px 3px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: T.textTertiary }}>
                {folders.length > 0 ? "Ungrouped" : "Feeds"}
              </div>
            )}

            {loadingFeeds
              ? <div style={{ padding: "14px 8px" }}><Spinner size={14} /></div>
              : feeds.filter(f => !f.folder_id).map((feed) => {
                  const feedUnread = allItems.filter(i => i.feedId === feed.id && !readUrls.has(i.url)).length;
                  return (
                    <SourceItem key={feed.id}
                      label={feed.name || new URL(feed.url).hostname}
                      feedUrl={feed.url}
                      feedId={feed.id}
                      count={feedUnread}
                      active={activeSource === feed.id}
                      onClick={() => setActiveSource(feed.id)}
                      onDelete={() => handleDeleteFeed(feed.id)}
                      onRetry={() => handleRetryFeed(feed)}
                      onMoveToFolder={async (folderId) => {
                setFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, folder_id: folderId } : f));
                await onMoveFeedToFolder?.(feed.id, folderId);
              }}
                      folders={folders}
                      isLoading={feedLoading[feed.id]}
                      error={feedErrors[feed.id]}
                    />
                  );
                })
            }


          </div>
        </div>
      )}

      {/* ── Article list ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", background: T.bg }}>

        {/* Toolbar */}
        <div style={{ padding: "0 12px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: isMobile ? 6 : 8, flexShrink: 0, flexWrap: "nowrap", minWidth: 0, height: isMobile ? 48 : 52 }}>

          {/* Title + unread badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 1, minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: "-.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {activeFeedName}
            </div>
            {unreadCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, background: T.accent, color: "#fff", padding: "1px 6px", borderRadius: 10, flexShrink: 0 }}>
                {unreadCount}
              </span>
            )}
            {/* Error badge */}
            {Object.keys(feedErrors).length > 0 && (
              <span title={`${Object.keys(feedErrors).length} feed(s) failed to load`} style={{ fontSize: 10, fontWeight: 700, background: T.danger, color: "#fff", padding: "1px 6px", borderRadius: 10, cursor: "default", flexShrink: 0 }}>
                {Object.keys(feedErrors).length} error{Object.keys(feedErrors).length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Search — fills remaining space */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchBar ref={searchBarRef} onSelectResult={(item) => setSearchResult(item)} onLiveSearch={setLiveSearch} onClose={() => { setLiveSearch(""); }} allItems={allItems} />
          </div>

          {/* Refresh button */}
          <button onClick={handleRefreshAll} title={lastRefresh ? `Last refreshed ${Math.round((Date.now()-lastRefresh)/60000)}m ago` : "Refresh feeds"} style={{
            background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 7,
            width: 28, height: 32, cursor: "pointer", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: T.textSecondary, fontSize: 14, transition: "all .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = T.accent; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.color = T.textSecondary; e.currentTarget.style.borderColor = T.border; }}
          >↺</button>

          {/* Hide read toggle */}
          {filterMode !== "unread" && (
            <button onClick={() => setHideRead(v => !v)} title="Toggle read articles" style={{
              background: hideRead ? T.accentSurface : T.surface2,
              border: `1px solid ${hideRead ? T.accent : T.border}`,
              borderRadius: 8, padding: "0 10px", height: 32, cursor: "pointer",
              fontSize: 11, fontWeight: 600, flexShrink: 0,
              color: hideRead ? T.accentText : T.textSecondary, fontFamily: "inherit",
              display: "flex", alignItems: "center",
            }}>
              {isMobile ? (hideRead ? "·" : "·") : (hideRead ? "Unread only" : "All")}
            </button>
          )}

          {/* View + Size toggles */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 2, background: T.surface2, borderRadius: 8, padding: "3px" }}>
              {[{ mode: "list", icon: "≡", title: "List" }, { mode: "card", icon: "⊞", title: "Cards" }].map(({ mode, icon, title }) => (
                <button key={mode} onClick={() => toggleViewMode(mode)} title={title} style={{
                  width: 28, height: 26, borderRadius: 6, border: "none",
                  background: viewMode === mode ? T.card : "transparent",
                  color: viewMode === mode ? T.text : T.textTertiary,
                  cursor: "pointer", fontSize: 14, fontWeight: 700,
                  boxShadow: viewMode === mode ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                  transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "center",
                }}>{icon}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 2, background: T.surface2, borderRadius: 8, padding: "3px" }}>
              {[{ size: "sm", label: "S" }, { size: "md", label: "M" }, { size: "lg", label: "L" }].map(({ size, label }) => (
                <button key={size} onClick={() => { setCardSize(size); localStorage.setItem("fb-cardsize", size); }} title={`${size === "sm" ? "Small" : size === "md" ? "Medium" : "Large"} view`} style={{
                  width: 24, height: 26, borderRadius: 6, border: "none",
                  background: cardSize === size ? T.card : "transparent",
                  color: cardSize === size ? T.text : T.textTertiary,
                  cursor: "pointer", fontSize: 11, fontWeight: 700,
                  boxShadow: cardSize === size ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                  transition: "all .15s", fontFamily: "inherit",
                }}>{label}</button>
              ))}
            </div>
          </div>

          <Button size="sm" onClick={() => setShowAdd(true)} style={{ height: 32, paddingLeft: isMobile ? 10 : 12, paddingRight: isMobile ? 10 : 12, flexShrink: 0 }}>{isMobile ? "+" : "+ Add"}</Button>
        </div>

        {/* Article list / grid */}
        <div
          ref={el => { listRef.current = el; pullRef.current = el; }}
          onTouchStart={isMobile ? handlePTRStart : undefined}
          onTouchMove={isMobile ? handlePTRMove : undefined}
          onTouchEnd={isMobile ? handlePTREnd : undefined}
          style={{ flex: 1, overflowY: "auto", padding: viewMode === "card" ? "14px" : "0", WebkitOverflowScrolling: "touch" }}>
          {loadingItems && (
            viewMode === "card"
              ? <SkeletonList count={8} cardSize={cardSize} viewMode="card" />
              : <div style={{ padding: "8px 0" }}>
                  {[...Array(8)].map((_, i) => (
                    <SkeletonRow key={i} delay={i * 40} T={T} />
                  ))}
                </div>
          )}

          {!loadingItems && baseItems.length === 0 && feeds.length === 0 && (
            <EmptyState icon="📡" title="Your inbox is empty"
              subtitle="Add an RSS feed, paste an article URL, or drop in a YouTube link."
              action={<Button onClick={() => setShowAdd(true)}>+ Add your first source</Button>}
            />
          )}

          {!loadingItems && baseItems.length === 0 && feeds.length > 0 && (
            <EmptyState icon={hideRead ? "✅" : "⏳"}
              title={hideRead ? "All caught up!" : "Fetching articles…"}
              subtitle={hideRead ? "No unread articles. Toggle to see all." : "Loading from your feeds."}
            />
          )}

          {viewMode === "card" ? (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(auto-fill, minmax(${cardSize === "sm" ? 180 : cardSize === "lg" ? 340 : 260}px, 1fr))`, gap: cardSize === "lg" ? 18 : 14 }}>
              {baseItems.map((item, i) => (
                <div key={item.url + i} style={{ animation: `fadeInUp .2s ease both`, animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                <FeedItem item={item} viewMode="card" cardSize={isMobile ? "md" : cardSize}
                  isSelected={openItem?.url === item.url}
                  isRead={readUrls.has(item.url)}
                  onClick={() => { if (item.isPodcast && item.audioUrl && onPlayPodcast) { onPlayPodcast(item); } else { openByIdx(i); } }}
                  onSave={() => handleSaveItem(item)}
                  onReadLater={() => handleReadLater(item)}
                  onMarkRead={() => readUrls.has(item.url) ? handleMarkUnread(item.url) : handleMarkRead(item.url)}
                  onPlayPodcast={onPlayPodcast}
                /></div>
              ))}
            </div>
          ) : (
            baseItems.map((item, i) => (
              <div key={item.url + i} data-url={item.url} ref={el => { if (el && autoMarkRead && observerRef.current) observerRef.current.observe(el); }} style={{ animation: `fadeInUp .18s ease both`, animationDelay: `${Math.min(i * 20, 240)}ms` }}>
              <FeedItem item={item} viewMode="list" cardSize={cardSize}
                isSelected={openItem ? openItem?.url === item.url : cursorIdx === i}
                isRead={readUrls.has(item.url)}
                onClick={() => { setCursorIdx(i); if (item.isPodcast && item.audioUrl && onPlayPodcast) { onPlayPodcast(item); } else { openByIdx(i); } }}
                onSave={() => handleSaveItem(item)}
                onReadLater={() => handleReadLater(item)}
                onMarkRead={() => readUrls.has(item.url) ? handleMarkUnread(item.url) : handleMarkRead(item.url)}
                onPlayPodcast={onPlayPodcast}
              /></div>
            ))
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

      {showAdd && <AddModal onAdd={handleAdd} onClose={() => setShowAdd(false)} onSaveForLater={handleSaveForLater} />}
      {openItem && <ContentViewer
        item={openItem}
        onClose={() => { setOpenItem(null); setOpenIdx(-1); }}
        onNext={openIdx < baseItems.length - 1 ? () => openByIdx(openIdx + 1) : undefined}
        onPrev={openIdx > 0 ? () => openByIdx(openIdx - 1) : undefined}
      />}
      {searchResult && <ContentViewer item={searchResult} onClose={() => setSearchResult(null)} />}
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

// ── Source sidebar item ───────────────────────────────────────

// ── Skeleton loading row ──────────────────────────────────────
function SkeletonRow({ delay = 0, T }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 16px", borderBottom: `1px solid ${T.border}`,
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
          <div key={i} style={{ background: T.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}`, animation: `fadeIn .3s ease both`, animationDelay: `${i * 50}ms` }}>
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
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: cardSize === "lg" ? "14px 18px" : "10px 16px", borderBottom: `1px solid ${T.border}`, animation: `fadeIn .25s ease both`, animationDelay: `${i * 40}ms` }}>
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
  const FCOLS = { gray:"#8A9099", teal:"#4BBFAF", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" };

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
            {error.includes("Could not") ? "Feed unreachable. The site may block proxies or the URL changed." : error}
          </div>
          {onRetry && (
            <button onClick={e => { e.stopPropagation(); onRetry(); setShowError(false); }}
              style={{ background: T.accent, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#fff", fontFamily: "inherit" }}>
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
