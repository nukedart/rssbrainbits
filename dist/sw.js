/**
 * Feedbox Service Worker
 * ─────────────────────
 * Minimal SW that enables PWA installability (required by browsers).
 * Caches the app shell for offline support.
 */

const CACHE = "feedbox-v1.19";
const SHELL = [
  "/", "/index.html", "/feedbox-logo.png", "/favicon.svg", "/manifest.json",
  "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png",
];

// Install — cache app shell
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch — network first, fall back to cache for navigation
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/index.html"))
    );
    return;
  }
  // Same-origin built assets — stale-while-revalidate so the app works offline
  const url = new URL(e.request.url);
  if (e.request.method === "GET" && url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(e.request).then((cached) => {
          const network = fetch(e.request).then((res) => {
            if (res && res.ok) cache.put(e.request, res.clone());
            return res;
          });
          if (cached) { network.catch(() => {}); return cached; }
          return network;
        })
      )
    );
  }
});

// Push notifications (for future use)
self.addEventListener("push", (e) => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || "Feedbox", {
      body: data.body || "New articles in your feeds",
      icon: "/feedbox-logo.png",
      badge: "/favicon.svg",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || "/"));
});

// Background sync — tell the app to refresh feeds when triggered
self.addEventListener("sync", (e) => {
  if (e.tag === "feedbox-sync") {
    e.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: false }).then((clientList) => {
        clientList.forEach((client) => client.postMessage({ type: "BG_SYNC" }));
      })
    );
  }
});

// Periodic background sync (if browser supports it)
self.addEventListener("periodicsync", (e) => {
  if (e.tag === "feedbox-periodic") {
    e.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: false }).then((clientList) => {
        if (clientList.length > 0) {
          clientList.forEach((client) => client.postMessage({ type: "BG_SYNC" }));
        }
      })
    );
  }
});
