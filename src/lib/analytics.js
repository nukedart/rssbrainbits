// ── Feedbox Analytics ─────────────────────────────────────────
// Lightweight fire-and-forget event tracker backed by Supabase.
// Never blocks the UI — all writes are async and silent on failure.
//
// Usage:
//   import { track } from "./analytics";
//   track("article_opened", { source: "The Verge", filter: "inbox" });
//
// SQL to run in Supabase:
//   See supabase/migrations/analytics_events.sql

let _supabase = null;
let _userId = null;

// Stable session ID for grouping events within one browser session
const SESSION_ID = (() => {
  const key = "fb-session-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
})();

// Call once after auth resolves
export function identify(user) {
  _userId = user?.id ?? null;
}

// Lazily import supabase to avoid circular deps
async function getClient() {
  if (!_supabase) {
    const mod = await import("./supabase.js");
    _supabase = mod.supabase;
  }
  return _supabase;
}

// Main tracking function — fire and forget, never throws
export async function track(event, properties = {}) {
  try {
    const sb = await getClient();
    await sb.from("analytics_events").insert({
      event,
      user_id: _userId,
      session_id: SESSION_ID,
      properties,
    });
  } catch {
    // Silently swallow — analytics must never break the app
  }
}
