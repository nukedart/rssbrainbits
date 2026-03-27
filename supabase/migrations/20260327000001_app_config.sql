-- ── App config: admin-controlled settings stored server-side ──
-- Stores non-secret configuration like active AI provider.
-- API keys NEVER go here — use Worker/Edge Function secrets instead.

CREATE TABLE IF NOT EXISTS app_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (e.g. to fetch active AI provider)
CREATE POLICY "authenticated_read_config" ON app_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can write
CREATE POLICY "admin_insert_config" ON app_config
  FOR INSERT WITH CHECK (
    coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false)
  );

CREATE POLICY "admin_update_config" ON app_config
  FOR UPDATE USING (
    coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false)
  );

CREATE POLICY "admin_delete_config" ON app_config
  FOR DELETE USING (
    coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false)
  );

-- Default: use Anthropic (Claude Haiku)
INSERT INTO app_config (key, value)
  VALUES ('ai_provider', 'anthropic')
  ON CONFLICT (key) DO NOTHING;

-- ── Admin read access for ai_usage ────────────────────────────
-- The existing ai_usage_self policy covers users seeing their own rows.
-- This adds a second permissive SELECT policy so admins see all rows.
-- (Postgres ORs permissive policies for the same operation.)

CREATE POLICY "admin_read_ai_usage" ON ai_usage
  FOR SELECT USING (
    coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false)
  );
