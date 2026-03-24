-- ── Index Optimization ────────────────────────────────────────
-- Audit findings from supabase inspect db index-stats:
--   - feed_folders queried by user_id (1003 seq scans) with no user_id index
--   - smart_feeds queried by user_id (1159 seq scans) with no user_id index

-- Add missing user_id indexes on high-seq-scan tables
CREATE INDEX IF NOT EXISTS feed_folders_user_id
  ON public.feed_folders(user_id);

CREATE INDEX IF NOT EXISTS smart_feeds_user_id
  ON public.smart_feeds(user_id);

-- Add index on notes tags for tag-based filtering (future)
CREATE INDEX IF NOT EXISTS notes_tags_gin
  ON public.notes USING gin(tags);

-- Add index on history for recent reads per user (used by stats)
CREATE INDEX IF NOT EXISTS history_user_time
  ON public.history(user_id, read_at DESC);

-- Add index on read_items for date-ranged stats queries
CREATE INDEX IF NOT EXISTS read_items_user_time
  ON public.read_items(user_id, read_at DESC);
