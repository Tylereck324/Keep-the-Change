-- Add type field to transactions for income tracking
-- Run this migration in Supabase SQL Editor

-- Add type column with default 'expense' for existing transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'expense';

-- Add check constraint to ensure valid types
ALTER TABLE transactions
ADD CONSTRAINT transactions_type_check
CHECK (type IN ('income', 'expense'));

-- Create index for filtering by type
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
