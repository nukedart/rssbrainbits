import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth ──────────────────────────────────────────────────────
export async function signInWithGitHub() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
  });
  if (error) throw error;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
  });
  if (error) throw error;
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
  });
  if (error) throw error;
  return data;
}

export async function sendMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
  });
  if (error) throw error;
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + import.meta.env.BASE_URL + "?reset=1",
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}

// ── Feeds ─────────────────────────────────────────────────────
export async function getFeeds(userId) {
  const { data, error } = await supabase
    .from("feeds").select("*").eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addFeed(userId, feed) {
  const { data, error } = await supabase
    .from("feeds").insert({ user_id: userId, ...feed }).select().single();
  if (error) throw error;
  return data;
}

export async function updateFeedName(feedId, name) {
  const { data, error } = await supabase
    .from("feeds").update({ name }).eq("id", feedId).select().single();
  if (error) throw error;
  return data;
}

export async function updateFeedSettings(feedId, settings) {
  // settings: { name, fetch_full_content }
  const { data, error } = await supabase
    .from("feeds").update(settings).eq("id", feedId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFeed(feedId) {
  const { error } = await supabase.from("feeds").delete().eq("id", feedId);
  if (error) throw error;
}

// ── History ───────────────────────────────────────────────────
export async function getHistory(userId, limit = 50) {
  const { data, error } = await supabase
    .from("history").select("*").eq("user_id", userId)
    .order("read_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

export async function addToHistory(userId, item) {
  const { error } = await supabase.from("history").upsert(
    { user_id: userId, url: item.url, title: item.title, source: item.source, read_at: new Date().toISOString() },
    { onConflict: "user_id,url" }
  );
  if (error) throw error;
}

export async function clearHistory(userId) {
  const { error } = await supabase.from("history").delete().eq("user_id", userId);
  if (error) throw error;
}

// ── Saved / Bookmarks ─────────────────────────────────────────
export async function getSaved(userId) {
  const { data, error } = await supabase
    .from("saved").select("*").eq("user_id", userId)
    .order("saved_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveItem(userId, item) {
  const { error } = await supabase.from("saved").upsert(
    { user_id: userId, url: item.url, title: item.title, source: item.source,
      summary: item.summary || null, saved_at: new Date().toISOString() },
    { onConflict: "user_id,url" }
  );
  if (error) throw error;
}

export async function unsaveItem(userId, url) {
  const { error } = await supabase.from("saved").delete().eq("user_id", userId).eq("url", url);
  if (error) throw error;
}

// ── Highlights ────────────────────────────────────────────────
export async function getHighlights(userId, articleUrl) {
  const { data, error } = await supabase
    .from("highlights").select("*").eq("user_id", userId).eq("article_url", articleUrl)
    .order("position", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addHighlight(userId, highlight) {
  const { data, error } = await supabase
    .from("highlights").insert({ user_id: userId, ...highlight }).select().single();
  if (error) throw error;
  return data;
}

export async function updateHighlightNote(highlightId, note) {
  const { error } = await supabase.from("highlights").update({ note }).eq("id", highlightId);
  if (error) throw error;
}

export async function deleteHighlight(highlightId) {
  const { error } = await supabase.from("highlights").delete().eq("id", highlightId);
  if (error) throw error;
}

// ── Article Tags ──────────────────────────────────────────────
export async function getArticleTags(userId, articleUrl) {
  const { data, error } = await supabase
    .from("article_tags").select("*").eq("user_id", userId).eq("article_url", articleUrl)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addArticleTag(userId, articleUrl, articleTitle, tag) {
  const { data, error } = await supabase.from("article_tags")
    .upsert({ user_id: userId, article_url: articleUrl, article_title: articleTitle, tag },
      { onConflict: "user_id,article_url,tag" })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteArticleTag(tagId) {
  const { error } = await supabase.from("article_tags").delete().eq("id", tagId);
  if (error) throw error;
}

export async function getAllTags(userId) {
  const { data, error } = await supabase.from("article_tags").select("tag").eq("user_id", userId);
  if (error) throw error;
  return [...new Set(data.map((r) => r.tag))].sort();
}

// ── Read Later ────────────────────────────────────────────────
export async function getReadLater(userId) {
  const { data, error } = await supabase
    .from("saved").select("*").eq("user_id", userId).eq("is_read_later", true)
    .order("saved_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addReadLater(userId, item) {
  const { error } = await supabase.from("saved").upsert(
    { user_id: userId, url: item.url, title: item.title, source: item.source,
      summary: item.summary || null, is_read_later: true, saved_at: new Date().toISOString() },
    { onConflict: "user_id,url" }
  );
  if (error) throw error;
}

export async function removeReadLater(userId, url) {
  const { error } = await supabase.from("saved").delete().eq("user_id", userId).eq("url", url);
  if (error) throw error;
}

// ── Read / Unread tracking ────────────────────────────────────
export async function getReadUrls(userId) {
  const { data, error } = await supabase
    .from("read_items").select("url").eq("user_id", userId);
  if (error) throw error;
  return new Set(data.map((r) => r.url));
}

export async function markRead(userId, url, feedId = null) {
  const { error } = await supabase.from("read_items").upsert(
    { user_id: userId, url, feed_id: feedId, read_at: new Date().toISOString() },
    { onConflict: "user_id,url" }
  );
  if (error) throw error;
}

export async function markUnread(userId, url) {
  const { error } = await supabase.from("read_items").delete()
    .eq("user_id", userId).eq("url", url);
  if (error) throw error;
}

// ── Search ────────────────────────────────────────────────────
// Searches history + saved tables using Postgres full-text search.
// Falls back to ilike for short queries (< 3 chars).
export async function searchItems(userId, query) {
  if (!query?.trim()) return [];
  const q = query.trim();

  // Use full-text search for longer queries, ilike for short ones
  const useFullText = q.length >= 3;

  const [historyRes, savedRes] = await Promise.all([
    useFullText
      ? supabase.from("history").select("*").eq("user_id", userId)
          .textSearch("search_vector", q, { type: "websearch" })
          .order("read_at", { ascending: false }).limit(30)
      : supabase.from("history").select("*").eq("user_id", userId)
          .ilike("title", `%${q}%`).order("read_at", { ascending: false }).limit(30),

    useFullText
      ? supabase.from("saved").select("*").eq("user_id", userId)
          .textSearch("search_vector", q, { type: "websearch" })
          .order("saved_at", { ascending: false }).limit(20)
      : supabase.from("saved").select("*").eq("user_id", userId)
          .ilike("title", `%${q}%`).order("saved_at", { ascending: false }).limit(20),
  ]);

  // Merge + deduplicate by URL, history first
  const seen = new Set();
  const results = [];
  for (const item of [...(historyRes.data || []), ...(savedRes.data || [])]) {
    if (!seen.has(item.url)) {
      seen.add(item.url);
      results.push({ ...item, _resultType: "history" });
    }
  }
  return results;
}

// ── Smart Feeds ───────────────────────────────────────────────
export async function getSmartFeeds(userId) {
  const { data, error } = await supabase
    .from("smart_feeds").select("*").eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  // Normalise: feed_ids may not exist on older DBs — default to null
  return (data || []).map(sf => ({ ...sf, feed_ids: sf.feed_ids ?? null }));
}

export async function addSmartFeed(userId, { name, keywords, color, feed_ids = null }) {
  // Only include feed_ids in payload if column exists (safe for older DBs)
  const payload = { user_id: userId, name, keywords, color };
  if (feed_ids?.length) payload.feed_ids = feed_ids;
  const { data, error } = await supabase
    .from("smart_feeds").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateSmartFeed(id, { name, keywords, color, feed_ids = null }) {
  const payload = { name, keywords, color };
  payload.feed_ids = feed_ids?.length ? feed_ids : null;
  const { data, error } = await supabase
    .from("smart_feeds").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSmartFeed(id) {
  const { error } = await supabase.from("smart_feeds").delete().eq("id", id);
  if (error) throw error;
}

// Match articles against a smart feed definition (client-side).
//
// Keyword syntax:
//   apple          — simple substring match (case-insensitive)
//   "apple watch"  — exact phrase match
//   -android       — exclusion: article must NOT contain this
//   AI OR ML       — OR logic between two terms
//
// Accepts either the full smartFeedDef object { keywords, feed_ids }
// or a plain keywords array for backwards compatibility.
export function matchesSmartFeed(item, defOrKeywords) {
  if (!defOrKeywords) return false;

  const keywords = Array.isArray(defOrKeywords) ? defOrKeywords : defOrKeywords.keywords;
  const feedIds  = Array.isArray(defOrKeywords) ? null : defOrKeywords.feed_ids;

  if (!keywords?.length) return false;

  // Feed scope check
  if (feedIds?.length && item.feedId && !feedIds.includes(item.feedId)) return false;

  const haystack = [item.title, item.description, item.source, item.author]
    .filter(Boolean).join(" ").toLowerCase();

  function termMatches(term) {
    const t = term.trim();
    if (!t) return false;

    // Exclusion: starts with -
    if (t.startsWith("-")) {
      const neg = t.slice(1).trim();
      if (!neg) return true;
      // Exact phrase exclusion: -"phrase"
      if (neg.startsWith('"') && neg.endsWith('"')) {
        return !haystack.includes(neg.slice(1,-1).toLowerCase());
      }
      return !haystack.includes(neg.toLowerCase());
    }

    // OR logic: "term1 OR term2"
    if (t.includes(" or ") || t.toUpperCase().includes(" OR ")) {
      return t.split(/\s+or\s+/i).some(part => termMatches(part.trim()));
    }

    // Exact phrase: "quoted phrase"
    if (t.startsWith('"') && t.endsWith('"')) {
      return haystack.includes(t.slice(1,-1).toLowerCase());
    }

    // Default: substring
    return haystack.includes(t.toLowerCase());
  }

  // All non-exclusion keywords must match (AND logic between positive terms)
  // Exclusion keywords are applied independently
  const positives  = keywords.filter(kw => !kw.trim().startsWith("-"));
  const exclusions = keywords.filter(kw => kw.trim().startsWith("-"));

  // At least one positive keyword must match
  const posMatch = positives.length === 0 || positives.some(kw => termMatches(kw));
  // No exclusion must match
  const excMatch = exclusions.every(kw => termMatches(kw));

  return posMatch && excMatch;
}


// ── Reading stats ─────────────────────────────────────────────
export async function getReadingStats(userId) {
  // Total all time (just a count — always works)
  const { count, error: e2 } = await supabase
    .from("read_items").select("url", { count: "exact", head: true })
    .eq("user_id", userId);
  if (e2) throw e2;

  // Try to get read_at data — may not exist on older schemas
  const { data: recentData } = await supabase
    .from("read_items").select("url, read_at")
    .eq("user_id", userId).order("read_at", { ascending: false }).limit(500)
    .catch(() => ({ data: [] }));

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const weekData = (recentData || []).filter(r => r.read_at && r.read_at >= weekAgo);

  // Reading streak — count consecutive days with at least one read
  let streak = 0;
  if (recentData?.length && recentData[0]?.read_at) {
    const days = new Set(recentData.map(r => r.read_at?.slice(0, 10)).filter(Boolean));
    const today = new Date().toISOString().slice(0, 10);
    let check = today;
    for (let i = 0; i < 365; i++) {
      if (days.has(check)) {
        streak++;
        const d = new Date(check);
        d.setDate(d.getDate() - 1);
        check = d.toISOString().slice(0, 10);
      } else break;
    }
  }

  // Articles per day this week
  const perDay = {};
  weekData.forEach(r => {
    const day = r.read_at?.slice(0, 10);
    if (day) perDay[day] = (perDay[day] || 0) + 1;
  });

  return {
    thisWeek: weekData.length,
    allTime: count || 0,
    streak,
    perDay,
  };
}

export async function getAllHighlights(userId) {
  const { data, error } = await supabase
    .from("highlights").select("*").eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllHighlightsWithNotes(userId) {
  const { data, error } = await supabase
    .from("highlights").select("*").eq("user_id", userId)
    .not("note", "is", null).not("note", "eq", "")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// ── Reading progress ──────────────────────────────────────────
export async function getReadingProgress(userId, articleUrl) {
  const { data } = await supabase
    .from("reading_progress").select("progress")
    .eq("user_id", userId).eq("article_url", articleUrl).single();
  return data?.progress ?? 0;
}

export async function setReadingProgress(userId, articleUrl, progress) {
  await supabase.from("reading_progress").upsert(
    { user_id: userId, article_url: articleUrl, progress, updated_at: new Date().toISOString() },
    { onConflict: "user_id,article_url" }
  );
}

// ── Feed folders ──────────────────────────────────────────────
export async function getFolders(userId) {
  const { data, error } = await supabase
    .from("feed_folders").select("*").eq("user_id", userId)
    .order("position").order("name");
  if (error) throw error;
  return data || [];
}

export async function addFolder(userId, { name, color = "gray" }) {
  const { data, error } = await supabase
    .from("feed_folders").insert({ user_id: userId, name, color }).select().single();
  if (error) throw error;
  return data;
}

export async function updateFolder(id, updates) {
  const { data, error } = await supabase
    .from("feed_folders").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFolder(id) {
  // Feeds in the folder become ungrouped (folder_id SET NULL via cascade)
  const { error } = await supabase.from("feed_folders").delete().eq("id", id);
  if (error) throw error;
}

export async function setFeedFolder(feedId, folderId) {
  const { error } = await supabase
    .from("feeds").update({ folder_id: folderId }).eq("id", feedId);
  if (error) throw error;
}
