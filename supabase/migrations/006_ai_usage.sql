-- AI usage tracking for rate limiting demo/trial users on server-side Anthropic key
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, usage_date);

-- RLS: users can read their own usage
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert/update (edge functions use service role)
CREATE POLICY "Service role full access"
  ON ai_usage FOR ALL
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup: delete usage records older than 30 days
-- (run manually or via pg_cron if available)
