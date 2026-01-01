-- Migration: Database-backed rate limiting for auth attempts
-- This replaces in-memory rate limiting which doesn't work on serverless

-- Function to check if an IP is currently rate limited
CREATE OR REPLACE FUNCTION check_auth_rate_limit(p_ip_address TEXT)
RETURNS TABLE (
  is_blocked BOOLEAN,
  wait_seconds INTEGER,
  current_count INTEGER
) AS $$
DECLARE
  v_attempt auth_attempts%ROWTYPE;
  v_lockout_remaining INTERVAL;
BEGIN
  -- Get existing attempt record
  SELECT * INTO v_attempt
  FROM auth_attempts
  WHERE ip_address = p_ip_address;
  
  -- No record = not blocked
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0;
    RETURN;
  END IF;
  
  -- Check if currently locked out
  IF v_attempt.lockout_until IS NOT NULL AND v_attempt.lockout_until > NOW() THEN
    v_lockout_remaining := v_attempt.lockout_until - NOW();
    RETURN QUERY SELECT 
      TRUE, 
      EXTRACT(EPOCH FROM v_lockout_remaining)::INTEGER + 1,
      v_attempt.attempt_count;
    RETURN;
  END IF;
  
  -- Not locked out
  RETURN QUERY SELECT FALSE, 0, v_attempt.attempt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a failed auth attempt
-- Implements exponential backoff: 1 min, 5 min, 15 min, 1 hour
CREATE OR REPLACE FUNCTION record_auth_failure(p_ip_address TEXT)
RETURNS TABLE (
  new_count INTEGER,
  lockout_seconds INTEGER
) AS $$
DECLARE
  v_attempt auth_attempts%ROWTYPE;
  v_new_count INTEGER;
  v_lockout_duration INTERVAL;
BEGIN
  -- Get or create attempt record
  SELECT * INTO v_attempt
  FROM auth_attempts
  WHERE ip_address = p_ip_address;
  
  IF NOT FOUND THEN
    -- First failure - create record
    INSERT INTO auth_attempts (ip_address, attempt_count, last_attempt_at)
    VALUES (p_ip_address, 1, NOW());
    
    RETURN QUERY SELECT 1, 0;
    RETURN;
  END IF;
  
  -- Reset count if last attempt was more than 1 hour ago
  IF v_attempt.last_attempt_at < NOW() - INTERVAL '1 hour' THEN
    UPDATE auth_attempts
    SET attempt_count = 1, last_attempt_at = NOW(), lockout_until = NULL
    WHERE ip_address = p_ip_address;
    
    RETURN QUERY SELECT 1, 0;
    RETURN;
  END IF;
  
  -- Increment attempt count
  v_new_count := v_attempt.attempt_count + 1;
  
  -- Calculate lockout duration based on attempt count
  -- 5 attempts: 1 minute
  -- 10 attempts: 5 minutes
  -- 15 attempts: 15 minutes
  -- 20+ attempts: 1 hour
  IF v_new_count >= 20 THEN
    v_lockout_duration := INTERVAL '1 hour';
  ELSIF v_new_count >= 15 THEN
    v_lockout_duration := INTERVAL '15 minutes';
  ELSIF v_new_count >= 10 THEN
    v_lockout_duration := INTERVAL '5 minutes';
  ELSIF v_new_count >= 5 THEN
    v_lockout_duration := INTERVAL '1 minute';
  ELSE
    v_lockout_duration := NULL;
  END IF;
  
  -- Update record
  UPDATE auth_attempts
  SET 
    attempt_count = v_new_count,
    last_attempt_at = NOW(),
    lockout_until = CASE WHEN v_lockout_duration IS NOT NULL THEN NOW() + v_lockout_duration ELSE NULL END
  WHERE ip_address = p_ip_address;
  
  RETURN QUERY SELECT 
    v_new_count,
    CASE WHEN v_lockout_duration IS NOT NULL 
      THEN EXTRACT(EPOCH FROM v_lockout_duration)::INTEGER 
      ELSE 0 
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear auth attempts on successful login
CREATE OR REPLACE FUNCTION clear_auth_attempts(p_ip_address TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM auth_attempts WHERE ip_address = p_ip_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup job: Delete attempts older than 24 hours (run via cron or scheduled function)
CREATE OR REPLACE FUNCTION cleanup_old_auth_attempts()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM auth_attempts
  WHERE last_attempt_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
