import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { getFeeds, addFeed, deleteFeed, addToHistory, saveItem,
         addReadLater, getReadUrls, markRead, markUnread } from "../lib/supabase";
import { fetchRSSFeed, fetchArticleContent, parseYouTubeUrl } from "../lib/fetchers";
import FeedItem from "../components/FeedItem";
import ContentViewer from "../components/ContentViewer";
import AddModal from "../components/AddModal";
import { Button, EmptyState, Spinner } from "../components/UI";

export default function InboxPage({ filterMode = "all" }) {
  const { T } = useTheme();
  const { user } = useAuth();

  const [feeds, setFeeds]               = useState([]);
  const [allItems, setAllItems]         = useState([]);
  const [activeSource, setActiveSource] = useState("all");
  const [loadingFeeds, setLoadingFeeds] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showAdd, setShowAdd]           = useState(false);
  const [openItem, setOpenItem]         = useState(null);
  const [openIdx, setOpenIdx]           = useState(-1);
  const [viewMode, setViewMode]         = useState(() => localStorage.getItem("fb-viewmode") || "list");
  const [readUrls, setReadUrls]         = useState(new Set());
  const [hideRead, setHideRead]         = useState(false);
  const [toast, setToast]               = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    getFeeds(user.id).then(setFeeds).catch(console.error).finally(() => setLoadingFeeds(false));
    getReadUrls(user.id).then(setReadUrls).catch(console.error);
  }, [user]);

  useEffect(() => {
    const rssFeeds = feeds.filter((f) => f.type === "rss");
    if (!rssFeeds.length) { setAllItems([]); return; }
    setLoadingItems(true);
    Promise.allSettled(
      rssFeeds.map((feed) =>
        fetchRSSFeed(feed.url).then((data) =>
          data.items.map((item) => ({ ...item, feedId: feed.id, source: feed.name || data.title, type: "rss" }))
        )
      )
    ).then((results) => {
      const items = results
        .filter((r) => r.status === "fulfilled").flatMap((r) => r.value)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setAllItems(items);
    }).finally(() => setLoadingItems(false));
  }, [feeds]);

  // ── Filtered + sorted item list ───────────────────────────────
  const baseItems = (() => {
    let items = activeSource === "all" ? allItems : allItems.filter((i) => i.feedId === activeSource);
    if (filterMode === "today") {
      const yesterday = Date.now() - 86400000;
      items = items.filter((i) => i.date && new Date(i.date) > yesterday);
    }
    if (hideRead) items = items.filter((i) => !readUrls.has(i.url));
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

  const activeFeedName = filterMode === "today" ? "Today"
    : activeSource === "all" ? "All Items"
    : feeds.find((f) => f.id === activeSource)?.name || "Feed";

  const unreadCount = baseItems.filter((i) => !readUrls.has(i.url)).length;

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

      {/* ── Source list (only on inbox/today mode) ── */}
      {filterMode !== "today" && (
        <div style={{ width: 234, flexShrink: 0, borderRight: `1px solid ${T.border}`, background: T.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "13px 12px 10px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center" }}>
            <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: T.textTertiary, textTransform: "uppercase", letterSpacing: ".08em" }}>Sources</span>
            <button onClick={() => setShowAdd(true)} style={{
              width: 22, height: 22, borderRadius: 6, background: T.accent,
              border: "none", color: "#fff", fontSize: 15, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }} title="Add (A)">+</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "6px 6px" }}>
            <SourceItem label="All Items" icon="📥" count={allItems.filter(i => !readUrls.has(i.url)).length}
              active={activeSource === "all"} onClick={() => setActiveSource("all")} />

            {feeds.length > 0 && (
              <div style={{ padding: "12px 8px 4px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: T.textTertiary }}>Feeds</div>
            )}

            {loadingFeeds
              ? <div style={{ padding: "14px 8px" }}><Spinner size={14} /></div>
              : feeds.map((feed) => {
                  const feedUnread = allItems.filter(i => i.feedId === feed.id && !readUrls.has(i.url)).length;
                  return (
                    <SourceItem key={feed.id}
                      label={feed.name || new URL(feed.url).hostname}
                      feedUrl={feed.url}
                      count={feedUnread}
                      active={activeSource === feed.id}
                      onClick={() => setActiveSource(feed.id)}
                      onDelete={() => handleDeleteFeed(feed.id)}
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
        <div style={{ padding: "11px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text, letterSpacing: "-.01em", display: "flex", alignItems: "center", gap: 8 }}>
              {activeFeedName}
              {unreadCount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, background: T.accent, color: "#fff", padding: "1px 7px", borderRadius: 10 }}>
                  {unreadCount} unread
                </span>
              )}
            </div>
            {!loadingItems && <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>{baseItems.length} articles</div>}
          </div>

          {/* Hide read toggle */}
          <button onClick={() => setHideRead(v => !v)} title="Hide read articles" style={{
            background: hideRead ? T.accentSurface : T.surface2,
            border: `1px solid ${hideRead ? T.accent : T.border}`,
            borderRadius: 7, padding: "5px 10px", cursor: "pointer",
            fontSize: 11, fontWeight: 600,
            color: hideRead ? T.accentText : T.textSecondary,
            fontFamily: "inherit",
          }}>
            {hideRead ? "Showing unread" : "All articles"}
          </button>

          {/* View toggle */}
          <div style={{ display: "flex", gap: 2, background: T.surface2, borderRadius: 8, padding: 3 }}>
            {[{ mode: "list", icon: "≡" }, { mode: "card", icon: "⊞" }].map(({ mode, icon }) => (
              <button key={mode} onClick={() => toggleViewMode(mode)} style={{
                width: 28, height: 26, borderRadius: 6, border: "none",
                background: viewMode === mode ? T.card : "transparent",
                color: viewMode === mode ? T.text : T.textTertiary,
                cursor: "pointer", fontSize: 15, fontWeight: 700,
                boxShadow: viewMode === mode ? "0 1px 3px rgba(0,0,0,.1)" : "none",
                transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "center",
              }}>{icon}</button>
            ))}
          </div>

          <Button size="sm" onClick={() => setShowAdd(true)}>+ Add</Button>
        </div>

        {/* Article list / grid */}
        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: viewMode === "card" ? "14px" : "0" }}>
          {loadingItems && <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={28} /></div>}

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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {baseItems.map((item, i) => (
                <FeedItem key={item.url + i} item={item} viewMode="card"
                  isSelected={openItem?.url === item.url}
                  isRead={readUrls.has(item.url)}
                  onClick={() => openByIdx(i)}
                  onSave={() => handleSaveItem(item)}
                  onReadLater={() => handleReadLater(item)}
                  onMarkRead={() => readUrls.has(item.url) ? handleMarkUnread(item.url) : handleMarkRead(item.url)}
                />
              ))}
            </div>
          ) : (
            baseItems.map((item, i) => (
              <FeedItem key={item.url + i} item={item} viewMode="list"
                isSelected={openItem?.url === item.url}
                isRead={readUrls.has(item.url)}
                onClick={() => openByIdx(i)}
                onSave={() => handleSaveItem(item)}
                onReadLater={() => handleReadLater(item)}
                onMarkRead={() => readUrls.has(item.url) ? handleMarkUnread(item.url) : handleMarkRead(item.url)}
              />
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
    </div>
  );
}

// ── Source sidebar item ───────────────────────────────────────
function SourceItem({ label, icon, feedUrl, active, onClick, onDelete, count }) {
  const { T } = useTheme();
  const [hovered, setHovered] = useState(false);
  const favicon = feedUrl ? `https://www.google.com/s2/favicons?domain=${new URL(feedUrl).hostname}&sz=32` : null;

  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
        borderRadius: 8, cursor: "pointer", marginBottom: 1,
        background: active ? T.accentSurface : hovered ? T.surface2 : "transparent",
        transition: "background .1s",
      }}
    >
      <div style={{ width: 17, height: 17, borderRadius: 4, overflow: "hidden", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {favicon
          ? <img src={favicon} alt="" width={13} height={13} style={{ display: "block" }} onError={e => { e.target.style.display = "none"; }} />
          : <span style={{ fontSize: 9 }}>{icon || "📡"}</span>
        }
      </div>
      <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 400, color: active ? T.accentText : T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      {count > 0 && (
        <span style={{ fontSize: 10, fontWeight: 700, color: active ? T.accentText : T.textTertiary, flexShrink: 0 }}>{count}</span>
      )}
      {onDelete && hovered && (
        <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{
          background: "none", border: "none", color: T.textTertiary, cursor: "pointer", fontSize: 13, padding: "0 1px",
        }}>×</button>
      )}
    </div>
  );
}

