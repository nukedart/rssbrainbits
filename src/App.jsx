import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider, useTheme } from "./hooks/useTheme";
import { Spinner, ErrorBoundary } from "./components/UI";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import { useBreakpoint } from "./hooks/useBreakpoint.js";
import { getSmartFeeds, addSmartFeed, updateSmartFeed, deleteSmartFeed,
         getFolders, addFolder, updateFolder, deleteFolder, setFeedFolder,
         getFeeds, deleteFeed, markAllRead } from "./lib/supabase";
import { getCachedFeed } from "./lib/feedCache.js";
import { checkLimit } from "./lib/plan";
import { identify, track } from "./lib/analytics";

// ── Lazy page chunks — each becomes a separate JS file ────────
const LoginPage      = lazy(() => import("./pages/LoginPage"));
const InboxPage      = lazy(() => import("./pages/InboxPage"));
const TodayPage      = lazy(() => import("./pages/TodayPage"));
const AnalyticsPage  = lazy(() => import("./pages/AnalyticsPage"));
const ReviewPage     = lazy(() => import("./pages/ReviewPage"));
const CardsPage      = lazy(() => import("./pages/CardsPage"));

// Named exports from SecondaryPages all share one chunk
const lazySecondary = () => import("./pages/SecondaryPages");
const HistoryPage    = lazy(() => lazySecondary().then(m => ({ default: m.HistoryPage })));
const ReadLaterPage  = lazy(() => lazySecondary().then(m => ({ default: m.ReadLaterPage })));
const SettingsPage   = lazy(() => lazySecondary().then(m => ({ default: m.SettingsPage })));
const StatsPage      = lazy(() => lazySecondary().then(m => ({ default: m.StatsPage })));
const ManageFeedsPage = lazy(() => lazySecondary().then(m => ({ default: m.ManageFeedsPage })));

// ── Lazy modals/overlays — only load when first opened ────────
const PWAInstallBanner = lazy(() => import("./components/PWAInstallBanner"));
const SmartFeedModal = lazy(() => import("./components/SmartFeedModal"));
const FolderModal    = lazy(() => import("./components/FolderModal"));
const PodcastPlayer      = lazy(() => import("./components/PodcastPlayer"));
const Onboarding         = lazy(() => import("./components/Onboarding"));
const MobileFeedDrawer   = lazy(() => import("./components/MobileFeedDrawer"));

// Fallback shown while a page chunk is downloading
function PageSpinner({ T }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: T?.bg }}>
      <Spinner size={24} />
    </div>
  );
}

function AppShell() {
  const { user } = useAuth();
  const { T }    = useTheme();
  const { isMobile } = useBreakpoint();

  // ── ALL state at the top — no hooks after conditional returns ──
  const [page, setPage]             = useState(() => {
    // admin/index.html sets this global to open the admin panel directly
    if (window.__FB_INITIAL_PAGE__) return window.__FB_INITIAL_PAGE__;
    return "inbox";
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [smartFeeds, setSmartFeeds]   = useState([]);
  const [editingSF, setEditingSF]     = useState(null);
  const [folders, setFolders]         = useState([]);
  const [editingFolder, setEditingFolder] = useState(null);
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [podcastItem, setPodcastItem]       = useState(null);
  const [feeds, setFeeds]             = useState([]);
  const [feedsLoaded, setFeedsLoaded] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => !!localStorage.getItem("fb-onboarded"));
  const [globalAdd, setGlobalAdd] = useState(false);
  const [forceOpenSearch, setForceOpenSearch] = useState(false);
  const [feedErrorCount, setFeedErrorCount] = useState(0);
  const [feedUnreadCounts, setFeedUnreadCounts] = useState({});
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [edgeDx, setEdgeDx] = useState(0);
  const edgeTouchRef = useRef(null);
  const [inboxState, setInboxState] = useState({ readFilter: "unread", unreadCount: 0 });

  useEffect(() => { identify(user); }, [user]);

  useEffect(() => {
    function onInboxState(e) { setInboxState(e.detail); }
    window.addEventListener("fb-inbox-state", onInboxState);
    return () => window.removeEventListener("fb-inbox-state", onInboxState);
  }, []);

  useEffect(() => {
    function onOpenFeeds() { setMobileDrawerOpen(true); }
    window.addEventListener("fb-open-feeds", onOpenFeeds);
    return () => window.removeEventListener("fb-open-feeds", onOpenFeeds);
  }, []);

  useEffect(() => {
    if (!user) return;
    getSmartFeeds(user.id)
      .then(setSmartFeeds)
      .catch(err => { console.error("getSmartFeeds:", err); setSmartFeeds([]); });
    getFolders(user.id)
      .then(setFolders)
      .catch(err => { console.error("getFolders:", err); setFolders([]); });
    getFeeds(user.id)
      .then(data => { setFeeds(data); setFeedsLoaded(true); if (data.length === 0 && !localStorage.getItem("fb-onboarded")) setOnboardingDone(false); })
      .catch(err => { console.error("getFeeds:", err); setFeeds([]); setFeedsLoaded(true); });
  }, [user]);

  // Global `/` key — navigate to inbox and open search from any page
  useEffect(() => {
    function onKey(e) {
      if (e.key === "/" && !["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) {
        e.preventDefault();
        if (page !== "inbox") setPage("inbox");
        setForceOpenSearch(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [page]);

  function navigateTo(p) {
    track("page_navigated", { page: p });
    setPage(p);
  }

  function handleGlobalAdd() {
    if (page !== "inbox") setPage("inbox");
    setGlobalAdd(true);
  }

  async function handleSaveSmartFeed({ name, keywords, color }) {
    if (editingSF && editingSF !== "new") {
      const updated = await updateSmartFeed(editingSF.id, { name, keywords, color });
      setSmartFeeds(prev => prev.map(sf => sf.id === updated.id ? updated : sf));
    } else {
      const { allowed, reason } = checkLimit(user, "smartFeeds", smartFeeds.length);
      if (!allowed) { track("plan_limit_hit", { resource: "smartFeeds", count: smartFeeds.length }); alert(reason); return; }
      const created = await addSmartFeed(user.id, { name, keywords, color });
      setSmartFeeds(prev => [...prev, created]);
      track("smart_feed_created", { keywords_count: keywords.length });
    }
    setEditingSF(null);
  }

  async function handleDeleteSmartFeed(id) {
    await deleteSmartFeed(id);
    setSmartFeeds(prev => prev.filter(sf => sf.id !== id));
    if (page === `smart:${id}`) setPage("inbox");
    setEditingSF(null);
  }

  async function handleMoveFeedToFolder(feedId, folderId) {
    // Capture original for rollback
    const original = feeds.find(f => f.id === feedId);
    setFeeds(prev => prev.map(f => f.id === feedId ? { ...f, folder_id: folderId } : f));
    try {
      await setFeedFolder(feedId, folderId);
    } catch (err) {
      console.error("setFeedFolder failed:", err);
      // Restore original folder_id (not undefined)
      setFeeds(prev => prev.map(f => f.id === feedId ? { ...f, folder_id: original?.folder_id ?? null } : f));
    }
  }

  function handleFeedAdded(record) { setFeeds(prev => [...prev, record]); }
  function handleFeedDeleted(feedId) { setFeeds(prev => prev.filter(f => f.id !== feedId)); }

  async function handleMarkFeedAllRead(feed) {
    if (!user) return;
    const cached = getCachedFeed(feed.url);
    const urls = (cached?.data?.items || []).map(i => i.url).filter(Boolean);
    if (!urls.length) return;
    await markAllRead(user.id, urls);
    window.dispatchEvent(new CustomEvent("fb-mark-feed-read", { detail: { urls } }));
  }

  async function handleOnboardingAdd({ url, type, name }) {
    const { addFeed } = await import("./lib/supabase");
    const { fetchRSSFeed } = await import("./lib/fetchers");
    const feedData = await fetchRSSFeed(url).catch(() => ({ title: name }));
    const record = await addFeed(user.id, { url, type, name: name || feedData.title });
    setFeeds(prev => [...prev, record]);
  }

  async function handleSaveFolder({ name, color }) {
    if (editingFolder && editingFolder !== "new") {
      const updated = await updateFolder(editingFolder.id, { name, color });
      setFolders(prev => prev.map(f => f.id === updated.id ? updated : f));
    } else {
      const { allowed, reason } = checkLimit(user, "folders", folders.length);
      if (!allowed) { track("plan_limit_hit", { resource: "folders", count: folders.length }); alert(reason); return; }
      const created = await addFolder(user.id, { name, color });
      setFolders(prev => [...prev, created]);
      track("folder_created");
    }
    setEditingFolder(null);
  }

  async function handleDeleteFolder(id) {
    await deleteFolder(id);
    setFolders(prev => prev.filter(f => f.id !== id));
    setEditingFolder(null);
  }

  // ── Early returns AFTER all hooks ─────────────────────────
  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (user === null) return <Suspense fallback={<PageSpinner T={T} />}><LoginPage /></Suspense>;

  // ── Page routing ───────────────────────────────────────────
  function renderPage() {
    if (page.startsWith("smart:")) {
      const sfId  = page.replace("smart:", "");
      const sfDef = smartFeeds.find(sf => sf.id === sfId);
      if (!sfDef) {
        return <InboxPage filterMode="all" onUnreadCount={setUnreadCount} onFeedErrors={setFeedErrorCount} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} user={user} onNavigate={navigateTo} />;
      }
      return <InboxPage filterMode="smart" smartFeedDef={sfDef} onUnreadCount={setUnreadCount} onFeedErrors={setFeedErrorCount} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} user={user} onNavigate={navigateTo} />;
    }
    if (page.startsWith("feed:")) {
      const feedId = page.replace("feed:", "");
      const feedDef = feeds.find(f => f.id === feedId);
      if (!feedDef) return <InboxPage filterMode="all" onUnreadCount={setUnreadCount} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} user={user} onNavigate={navigateTo} />;
      return <InboxPage filterMode="feed" feedDef={feedDef} onUnreadCount={setUnreadCount} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} user={user} onNavigate={navigateTo} />;
    }
    if (page.startsWith("folder:")) {
      const folderId = page.replace("folder:", "");
      const folderDef = folders.find(f => f.id === folderId);
      if (!folderDef) return <InboxPage filterMode="all" onUnreadCount={setUnreadCount} onFeedErrors={setFeedErrorCount} onFeedUnreadCounts={setFeedUnreadCounts} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} user={user} onNavigate={navigateTo} />;
      return <InboxPage filterMode="folder" folderDef={folderDef} onUnreadCount={setUnreadCount} onFeedErrors={setFeedErrorCount} onFeedUnreadCounts={setFeedUnreadCounts} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} user={user} onNavigate={navigateTo} />;
    }
    if (page === "youtube-all") {
      const ytFeeds = feeds.filter(f => f.type === "youtube" || (f.url && f.url.includes("youtube.com/feeds/videos.xml")));
      // Show all YouTube feed items by using a synthetic smart-feed-style filter
      return <InboxPage filterMode="youtube-all" ytFeedIds={ytFeeds.map(f => f.id)} onUnreadCount={setUnreadCount} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} user={user} onNavigate={navigateTo} />;
    }
    switch (page) {
      case "inbox":        return <InboxPage filterMode="all" onUnreadCount={setUnreadCount} onFeedErrors={setFeedErrorCount} onFeedUnreadCounts={setFeedUnreadCounts} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} forceShowAdd={globalAdd} onForcedAddClose={() => setGlobalAdd(false)} forceOpenSearch={forceOpenSearch} onForcedSearchClose={() => setForceOpenSearch(false)} onNavigate={navigateTo} />;
      case "today":        return <TodayPage feeds={feeds} onPlayPodcast={setPodcastItem} onNavigate={navigateTo} />;
      case "readlater":    return <ReadLaterPage />;
      case "history":      return <HistoryPage />;
      case "stats":        return <StatsPage />;
      case "notes":        return <CardsPage />; // redirect legacy notes links to Cards
      case "review":       return <ReviewPage />;
      case "cards":        return <CardsPage />;
      case "analytics":    return <AnalyticsPage />;
      case "settings":     return <SettingsPage feeds={feeds} folders={folders} onFeedUpdate={(id, data) => setFeeds(prev => prev.map(f => f.id === id ? {...f, ...data} : f))} onFeedAdded={handleFeedAdded} onNavigate={navigateTo} />;
      case "manage-feeds": return <ManageFeedsPage feeds={feeds} folders={folders} onFeedUpdate={(id, data) => setFeeds(prev => prev.map(f => f.id === id ? {...f, ...data} : f))} onFeedDeleted={handleFeedDeleted} onNavigate={navigateTo} onAddFolder={() => setEditingFolder("new")} onFolderUpdate={(id, data) => setFolders(prev => prev.map(f => f.id === id ? {...f, ...data} : f))} onFolderDeleted={(id) => setFolders(prev => prev.filter(f => f.id !== id))} onAddSource={handleGlobalAdd} />;
      default:             return <InboxPage filterMode="all" onUnreadCount={setUnreadCount} onFeedErrors={setFeedErrorCount} onFeedUnreadCounts={setFeedUnreadCounts} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} onNavigate={navigateTo} />;
    }
  }

  // ── Left-edge swipe to open nav drawer (mobile) ─────────────
  function onEdgeTouchStart(e) {
    if (!isMobile || mobileDrawerOpen) return;
    const x = e.touches[0].clientX;
    if (x < 28) edgeTouchRef.current = { x, y: e.touches[0].clientY, active: false };
  }
  function onEdgeTouchMove(e) {
    const t = edgeTouchRef.current;
    if (!t) return;
    const dx = e.touches[0].clientX - t.x;
    const dy = e.touches[0].clientY - t.y;
    if (!t.active) {
      if (Math.abs(dy) > Math.abs(dx) + 8) { edgeTouchRef.current = null; return; }
      if (dx > 6) t.active = true; else return;
    }
    setEdgeDx(Math.min(dx, 100));
  }
  function onEdgeTouchEnd() {
    if (edgeTouchRef.current && edgeDx > 55) setMobileDrawerOpen(true);
    edgeTouchRef.current = null;
    setEdgeDx(0);
  }

  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "row",
      background: T.bg, color: T.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif",
      WebkitFontSmoothing: "antialiased", overflow: "hidden",
    }}>
      <Sidebar
        active={page}
        onNavigate={navigateTo}
        unreadCount={unreadCount}
        feedErrorCount={feedErrorCount}
        feedUnreadCounts={feedUnreadCounts}
        smartFeeds={smartFeeds}
        onAddSmartFeed={() => setEditingSF("new")}
        onEditSmartFeed={(sf) => setEditingSF(sf)}
        folders={folders}
        feeds={feeds}
        onAddFolder={() => setEditingFolder("new")}
        onEditFolder={(f) => setEditingFolder(f)}
        onMoveFeedToFolder={handleMoveFeedToFolder}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(v => !v)}
        onAddSource={handleGlobalAdd}
        onUnsubscribeFeed={async (feedId) => { await deleteFeed(feedId); handleFeedDeleted(feedId); }}
        onMarkFeedAllRead={handleMarkFeedAllRead}
      />
      <div
        onTouchStart={onEdgeTouchStart}
        onTouchMove={onEdgeTouchMove}
        onTouchEnd={onEdgeTouchEnd}
        onTouchCancel={() => { edgeTouchRef.current = null; setEdgeDx(0); }}
        style={{
          flex: 1, display: "flex", minWidth: 0, overflow: "hidden", flexDirection: "column",
          transform: edgeDx > 0 ? `translateX(${edgeDx * 0.25}px)` : "none",
          transition: edgeTouchRef.current ? "none" : "transform .22s ease",
        }}>
        <div key={page} style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", animation: "fadeInScale .18s ease" }}>
          <ErrorBoundary>
            <Suspense fallback={<PageSpinner T={T} />}>
              {renderPage()}
            </Suspense>
          </ErrorBoundary>
        </div>
        {isMobile && <BottomNav active={page} onNavigate={navigateTo} onAdd={handleGlobalAdd} unreadCount={unreadCount} onOpenFeeds={() => setMobileDrawerOpen(true)} inboxFilter={inboxState.readFilter} inboxUnreadCount={inboxState.unreadCount} />}
        {!isMobile && (
          <button onClick={handleGlobalAdd} title="Add source" aria-label="Add source" style={{
            position:"fixed", right:20, bottom:20, width:44, height:44, borderRadius:"50%",
            background:T.accent, color:T.accentText, border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:`0 4px 16px ${T.accent}55`, fontSize:22, fontFamily:"inherit",
            transition:"transform .15s, box-shadow .15s", zIndex:100,
          }}
            onMouseEnter={e => { e.currentTarget.style.transform="scale(1.08)"; e.currentTarget.style.boxShadow=`0 6px 20px ${T.accent}77`; }}
            onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow=`0 4px 16px ${T.accent}55`; }}
          >+</button>
        )}
      </div>

      {editingSF && (
        <Suspense fallback={null}>
          <SmartFeedModal
            feed={editingSF === "new" ? null : editingSF}
            feeds={feeds}
            onSave={handleSaveSmartFeed}
            onDelete={handleDeleteSmartFeed}
            onClose={() => setEditingSF(null)}
          />
        </Suspense>
      )}

      {podcastItem && (
        <Suspense fallback={null}>
          <PodcastPlayer item={podcastItem} onClose={() => setPodcastItem(null)} />
        </Suspense>
      )}

      {!onboardingDone && feeds.length === 0 && feedsLoaded && (
        <Suspense fallback={null}>
          <Onboarding
            onAdd={handleOnboardingAdd}
            onDismiss={() => { setOnboardingDone(true); localStorage.setItem("fb-onboarded", "1"); }}
          />
        </Suspense>
      )}

      {mobileDrawerOpen && (
        <Suspense fallback={null}>
          <MobileFeedDrawer
            active={page}
            onNavigate={navigateTo}
            onClose={() => setMobileDrawerOpen(false)}
            unreadCount={unreadCount}
            feedUnreadCounts={feedUnreadCounts}
            smartFeeds={smartFeeds}
            onAddSmartFeed={() => { setEditingSF("new"); setMobileDrawerOpen(false); }}
            onEditSmartFeed={(sf) => { setEditingSF(sf); setMobileDrawerOpen(false); }}
            folders={folders}
            feeds={feeds}
            onAddFolder={() => { setEditingFolder("new"); setMobileDrawerOpen(false); }}
            onMoveFeedToFolder={handleMoveFeedToFolder}
            onAddSource={() => { handleGlobalAdd(); }}
          />
        </Suspense>
      )}

      <Suspense fallback={null}><PWAInstallBanner /></Suspense>

      {editingFolder && (
        <Suspense fallback={null}>
          <FolderModal
            folder={editingFolder === "new" ? null : editingFolder}
            onSave={handleSaveFolder}
            onDelete={handleDeleteFolder}
            onClose={() => setEditingFolder(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}
