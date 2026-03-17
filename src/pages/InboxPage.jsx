import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { getFeeds, addFeed, deleteFeed, getFolders, addFolder, updateFolder, deleteFolder, setFeedFolder, addToHistory, saveItem,
         addReadLater, getReadUrls, markRead, markUnread, matchesSmartFeed } from "../lib/supabase";
import { fetchRSSFeed, fetchArticleContent, parseYouTubeUrl } from "../lib/fetchers";
import { invalidateAllFeeds, invalidateCachedFeed, cacheAge } from "../lib/feedCache";
import FeedItem from "../components/FeedItem";
import ContentViewer from "../components/ContentViewer";
import AddModal from "../components/AddModal";
import FolderModal from "../components/FolderModal";
import { Button, EmptyState, Spinner } from "../components/UI";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import SearchBar from "../components/SearchBar";
import OPMLImport from "../components/OPMLImport";

export default function InboxPage({ filterMode = "all", smartFeedDef = null, onUnreadCount, folders = [], onAddFolder, onEditFolder, onMoveFeedToFolder }) {
  const { T } = useTheme();
  const { user } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();

  const [feeds, setFeeds]               = useState([]);
  const [allItems, setAllItems]         = useState([]);
  const [activeSource, setActiveSource] = useState("all");
  const [loadingFeeds, setLoadingFeeds] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showAdd, setShowAdd]           = useState(false);
  const [openItem, setOpenItem]         = useState(null);
  const [openIdx, setOpenIdx]           = useState(-1);
  const [viewMode, setViewMode]         = useState(() => localStorage.getItem("fb-viewmode") || "list");
  const [cardSize, setCardSize]           = useState(() => localStorage.getItem("fb-cardsize") || "md");
  const [readUrls, setReadUrls]         = useState(new Set());
  const [hideRead, setHideRead]         = useState(false);
  const [toast, setToast]               = useState(null);
  const [searchResult, setSearchResult]   = useState(null);
  const [feedErrors, setFeedErrors]         = useState({});   // feedId -> error message
  const [feedLoading, setFeedLoading]       = useState({});   // feedId -> bool
  const [lastRefresh, setLastRefresh]       = useState(null);
  const [newArticleCount, setNewArticleCount] = useState(0);
  const prevItemUrlsRef = useRef(new Set());
  const [showOPML, setShowOPML]           = useState(false);
  const [editingFolder, setEditingFolder]   = useState(null);
  const [dragFeedId, setDragFeedId]         = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    getFeeds(user.id).then(setFeeds).catch(console.error).finally(() => setLoadingFeeds(false));
    getReadUrls(user.id).then(setReadUrls).catch(console.error);
  }, [user]);

  useEffect(() => {
    const rssFeeds = feeds.filter((f) => f.type === "rss");
    if (!rssFeeds.length) { setAllItems([]); setLoadingItems(false); return; }

    setFeedErrors({});

    // Fetch all feeds — each resolves independently, items merge as they arrive.
    // fetchRSSFeed handles cache internally (returns cached data instantly when fresh).
    const fetchAll = async (forceRefresh = false) => {
      const itemMap = new Map();

      function mergeAndSort(newItems) {
        newItems.forEach(item => { if (item.url) itemMap.set(item.url, item); });
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
          openByIdx(openIdx < baseItems.length - 1 ? openIdx + 1 : openIdx);
          break;
        case "k": case "ArrowUp":
          e.preventDefault();
          openByIdx(openIdx > 0 ? openIdx - 1 : 0);
          break;
        case "o": case "Enter":
          if (openIdx >= 0) openByIdx(openIdx);
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
      const feedData = await fetchRSSFeed(url);
      const record   = await addFeed(user.id, { url, type: "rss", name: name || feedData.title });
      setFeeds((prev) => [...prev, record]);
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

  async function handleOPMLImport(feed) {
    // Reuse the existing handleAdd logic for each feed
    const feedData = await fetchRSSFeed(feed.url);
    const record   = await addFeed(user.id, { url: feed.url, type: "rss", name: feed.name || feedData.title });
    setFeeds((prev) => [...prev, record]);
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
    setFeeds((prev) => prev.filter((f) => f.id !== feedId));
    if (activeSource === feedId) setActiveSource("all");
  }

  async function handleMarkRead(url) {
    await markRead(user.id, url);
    setReadUrls((prev) => new Set([...prev, url]));
  }

  async function handleMarkUnread(url) {
    await markUnread(user.id, url);
    setReadUrls((prev) => { const n = new Set(prev); n.delete(url); return n; });
  }

  async function handleSaveItem(item) {
    await saveItem(user.id, { ...item });
    showToast("✓ Saved");
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

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

      {/* ── Source list (only on inbox/today mode) ── */}
      {filterMode !== "today" && filterMode !== "unread" && filterMode !== "smart" && !isMobile && !isTablet && (
        <div style={{ width: 234, flexShrink: 0, borderRight: `1px solid ${T.border}`, background: T.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "13px 12px 10px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center" }}>
            <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".08em" }}>Sources</span>
            <button onClick={() => setShowOPML(true)} title="Import OPML" style={{
              width: 22, height: 22, borderRadius: 6, background: T.surface2,
              border: `1px solid ${T.border}`, color: T.textSecondary, fontSize: 11,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontFamily: "inherit",
            }}>↑</button>
            <button onClick={() => setShowAdd(true)} style={{
              width: 22, height: 22, borderRadius: 6, background: T.accent,
              border: "none", color: "#fff", fontSize: 15, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }} title="Add (A)">+</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "6px 6px" }}>
            <SourceItem label="All Items" icon="📥" count={allItems.filter(i => !readUrls.has(i.url)).length}
              active={activeSource === "all"} onClick={() => setActiveSource("all")} />

            {/* ── Folders ── */}
            {folders.length > 0 && folders.map(folder => {
              const folderFeeds = feeds.filter(f => f.folder_id === folder.id);
              const folderUnread = folderFeeds.reduce((n, f) => n + allItems.filter(i => i.feedId === f.id && !readUrls.has(i.url)).length, 0);
              const dotColor = { gray:"#8A9099", teal:"#4BBFAF", blue:"#2F6FED", amber:"#AA8439", red:"#EF4444", purple:"#8B5CF6", green:"#22C55E" }[folder.color] || "#8A9099";
              const [open, setOpen] = useState(true);
              return (
                <div key={folder.id}>
                  <div style={{ display:"flex", alignItems:"center", padding:"7px 8px 3px", cursor:"pointer" }}
                    onClick={() => setOpen(v => !v)}>
                    <span style={{ fontSize:9, color:dotColor, marginRight:5, display:"inline-block", transform: open?"rotate(90deg)":"rotate(0deg)", transition:"transform .15s" }}>▶</span>
                    <span style={{ width:7, height:7, borderRadius:"50%", background:dotColor, flexShrink:0, marginRight:6 }} />
                    <span style={{ flex:1, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:T.textSecondary }}>{folder.name}</span>
                    <span style={{ fontSize:9, color:T.textTertiary, marginRight:4 }}>{folderUnread > 0 ? folderUnread : ""}</span>
                    <span onClick={e => { e.stopPropagation(); onEditFolder?.(folder); }} style={{ fontSize:12, color:T.textTertiary, cursor:"pointer", opacity:0, padding:"0 2px" }}
                      onMouseEnter={e => e.currentTarget.style.opacity="1"}
                      onMouseLeave={e => e.currentTarget.style.opacity="0"}
                    >···</span>
                  </div>
                  {open && folderFeeds.map(feed => {
                    const feedUnread = allItems.filter(i => i.feedId === feed.id && !readUrls.has(i.url)).length;
                    return (
                      <div key={feed.id} style={{ paddingLeft: 12 }}>
                        <SourceItem
                          label={feed.name || new URL(feed.url).hostname}
                          feedUrl={feed.url}
                          count={feedUnread}
                          active={activeSource === feed.id}
                          onClick={() => setActiveSource(feed.id)}
                          onDelete={() => handleDeleteFeed(feed.id)}
                          onRetry={() => handleRetryFeed(feed)}
                          isLoading={feedLoading[feed.id]}
                          error={feedErrors[feed.id]}
                        />
                      </div>
                    );
                  })}
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
                      count={feedUnread}
                      active={activeSource === feed.id}
                      onClick={() => setActiveSource(feed.id)}
                      onDelete={() => handleDeleteFeed(feed.id)}
                      onRetry={() => handleRetryFeed(feed)}
                      isLoading={feedLoading[feed.id]}
                      error={feedErrors[feed.id]}
                    />
                  );
                })
            }

            {/* ── New folder button ── */}
            <button onClick={() => onAddFolder?.()} style={{
              display: "flex", alignItems: "center", gap: 6,
              width: "100%", background: "none", border: "none", cursor: "pointer",
              padding: "8px 10px 4px", fontSize: 12, color: T.textTertiary,
              fontFamily: "inherit", textAlign: "left", marginTop: 4,
              borderTop: `1px solid ${T.border}`,
            }}
              onMouseEnter={e => e.currentTarget.style.color=T.accent}
              onMouseLeave={e => e.currentTarget.style.color=T.textTertiary}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> New folder
            </button>
          </div>
        </div>
      )}

      {/* ── Article list ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", background: T.bg }}>

        {/* Toolbar */}
        <div style={{ padding: "0 12px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: isMobile ? 6 : 8, flexShrink: 0, flexWrap: "nowrap", minWidth: 0, height: isMobile ? 48 : 52 }}>

          {/* Title + unread badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: "-.01em", whiteSpace: "nowrap" }}>
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
            <SearchBar onSelectResult={(item) => setSearchResult(item)} onClose={() => {}} />
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
        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: viewMode === "card" ? "14px" : "0" }}>
          {loadingItems && (
            <div style={{ padding: "8px 0" }}>
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
                  onClick={() => openByIdx(i)}
                  onSave={() => handleSaveItem(item)}
                  onReadLater={() => handleReadLater(item)}
                  onMarkRead={() => readUrls.has(item.url) ? handleMarkUnread(item.url) : handleMarkRead(item.url)}
                /></div>
              ))}
            </div>
          ) : (
            baseItems.map((item, i) => (
              <div key={item.url + i} style={{ animation: `fadeInUp .18s ease both`, animationDelay: `${Math.min(i * 20, 240)}ms` }}>
              <FeedItem item={item} viewMode="list" cardSize={cardSize}
                isSelected={openItem?.url === item.url}
                isRead={readUrls.has(item.url)}
                onClick={() => openByIdx(i)}
                onSave={() => handleSaveItem(item)}
                onReadLater={() => handleReadLater(item)}
                onMarkRead={() => readUrls.has(item.url) ? handleMarkUnread(item.url) : handleMarkRead(item.url)}
              /></div>
            ))
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: T.text, color: T.bg, borderRadius: 20,
          padding: "8px 18px", fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,.2)", zIndex: 1100,
          animation: "slideUp .2s ease", pointerEvents: "none",
        }}>{toast}</div>
      )}

      {showAdd  && <AddModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />}
      {openItem && <ContentViewer item={openItem} onClose={() => { setOpenItem(null); setOpenIdx(-1); }} />}
      {searchResult && <ContentViewer item={searchResult} onClose={() => setSearchResult(null)} />}
      {showOPML && <OPMLImport onImport={handleOPMLImport} onClose={() => setShowOPML(false)} />}
      {editingFolder && <FolderModal folder={editingFolder === "new" ? null : editingFolder} onSave={async (data) => { editingFolder === "new" ? await onAddFolder?.(data) : await onEditFolder?.(editingFolder, data); setEditingFolder(null); }} onDelete={async (id) => { /* handled in App */ setEditingFolder(null); }} onClose={() => setEditingFolder(null)} />}
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


function SourceItem({ label, icon, feedUrl, active, onClick, onDelete, onRetry, count, isLoading, error }) {
  const { T } = useTheme();
  const [hovered, setHovered] = useState(false);
  const [showError, setShowError] = useState(false);
  const favicon = feedUrl ? `https://www.google.com/s2/favicons?domain=${new URL(feedUrl).hostname}&sz=32` : null;

  return (
    <div>
      <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", gap: 7, padding: "6px 8px 6px 10px",
          borderRadius: 8, cursor: "pointer", marginBottom: 1,
          background: active ? T.accentSurface : hovered ? T.surface2 : "transparent",
          transition: "background .12s",
        }}
      >
        {/* Favicon / icon */}
        <div style={{ width: 16, height: 16, borderRadius: 4, overflow: "hidden", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {favicon
            ? <img src={favicon} alt="" width={12} height={12} style={{ display: "block" }} onError={e => { e.target.style.display = "none"; }} />
            : <span style={{ fontSize: 9 }}>{icon || "📡"}</span>
          }
        </div>

        <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 400, color: error ? T.warning : active ? T.accentText : T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>

        {/* Loading spinner */}
        {isLoading && (
          <span style={{ width: 10, height: 10, border: `1.5px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
        )}

        {/* Error — tap to expand */}
        {error && !isLoading && (
          <button onClick={e => { e.stopPropagation(); setShowError(v => !v); }}
            title="Tap to see error"
            style={{ background: `${T.danger}20`, border: "none", borderRadius: 4, color: T.danger, cursor: "pointer", fontSize: 10, fontWeight: 700, padding: "1px 5px", flexShrink: 0 }}>
            !</button>
        )}

        {/* Unread count */}
        {count > 0 && !error && !isLoading && (
          <span style={{ fontSize: 10, fontWeight: 700, color: active ? T.accentText : T.textTertiary, flexShrink: 0, minWidth: 14, textAlign: "right" }}>{count}</span>
        )}

        {/* Hover actions */}
        {hovered && !isLoading && (
          <span style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            {onDelete && (
              <button onClick={e => { e.stopPropagation(); onDelete(); }}
                title="Remove feed"
                style={{ background: "none", border: "none", color: T.textTertiary, cursor: "pointer", fontSize: 13, padding: "0 2px", lineHeight: 1 }}>×</button>
            )}
          </span>
        )}
      </div>

      {/* Error panel — expandable */}
      {error && showError && (
        <div style={{ margin: "0 6px 4px", background: `${T.danger}10`, border: `1px solid ${T.danger}30`, borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: T.danger, lineHeight: 1.5, marginBottom: 8 }}>
            {error.includes("Could not fetch") ? "This feed couldn't be reached. The site may block external requests, or the URL may have changed." : error}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {onRetry && (
              <button onClick={e => { e.stopPropagation(); setShowError(false); onRetry(); }}
                style={{ background: T.danger, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "inherit" }}>
                Retry
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); setShowError(false); }}
              style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, color: T.textSecondary, fontFamily: "inherit" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

