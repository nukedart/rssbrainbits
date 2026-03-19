import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider, useTheme } from "./hooks/useTheme";
import LoginPage from "./pages/LoginPage";
import InboxPage from "./pages/InboxPage";
import { HistoryPage, ReadLaterPage, SettingsPage, StatsPage } from "./pages/SecondaryPages";
import NotesPage from "./components/NotesPage";
import SmartFeedModal from "./components/SmartFeedModal";
import Sidebar from "./components/Sidebar";
import { Spinner, ErrorBoundary } from "./components/UI";
import BottomNav from "./components/BottomNav";
import { useBreakpoint } from "./hooks/useBreakpoint.js";
import { getSmartFeeds, addSmartFeed, updateSmartFeed, deleteSmartFeed,
         getFolders, addFolder, updateFolder, deleteFolder, setFeedFolder,
         getFeeds } from "./lib/supabase";
import FolderModal from "./components/FolderModal";
import { checkLimit } from "./lib/plan";
import Onboarding from "./components/Onboarding";
import PWAInstallBanner from "./components/PWAInstallBanner";
import PodcastPlayer from "./components/PodcastPlayer";
import AnalyticsPage from "./pages/AnalyticsPage";
import { identify, track } from "./lib/analytics";

function AppShell() {
  const { user } = useAuth();
  const { T }    = useTheme();
  const { isMobile } = useBreakpoint();

  // ── ALL state at the top — no hooks after conditional returns ──
  const [page, setPage]             = useState("inbox");
  const [unreadCount, setUnreadCount] = useState(0);
  const [smartFeeds, setSmartFeeds]   = useState([]);
  const [editingSF, setEditingSF]     = useState(null);
  const [folders, setFolders]         = useState([]);
  const [editingFolder, setEditingFolder] = useState(null);
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [podcastItem, setPodcastItem]       = useState(null); // currently playing podcast
  const [feeds, setFeeds]             = useState([]); // for SmartFeedModal feed picker
  const [feedsLoaded, setFeedsLoaded] = useState(false); // don't show onboarding until feeds are confirmed empty
  const [onboardingDone, setOnboardingDone] = useState(() => !!localStorage.getItem("fb-onboarded"));

  // Identify user for analytics once resolved
  useEffect(() => { identify(user); }, [user]);

  // Load smart feeds once user is known
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

  // ── Navigation with tracking ──────────────────────────────
  function navigateTo(p) {
    track("page_navigated", { page: p });
    setPage(p);
  }

  // ── Smart feed handlers ────────────────────────────────────
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

  // ── Folder handlers ───────────────────────────────────────
  async function handleMoveFeedToFolder(feedId, folderId) {
    setFeeds(prev => prev.map(f => f.id === feedId ? { ...f, folder_id: folderId } : f));
    try {
      await setFeedFolder(feedId, folderId);
    } catch (err) {
      console.error("setFeedFolder failed:", err);
      setFeeds(prev => prev.map(f => f.id === feedId ? { ...f, folder_id: undefined } : f));
    }
  }

  function handleFeedAdded(record) {
    setFeeds(prev => [...prev, record]);
  }

  async function handleOnboardingAdd({ url, type, name }) {
    const { addFeed } = await import("./lib/supabase");
    const { fetchRSSFeed } = await import("./lib/fetchers");
    const feedData = await fetchRSSFeed(url).catch(() => ({ title: name }));
    const record = await addFeed(user.id, { url, type, name: name || feedData.title });
    setFeeds(prev => [...prev, record]);
  }

  function handleFeedDeleted(feedId) {
    setFeeds(prev => prev.filter(f => f.id !== feedId));
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
      // Guard: if smartFeeds hasn't loaded yet, sfDef may be undefined —
      // fall back to inbox while it loads rather than passing undefined
      if (!sfDef) {
        return <InboxPage filterMode="all" onUnreadCount={setUnreadCount} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} user={user} />;
      }
      return <InboxPage filterMode="smart" smartFeedDef={sfDef} onUnreadCount={setUnreadCount} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} user={user} />;
    }
    switch (page) {
      case "inbox":     return <InboxPage filterMode="all"    onUnreadCount={setUnreadCount} folders={folders} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} />;
      case "unread":    return <InboxPage filterMode="unread" onUnreadCount={setUnreadCount} folders={folders} feeds={feeds} onFeedAdded={handleFeedAdded} onFeedDeleted={handleFeedDeleted} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} user={user} />;
      case "today":     return <InboxPage filterMode="today"  onUnreadCount={setUnreadCount} folders={folders} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} />;
      case "readlater": return <ReadLaterPage />;
      case "history":   return <HistoryPage />;
      case "stats":     return <StatsPage />;
      case "notes":     return <NotesPage />;
      case "analytics": return <AnalyticsPage />;
      case "settings":  return <SettingsPage feeds={feeds} folders={folders} onFeedUpdate={(id, data) => setFeeds(prev => prev.map(f => f.id === id ? {...f, ...data} : f))} />;
      default:          return <InboxPage filterMode="all"    onUnreadCount={setUnreadCount} folders={folders} onAddFolder={() => setEditingFolder("new")} onEditFolder={(f) => setEditingFolder(f)} onMoveFeedToFolder={handleMoveFeedToFolder} onPlayPodcast={setPodcastItem} />;
    }
  }

  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "row",
      background: T.bg, color: T.text,
      fontFamily: "'DM Sans', system-ui, sans-serif",
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
            {renderPage()}
          </ErrorBoundary>
        </div>
        {isMobile && <BottomNav active={page} onNavigate={navigateTo} unreadCount={unreadCount} />}
      </div>
      {editingSF && (
        <SmartFeedModal
          feed={editingSF === "new" ? null : editingSF}
          feeds={feeds}
          onSave={handleSaveSmartFeed}
          onDelete={handleDeleteSmartFeed}
          onClose={() => setEditingSF(null)}
        />
      )}
      {/* ── Podcast mini-player — persists across navigation ── */}
      {podcastItem && (
        <PodcastPlayer item={podcastItem} onClose={() => setPodcastItem(null)} />
      )}

      {!onboardingDone && feeds.length === 0 && feedsLoaded && (
        <Onboarding
          onAdd={handleOnboardingAdd}
          onDismiss={() => { setOnboardingDone(true); localStorage.setItem("fb-onboarded", "1"); }}
        />
      )}
      <PWAInstallBanner />
      {editingFolder && (
        <FolderModal
          folder={editingFolder === "new" ? null : editingFolder}
          onSave={handleSaveFolder}
          onDelete={handleDeleteFolder}
          onClose={() => setEditingFolder(null)}
        />
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
