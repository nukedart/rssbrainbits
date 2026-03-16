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
