-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Base Tables (Updated with Cents Columns)
create table if not exists households (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'My Household',
  pin_hash text not null,
  created_at timestamp with time zone default now()
);

create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamp with time zone default now()
);

create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  amount decimal(10,2) not null,
  amount_cents BIGINT, -- NEW: From convert_to_cents.sql
  description text,
  date date not null default current_date,
  created_at timestamp with time zone default now()
);

create table if not exists monthly_budgets (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  month text not null,
  budgeted_amount decimal(10,2) not null default 0,
  budgeted_amount_cents BIGINT, -- NEW: From convert_to_cents.sql
  created_at timestamp with time zone default now(),
  unique(household_id, category_id, month)
);

create table if not exists auth_attempts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address text NOT NULL UNIQUE,
  attempt_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  lockout_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Security (RLS)
ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

-- 4. Indexes
create index if not exists idx_categories_household on categories(household_id);
create index if not exists idx_transactions_household on transactions(household_id);
create index if not exists idx_transactions_category on transactions(category_id);
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_monthly_budgets_household_month on monthly_budgets(household_id, month);
create index if not exists idx_monthly_budgets_category on monthly_budgets(category_id);
create index if not exists idx_auth_attempts_ip on auth_attempts(ip_address);

-- 5. Helper Tables (CSV Import & Keywords)
CREATE TABLE IF NOT EXISTS category_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, category_id, keyword)
);

CREATE TABLE IF NOT EXISTS merchant_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  merchant_name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, merchant_name, category_id)
);

CREATE INDEX IF NOT EXISTS idx_category_keywords_household_keyword ON category_keywords(household_id, keyword);
CREATE INDEX IF NOT EXISTS idx_merchant_patterns_household_merchant ON merchant_patterns(household_id, merchant_name);

-- 6. Idempotency (Double-Submit Protection)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_household ON idempotency_keys(household_id);

CREATE OR REPLACE FUNCTION check_idempotency_key(
  p_key TEXT,
  p_household_id UUID,
  p_ttl_hours INTEGER DEFAULT 24
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < NOW();
  
  SELECT EXISTS(
    SELECT 1 FROM idempotency_keys 
    WHERE key = p_key AND household_id = p_household_id
  ) INTO v_exists;
  
  IF v_exists THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO idempotency_keys (key, household_id, expires_at)
  VALUES (p_key, p_household_id, NOW() + (p_ttl_hours || ' hours')::INTERVAL);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

