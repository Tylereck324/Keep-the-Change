-- Migration: Add idempotency keys table for double-submit protection
-- Prevents duplicate transactions when users submit forms multiple times

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_household ON idempotency_keys(household_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- Function to check and record idempotency key
-- Returns TRUE if this is a new key (proceed with operation)
-- Returns FALSE if key already exists (skip operation)
CREATE OR REPLACE FUNCTION check_idempotency_key(
  p_key TEXT,
  p_household_id UUID,
  p_ttl_hours INTEGER DEFAULT 24
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Clean up expired keys first (opportunistic cleanup)
  DELETE FROM idempotency_keys WHERE expires_at < NOW();
  
  -- Check if key exists
  SELECT EXISTS(
    SELECT 1 FROM idempotency_keys 
    WHERE key = p_key AND household_id = p_household_id
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Key already processed
    RETURN FALSE;
  END IF;
  
  -- Insert new key
  INSERT INTO idempotency_keys (key, household_id, expires_at)
  VALUES (p_key, p_household_id, NOW() + (p_ttl_hours || ' hours')::INTERVAL);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function (run periodically via cron or scheduled function)
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < NOW();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
