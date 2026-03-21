import { useState, useEffect, lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider, useTheme } from "./hooks/useTheme";
import { Spinner, ErrorBoundary } from "./components/UI";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import LoginPage from "./pages/LoginPage";
import PWAInstallBanner from "./components/PWAInstallBanner";
import { useBreakpoint } from "./hooks/useBreakpoint.js";
import { getSmartFeeds, addSmartFeed, updateSmartFeed, deleteSmartFeed,
         getFolders, addFolder, updateFolder, deleteFolder, setFeedFolder,
         getFeeds } from "./lib/supabase";
import { checkLimit } from "./lib/plan";
import { identify, track } from "./lib/analytics";

// ── Lazy page chunks — each becomes a separate JS file ────────
const InboxPage      = lazy(() => import("./pages/InboxPage"));
const HomePage       = lazy(() => import("./pages/HomePage"));
const NotesPage      = lazy(() => import("./components/NotesPage"));
const AnalyticsPage  = lazy(() => import("./pages/AnalyticsPage"));

// Named exports from SecondaryPages all share one chunk
const lazySecondary = () => import("./pages/SecondaryPages");
const HistoryPage    = lazy(() => lazySecondary().then(m => ({ default: m.HistoryPage })));
const ReadLaterPage  = lazy(() => lazySecondary().then(m => ({ default: m.ReadLaterPage })));
const SettingsPage   = lazy(() => lazySecondary().then(m => ({ default: m.SettingsPage })));
const StatsPage      = lazy(() => lazySecondary().then(m => ({ default: m.StatsPage })));
const ManageFeedsPage = lazy(() => lazySecondary().then(m => ({ default: m.ManageFeedsPage })));

// ── Lazy modals/overlays — only load when first opened ────────
const SmartFeedModal = lazy(() => import("./components/SmartFeedModal"));
const FolderModal    = lazy(() => import("./components/FolderModal"));
const PodcastPlayer  = lazy(() => import("./components/PodcastPlayer"));
const Onboarding     = lazy(() => import("./components/Onboarding"));

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
  const [page, setPage]             = useState("home");
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

  useEffect(() => { identify(user); }, [user]);

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
    setFeeds(prev => prev.map(f => f.id === feedId ? { ...f, folder_id: folderId } : f));
    try {
      await setFeedFolder(feedId, folderId);
    } catch (err) {
      console.error("setFeedFolder failed:", err);
      setFeeds(prev => prev.map(f => f.id === feedId ? { ...f, folder_id: undefined } : f));
    }
  }

  function handleFeedAdded(record) { setFeeds(prev => [...prev, record]); }
  function handleFeedDeleted(feedId) { setFeeds(prev => prev.filter(f => f.id !== feedId)); }

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

  if (user === null) return <LoginPage />;

  // ── Page routing ───────────────────────────────────────────
  function renderPage() {
    if (page.startsWith("smart:")) {
      const sfId  = page.replace("smart:", "");
      const sfDef = smartFeeds.find(sf => sf.id === sfId);
      if (!sfDef) {
        return <InboxPage filterMode="all" onUnreadCount={setUnreadCount} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} user={user} />;
      }
      return <InboxPage filterMode="smart" smartFeedDef={sfDef} onUnreadCount={setUnreadCount} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} user={user} />;
    }
    switch (page) {
      case "home":         return <HomePage feeds={feeds} onNavigate={navigateTo} onPlayPodcast={setPodcastItem} />;
      case "inbox":        return <InboxPage filterMode="all" onUnreadCount={setUnreadCount} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} forceShowAdd={globalAdd} onForcedAddClose={() => setGlobalAdd(false)} />;
      case "today":        return <InboxPage filterMode="today" onUnreadCount={setUnreadCount} folders={folders} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} />;
      case "readlater":    return <ReadLaterPage />;
      case "history":      return <HistoryPage />;
      case "stats":        return <StatsPage />;
      case "notes":        return <NotesPage />;
      case "analytics":    return <AnalyticsPage />;
      case "settings":     return <SettingsPage feeds={feeds} folders={folders} onFeedUpdate={(id, data) => setFeeds(prev => prev.map(f => f.id === id ? {...f, ...data} : f))} onNavigate={navigateTo} />;
      case "manage-feeds": return <ManageFeedsPage feeds={feeds} folders={folders} onFeedUpdate={(id, data) => setFeeds(prev => prev.map(f => f.id === id ? {...f, ...data} : f))} onNavigate={navigateTo} />;
      default:             return <HomePage feeds={feeds} onNavigate={navigateTo} onPlayPodcast={setPodcastItem} />;
    }
  }

  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "row",
      background: T.bg, color: T.text,
      fontFamily: "'Inter', system-ui, sans-serif",
      WebkitFontSmoothing: "antialiased", overflow: "hidden",
    }}>
      <Sidebar
        active={page}
        onNavigate={navigateTo}
        unreadCount={unreadCount}
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
      />
      <div style={{ flex: 1, display: "flex", minWidth: 0, overflow: "hidden", flexDirection: "column" }}>
        <div style={{ flex: 1, overflow: "hidden", paddingBottom: isMobile ? 62 : 0, display: "flex", flexDirection: "column" }}>
          <ErrorBoundary>
            <Suspense fallback={<PageSpinner T={T} />}>
              {renderPage()}
            </Suspense>
          </ErrorBoundary>
        </div>
        {isMobile && <BottomNav active={page} onNavigate={navigateTo} onAdd={handleGlobalAdd} unreadCount={unreadCount} />}
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

      <PWAInstallBanner />

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
