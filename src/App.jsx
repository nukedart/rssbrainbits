import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider, useTheme } from "./hooks/useTheme";
import LoginPage from "./pages/LoginPage";
import InboxPage from "./pages/InboxPage";
import { HistoryPage, ReadLaterPage, SettingsPage } from "./pages/SecondaryPages";
import NotesPage from "./components/NotesPage";
import SmartFeedModal from "./components/SmartFeedModal";
import Sidebar from "./components/Sidebar";
import { Spinner } from "./components/UI";
import { getSmartFeeds, addSmartFeed, updateSmartFeed, deleteSmartFeed } from "./lib/supabase";

function AppShell() {
  const { user } = useAuth();
  const { T }    = useTheme();

  // ── ALL state at the top — no hooks after conditional returns ──
  const [page, setPage]             = useState("inbox");
  const [unreadCount, setUnreadCount] = useState(0);
  const [smartFeeds, setSmartFeeds]   = useState([]);
  const [editingSF, setEditingSF]     = useState(null); // null | "new" | {feed}

  // Load smart feeds once user is known
  useEffect(() => {
    if (!user) return;
    getSmartFeeds(user.id).then(setSmartFeeds).catch(console.error);
  }, [user]);

  // ── Smart feed handlers ────────────────────────────────────
  async function handleSaveSmartFeed({ name, keywords, color }) {
    if (editingSF && editingSF !== "new") {
      const updated = await updateSmartFeed(editingSF.id, { name, keywords, color });
      setSmartFeeds(prev => prev.map(sf => sf.id === updated.id ? updated : sf));
    } else {
      const created = await addSmartFeed(user.id, { name, keywords, color });
      setSmartFeeds(prev => [...prev, created]);
    }
    setEditingSF(null);
  }

  async function handleDeleteSmartFeed(id) {
    await deleteSmartFeed(id);
    setSmartFeeds(prev => prev.filter(sf => sf.id !== id));
    if (page === `smart:${id}`) setPage("inbox");
    setEditingSF(null);
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
      return <InboxPage filterMode="smart" smartFeedDef={sfDef} onUnreadCount={setUnreadCount} />;
    }
    switch (page) {
      case "inbox":     return <InboxPage filterMode="all"    onUnreadCount={setUnreadCount} />;
      case "unread":    return <InboxPage filterMode="unread" onUnreadCount={setUnreadCount} />;
      case "today":     return <InboxPage filterMode="today"  onUnreadCount={setUnreadCount} />;
      case "readlater": return <ReadLaterPage />;
      case "history":   return <HistoryPage />;
      case "notes":     return <NotesPage />;
      case "settings":  return <SettingsPage />;
      default:          return <InboxPage filterMode="all"    onUnreadCount={setUnreadCount} />;
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
        onNavigate={setPage}
        unreadCount={unreadCount}
        smartFeeds={smartFeeds}
        onAddSmartFeed={() => setEditingSF("new")}
        onEditSmartFeed={(sf) => setEditingSF(sf)}
      />
      <div style={{ flex: 1, display: "flex", minWidth: 0, overflow: "hidden" }}>
        {renderPage()}
      </div>
      {editingSF && (
        <SmartFeedModal
          feed={editingSF === "new" ? null : editingSF}
          onSave={handleSaveSmartFeed}
          onDelete={handleDeleteSmartFeed}
          onClose={() => setEditingSF(null)}
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
