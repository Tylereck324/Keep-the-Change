-- Keyword rules for category matching
CREATE TABLE IF NOT EXISTS category_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, category_id, keyword)
);

-- Index for fast keyword lookups by category
CREATE INDEX IF NOT EXISTS idx_category_keywords_household_category
  ON category_keywords(household_id, category_id);

-- Index for fast keyword-based category matching
CREATE INDEX IF NOT EXISTS idx_category_keywords_household_keyword
  ON category_keywords(household_id, keyword);

-- Historical merchant patterns for learning
-- Note: merchant_name should be stored in lowercase for case-insensitive matching
CREATE TABLE IF NOT EXISTS merchant_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  merchant_name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, merchant_name, category_id)
);

-- Index for fast merchant lookups
CREATE INDEX IF NOT EXISTS idx_merchant_patterns_household_merchant
  ON merchant_patterns(household_id, merchant_name);
