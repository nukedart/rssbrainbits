-- ── Notes Table ───────────────────────────────────────────────
-- User-owned notes with title, body, tags, and color accent.
-- Run via: supabase db push --linked

CREATE TABLE IF NOT EXISTS public.notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL DEFAULT 'Untitled Note',
  body       TEXT        NOT NULL DEFAULT '',
  tags       TEXT[]      NOT NULL DEFAULT '{}',
  color      TEXT        DEFAULT 'teal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notes"
  ON public.notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Composite index: user + recency (main query pattern)
CREATE INDEX IF NOT EXISTS notes_user_updated
  ON public.notes(user_id, updated_at DESC);
