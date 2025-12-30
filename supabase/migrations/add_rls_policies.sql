-- Enable Row Level Security on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_patterns ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies require authentication context to be set from the application layer.
-- Since this app uses server-side session management with cookies (not Supabase Auth),
-- these policies serve as an additional security layer alongside application-level filtering.

-- For server actions using service role key, these policies won't apply.
-- Consider implementing custom policies with session variables or migrating to Supabase Auth.

-- Example policies (currently permissive for service role usage):
-- These can be made more restrictive when using Supabase Auth or session variables

-- Categories policies
CREATE POLICY "Enable read access for authenticated users" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON categories
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON categories
  FOR DELETE USING (true);

-- Transactions policies
CREATE POLICY "Enable read access for authenticated users" ON transactions
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON transactions
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON transactions
  FOR DELETE USING (true);

-- Monthly budgets policies
CREATE POLICY "Enable read access for authenticated users" ON monthly_budgets
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON monthly_budgets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON monthly_budgets
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON monthly_budgets
  FOR DELETE USING (true);

-- Category keywords policies
CREATE POLICY "Enable read access for authenticated users" ON category_keywords
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON category_keywords
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON category_keywords
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON category_keywords
  FOR DELETE USING (true);

-- Merchant patterns policies
CREATE POLICY "Enable read access for authenticated users" ON merchant_patterns
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON merchant_patterns
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON merchant_patterns
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON merchant_patterns
  FOR DELETE USING (true);

-- TODO: For production security, consider:
-- 1. Migrating to Supabase Auth for proper user context
-- 2. Adding household_id session variables
-- 3. Making policies restrictive: USING (household_id = current_setting('app.household_id')::uuid)
