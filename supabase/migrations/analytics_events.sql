-- ── Analytics Events ────────────────────────────────────────────
-- Run this in the Supabase SQL editor once.
-- After running, set is_admin on your account:
--   UPDATE auth.users
--   SET raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'
--   WHERE email = 'your@email.com';

CREATE TABLE IF NOT EXISTS analytics_events (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event      text        NOT NULL,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  properties jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS analytics_event_name_time  ON analytics_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_user_time        ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_created_at       ON analytics_events(created_at DESC);

-- Row-level security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Any logged-in user can insert their own events
CREATE POLICY "users_insert_own"
  ON analytics_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Only admins can read (is_admin flag set in user_metadata)
CREATE POLICY "admin_read_all"
  ON analytics_events FOR SELECT
  USING (
    coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  );
