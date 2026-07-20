import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";
import { initReaderPrefs } from "./lib/readerPrefs.js";
import { pruneOldOfflineArticles } from "./lib/offlineCache.js";

initReaderPrefs();
pruneOldOfflineArticles();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// ── Register Service Worker ───────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      // Periodic background sync — Chromium-only, installed-PWA-only; silently unavailable elsewhere
      try {
        if ("periodicSync" in reg) {
          const status = await navigator.permissions.query({ name: "periodic-background-sync" });
          if (status.state === "granted") {
            await reg.periodicSync.register("feedbox-periodic", { minInterval: 6 * 60 * 60 * 1000 });
          }
        }
      } catch {}
    }).catch((err) => {
      console.warn("SW registration failed:", err);
    });
  });
}
