// localStorage retry queue for highlight-review upserts that failed to persist.
export const REVIEW_QUEUE_KEY = "fb-review-queue";
const MAX_ENTRIES = 200;

export function loadQueue() {
  try {
    const q = JSON.parse(localStorage.getItem(REVIEW_QUEUE_KEY) || "[]");
    return Array.isArray(q) ? q : [];
  } catch { return []; }
}

function saveQueue(q) {
  try { localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(q)); } catch { /* storage unavailable */ }
}

// Entry: { userId, highlightId, payload }. Dedupes by highlight id (latest wins).
export function enqueue(entry) {
  const q = loadQueue().filter(e => !(e.highlightId === entry.highlightId && e.userId === entry.userId));
  q.push(entry);
  saveQueue(q.slice(-MAX_ENTRIES));
}

export function dequeue(highlightId, userId) {
  saveQueue(loadQueue().filter(e => !(e.highlightId === highlightId && e.userId === userId)));
}

// Retries queued entries sequentially via upsertFn(userId, highlightId, payload).
// Stops at first failure (likely offline). Returns number flushed.
export async function flush(upsertFn, userId) {
  let n = 0;
  for (const e of loadQueue()) {
    if (userId && e.userId !== userId) continue;
    try {
      await upsertFn(e.userId, e.highlightId, e.payload);
      dequeue(e.highlightId, e.userId);
      n++;
    } catch { break; }
  }
  return n;
}
