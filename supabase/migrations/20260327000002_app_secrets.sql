-- ── App secrets: admin-only API key storage ───────────────────
-- Stores API keys entered via the admin panel.
-- Only admins can read or write — regular users have no access.
-- The summarize Edge Function reads via service role (bypasses RLS).

CREATE TABLE IF NOT EXISTS app_secrets (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

-- Admin-only for ALL operations (both read and write)
CREATE POLICY "admin_all_secrets" ON app_secrets
  FOR ALL
  USING (
    coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false)
  )
  WITH CHECK (
    coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false)
  );
