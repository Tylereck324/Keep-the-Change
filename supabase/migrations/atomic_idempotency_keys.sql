-- Make idempotency checks atomic and per-household

-- Remove duplicate keys per household before adding constraint
WITH ranked AS (
  SELECT id,
         household_id,
         key,
         ROW_NUMBER() OVER (PARTITION BY household_id, key ORDER BY created_at ASC) AS rn
  FROM idempotency_keys
)
DELETE FROM idempotency_keys
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Drop global unique if present and add per-household unique
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'idempotency_keys_key_key'
  ) THEN
    ALTER TABLE idempotency_keys DROP CONSTRAINT idempotency_keys_key_key;
  END IF;
END $$;

ALTER TABLE idempotency_keys
  ADD CONSTRAINT idempotency_keys_household_key_unique UNIQUE (household_id, key);

-- Update function to be atomic
CREATE OR REPLACE FUNCTION check_idempotency_key(
  p_key TEXT,
  p_household_id UUID,
  p_ttl_hours INTEGER DEFAULT 24
)
RETURNS BOOLEAN AS $$
DECLARE
  inserted BOOLEAN;
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < NOW();

  INSERT INTO idempotency_keys (key, household_id, expires_at)
  VALUES (p_key, p_household_id, NOW() + (p_ttl_hours || ' hours')::INTERVAL)
  ON CONFLICT (household_id, key) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
