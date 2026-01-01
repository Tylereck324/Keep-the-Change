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
