-- Migration: Convert decimal money columns to integer cents
-- This prevents floating-point rounding errors in financial calculations

-- Step 1: Add new cents columns
ALTER TABLE transactions ADD COLUMN amount_cents BIGINT;
ALTER TABLE monthly_budgets ADD COLUMN budgeted_amount_cents BIGINT;

-- Step 2: Migrate existing data (multiply by 100 and round)
UPDATE transactions 
SET amount_cents = ROUND(amount * 100)::BIGINT
WHERE amount_cents IS NULL;

UPDATE monthly_budgets 
SET budgeted_amount_cents = ROUND(budgeted_amount * 100)::BIGINT
WHERE budgeted_amount_cents IS NULL;

-- Step 3: Drop old columns and rename new ones
-- NOTE: Do this in a separate migration after verifying data is correct
-- For now, we keep both columns for backward compatibility during transition

-- Add NOT NULL constraint after data is migrated
ALTER TABLE transactions ALTER COLUMN amount_cents SET NOT NULL;
ALTER TABLE monthly_budgets ALTER COLUMN budgeted_amount_cents SET NOT NULL;

-- Optional: Add check constraint to ensure values are reasonable
ALTER TABLE transactions ADD CONSTRAINT transactions_amount_cents_positive CHECK (amount_cents > 0);
ALTER TABLE transactions ADD CONSTRAINT transactions_amount_cents_max CHECK (amount_cents <= 10000000000); -- $100M max

ALTER TABLE monthly_budgets ADD CONSTRAINT monthly_budgets_cents_not_negative CHECK (budgeted_amount_cents >= 0);
ALTER TABLE monthly_budgets ADD CONSTRAINT monthly_budgets_cents_max CHECK (budgeted_amount_cents <= 10000000000);

-- Create index on new column (same as old)
CREATE INDEX IF NOT EXISTS idx_transactions_amount_cents ON transactions(amount_cents);

-- PHASE 2 (run separately after app is updated to use cents columns):
-- ALTER TABLE transactions DROP COLUMN amount;
-- ALTER TABLE monthly_budgets DROP COLUMN budgeted_amount;
-- ALTER TABLE transactions RENAME COLUMN amount_cents TO amount;
-- ALTER TABLE monthly_budgets RENAME COLUMN budgeted_amount_cents TO budgeted_amount;
