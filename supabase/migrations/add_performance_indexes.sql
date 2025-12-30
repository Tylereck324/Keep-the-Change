-- Performance optimization indexes for frequently queried columns

-- Transactions table indexes
-- Composite index for household_id + date (used in all date range queries)
CREATE INDEX IF NOT EXISTS idx_transactions_household_date
  ON transactions(household_id, date DESC);

-- Composite index for household_id + type (used when filtering income vs expenses)
CREATE INDEX IF NOT EXISTS idx_transactions_household_type
  ON transactions(household_id, type);

-- Index for household_id + category_id (used in category spending calculations)
CREATE INDEX IF NOT EXISTS idx_transactions_household_category
  ON transactions(household_id, category_id);

-- Index for description search (used in merchant insights)
CREATE INDEX IF NOT EXISTS idx_transactions_household_description
  ON transactions(household_id, description);

-- Monthly budgets indexes
-- Composite index for household_id + month range queries
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_household_month
  ON monthly_budgets(household_id, month);

-- Category keywords indexes
-- Index for keyword lookups during transaction categorization
CREATE INDEX IF NOT EXISTS idx_category_keywords_household_keyword
  ON category_keywords(household_id, keyword);

-- Merchant patterns indexes
-- Index for merchant name lookups
CREATE INDEX IF NOT EXISTS idx_merchant_patterns_household_merchant
  ON merchant_patterns(household_id, merchant_name);

-- Note: These indexes will improve query performance for:
-- 1. Date range queries (reports, trends, year summaries)
-- 2. Category-based filtering and aggregations
-- 3. Income vs expense filtering
-- 4. Merchant insights and pattern matching
-- 5. Transaction categorization lookups
