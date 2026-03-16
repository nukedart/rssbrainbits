-- ============================================================
-- BrainBits — Complete Database Schema
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Feeds ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feeds (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'rss',
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS feeds_user_url_idx ON feeds(user_id, url);

-- ── History ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS history (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url      TEXT NOT NULL,
  title    TEXT,
  source   TEXT,
  read_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS history_user_url_idx ON history(user_id, url);

-- ── Saved / Bookmarks ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url      TEXT NOT NULL,
  title    TEXT,
  source   TEXT,
  summary  TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS saved_user_url_idx ON saved(user_id, url);

-- ── Highlights ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS highlights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_url   TEXT NOT NULL,
  article_title TEXT,
  passage       TEXT NOT NULL,
  note          TEXT,
  color         TEXT NOT NULL DEFAULT 'yellow',
  position      INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS highlights_user_article_idx ON highlights(user_id, article_url);

-- ── Article Tags ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS article_tags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_url   TEXT NOT NULL,
  article_title TEXT,
  tag           TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS article_tags_unique_idx ON article_tags(user_id, article_url, tag);
CREATE INDEX IF NOT EXISTS article_tags_user_idx ON article_tags(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE feeds        ENABLE ROW LEVEL SECURITY;
ALTER TABLE history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved        ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlights   ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own feeds select"   ON feeds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own feeds insert"   ON feeds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own feeds delete"   ON feeds FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own history select" ON history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own history insert" ON history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own history update" ON history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own history delete" ON history FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own saved select"   ON saved FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own saved insert"   ON saved FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own saved update"   ON saved FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own saved delete"   ON saved FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own highlights select" ON highlights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own highlights insert" ON highlights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own highlights update" ON highlights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own highlights delete" ON highlights FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own tags select"    ON article_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own tags insert"    ON article_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tags delete"    ON article_tags FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Migration: Read Later + Unread tracking
-- Run this in Supabase SQL Editor after the original schema
-- ============================================================

-- Add is_read_later flag to saved table (distinguishes Read Later from Saved)
ALTER TABLE saved ADD COLUMN IF NOT EXISTS is_read_later BOOLEAN DEFAULT false;

-- Unread tracking table
-- Stores which article URLs a user has marked as READ.
-- Articles NOT in this table are considered unread.
CREATE TABLE IF NOT EXISTS read_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  feed_id     UUID,           -- optional: link back to feeds table
  read_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS read_items_user_url_idx ON read_items(user_id, url);
CREATE INDEX IF NOT EXISTS read_items_user_idx ON read_items(user_id);

ALTER TABLE read_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read_items select" ON read_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own read_items insert" ON read_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own read_items delete" ON read_items FOR DELETE USING (auth.uid() = user_id);
