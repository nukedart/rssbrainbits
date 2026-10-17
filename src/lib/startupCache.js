// Per-user localStorage snapshot of feeds / folders / smart feeds so the Inbox
// can paint cached articles at launch without waiting for Supabase.
const MAX_BYTES = 400_000;
const key = (kind, uid) => `fb-${kind}-${uid}`;

export function loadStartup(kind, uid) {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(key(kind, uid));
    if (raw == null) return null;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : null;
  } catch { return null; }
}

export function saveStartup(kind, uid, rows) {
  if (!uid || !Array.isArray(rows)) return;
  try {
    const s = JSON.stringify(rows);
    if (s.length > MAX_BYTES) { localStorage.removeItem(key(kind, uid)); return; }
    localStorage.setItem(key(kind, uid), s);
  } catch { /* quota / privacy mode */ }
}
