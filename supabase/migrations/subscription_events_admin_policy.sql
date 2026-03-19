-- ── Admin read policy for subscription_events ──────────────────
-- Run this in the Supabase SQL editor.
-- Allows the admin panel to read all subscription events.
-- (The table was created by the Stripe webhook — this just adds the read policy.)

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_subscription_events"
  ON subscription_events FOR SELECT
  USING (
    coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  );
