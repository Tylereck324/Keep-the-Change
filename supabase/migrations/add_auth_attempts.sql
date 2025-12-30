-- Create auth_attempts table for persistent rate limiting
CREATE TABLE IF NOT EXISTS auth_attempts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address text NOT NULL UNIQUE,
  attempt_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  lockout_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast IP lookups
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip ON auth_attempts(ip_address);

-- Cleanup old records (run periodically via cron or manually)
-- DELETE FROM auth_attempts WHERE lockout_until < now() - interval '1 hour';
