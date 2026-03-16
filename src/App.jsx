import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider, useTheme } from "./hooks/useTheme";
import LoginPage from "./pages/LoginPage";
import InboxPage from "./pages/InboxPage";
import { HistoryPage, ReadLaterPage, SettingsPage } from "./pages/SecondaryPages";
import Sidebar from "./components/Sidebar";
import { Spinner } from "./components/UI";
import { getReadUrls } from "./lib/supabase";

function AppShell() {
  const { user } = useAuth();
  const { T }    = useTheme();
  const [page, setPage]           = useState("inbox");
  const [unreadCount, setUnreadCount] = useState(0);

  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (user === null) return <LoginPage />;

  // Render correct page
  function renderPage() {
    switch (page) {
      case "inbox":     return <InboxPage filterMode="all" />;
      case "today":     return <InboxPage filterMode="today" />;
      case "readlater": return <ReadLaterPage />;
      case "history":   return <HistoryPage />;
      case "settings":  return <SettingsPage />;
      default:          return <InboxPage filterMode="all" />;
    }
  }

  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "row",
      background: T.bg, color: T.text,
      fontFamily: "'DM Sans', system-ui, sans-serif",
      WebkitFontSmoothing: "antialiased", overflow: "hidden",
    }}>
      <Sidebar active={page} onNavigate={setPage} unreadCount={unreadCount} />
      <div style={{ flex: 1, display: "flex", minWidth: 0, overflow: "hidden" }}>
        {renderPage()}
      </div>
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
