-- Daily AI summary usage tracker
-- Incremented each time a free user generates a summary.
-- Resets automatically because the primary key includes the date.

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id   UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date      DATE    NOT NULL DEFAULT CURRENT_DATE,
  count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Users can only read/write their own row
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_self" ON ai_usage
  FOR ALL USING (auth.uid() = user_id);

-- Efficient lookup by user + date (covered by PK, but explicit for clarity)
CREATE INDEX IF NOT EXISTS ai_usage_user_date ON ai_usage (user_id, date);

-- Atomic upsert: insert or increment. Called via supabase.rpc().
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID, p_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO ai_usage (user_id, date, count)
    VALUES (p_user_id, p_date, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET count = ai_usage.count + 1
    RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;
