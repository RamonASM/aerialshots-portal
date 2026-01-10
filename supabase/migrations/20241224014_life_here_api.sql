-- Made idempotent: 2026-01-07
-- Life Here API - Database Schema
-- Migration: 20241224_014_life_here_api.sql

-- API Keys table for developer access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'business', 'enterprise')),
  monthly_limit INTEGER DEFAULT 3000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,

  -- Metadata
  description TEXT,
  allowed_domains TEXT[], -- Optional domain restrictions
  webhook_url TEXT,       -- For business/enterprise tiers

  -- Billing (for future Stripe integration)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
);

-- API Usage tracking for analytics and rate limiting
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  status_code INTEGER,
  response_time_ms INTEGER,
  cached BOOLEAN DEFAULT false,

  -- Request metadata
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  user_agent TEXT,
  ip_address TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_tier ON api_keys(tier);
CREATE INDEX IF NOT EXISTS idx_api_usage_key_id ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);

-- Partitioned index for time-based queries
CREATE INDEX IF NOT EXISTS idx_api_usage_key_created
  ON api_usage(api_key_id, created_at DESC);

-- API Cache table (for database-backed caching as fallback to Redis)
CREATE TABLE IF NOT EXISTS api_cache (
  cache_key TEXT PRIMARY KEY,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at);

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_api_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM api_cache -- REMOVED: partial index with NOW();
END;
$$ LANGUAGE plpgsql;

-- Daily usage aggregation for dashboard stats
CREATE TABLE IF NOT EXISTS api_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  cached_count INTEGER DEFAULT 0,

  UNIQUE(api_key_id, date, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_daily_key_date
  ON api_usage_daily(api_key_id, date DESC);

-- Function to aggregate daily usage (run nightly via cron)
CREATE OR REPLACE FUNCTION aggregate_api_usage_daily()
RETURNS void AS $$
BEGIN
  INSERT INTO api_usage_daily (api_key_id, date, endpoint, request_count, error_count, avg_response_time_ms, cached_count)
  SELECT
    api_key_id,
    DATE(created_at) as date,
    endpoint,
    COUNT(*) as request_count,
    COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
    AVG(response_time_ms)::INTEGER as avg_response_time_ms,
    COUNT(*) FILTER (WHERE cached = true) as cached_count
  FROM api_usage
  WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
    AND created_at < CURRENT_DATE
  GROUP BY api_key_id, DATE(created_at), endpoint
  ON CONFLICT (api_key_id, date, endpoint)
  DO UPDATE SET
    request_count = EXCLUDED.request_count,
    error_count = EXCLUDED.error_count,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    cached_count = EXCLUDED.cached_count;

  -- Clean up old detailed usage (keep 30 days)
  DELETE FROM api_usage -- REMOVED: partial index with NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_daily ENABLE ROW LEVEL SECURITY;

-- Users can see their own API keys
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
CREATE POLICY "Users can view own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can create own API keys" ON api_keys;
CREATE POLICY "Users can create own API keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
CREATE POLICY "Users can update own API keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON api_keys;
CREATE POLICY "Users can delete own API keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Users can view their own usage
DROP POLICY IF EXISTS "Users can view own API usage" ON api_usage;
DROP POLICY IF EXISTS "Users can view own API usage" ON api_usage;
CREATE POLICY "Users can view own API usage" ON api_usage
  FOR SELECT USING (
    api_key_id IN (SELECT id FROM api_keys WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own daily usage" ON api_usage_daily;
DROP POLICY IF EXISTS "Users can view own daily usage" ON api_usage_daily;
CREATE POLICY "Users can view own daily usage" ON api_usage_daily
  FOR SELECT USING (
    api_key_id IN (SELECT id FROM api_keys WHERE user_id = auth.uid())
  );

-- Service role can do everything (for API logging)
DROP POLICY IF EXISTS "Service role full access to api_keys" ON api_keys;
DROP POLICY IF EXISTS "Service role full access to api_keys" ON api_keys;
CREATE POLICY "Service role full access to api_keys" ON api_keys
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to api_usage" ON api_usage;
DROP POLICY IF EXISTS "Service role full access to api_usage" ON api_usage;
CREATE POLICY "Service role full access to api_usage" ON api_usage
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to api_cache" ON api_cache;
DROP POLICY IF EXISTS "Service role full access to api_cache" ON api_cache;
CREATE POLICY "Service role full access to api_cache" ON api_cache
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant permissions
GRANT ALL ON api_keys TO authenticated;
GRANT ALL ON api_usage TO authenticated;
GRANT ALL ON api_usage_daily TO authenticated;
GRANT ALL ON api_cache TO authenticated;

-- Add comment
COMMENT ON TABLE api_keys IS 'API keys for Life Here API access';
COMMENT ON TABLE api_usage IS 'Per-request API usage tracking';
COMMENT ON TABLE api_usage_daily IS 'Daily aggregated API usage for dashboard';
COMMENT ON TABLE api_cache IS 'Response caching for API performance';
