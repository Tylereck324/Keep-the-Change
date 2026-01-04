-- Add timezone to households for local month calculations

ALTER TABLE households
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
