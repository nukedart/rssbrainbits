const DB_NAME    = "feedbox-offline";
const DB_VERSION = 1;
const STORE      = "articles";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let _db = null;

async function openDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "url" });
        store.createIndex("cachedAt", "cachedAt");
      }
    };
    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror    = ()  => reject(req.error);
  });
}

export async function getOfflineArticle(url) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(url);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
  } catch { return null; }
}

export async function setOfflineArticle(url, content) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ ...content, url, cachedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  } catch { /* best-effort */ }
}

export async function pruneOldOfflineArticles() {
  try {
    const db     = await openDB();
    const cutoff = Date.now() - MAX_AGE_MS;
    await new Promise((resolve) => {
      const tx    = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req   = store.index("cachedAt").openCursor(IDBKeyRange.upperBound(cutoff));
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) { cursor.delete(); cursor.continue(); } else resolve();
      };
      req.onerror = () => resolve();
    });
  } catch { /* best-effort */ }
}
