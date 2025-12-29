-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Households table
create table households (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'My Household',
  pin_hash text not null,
  created_at timestamp with time zone default now()
);

-- Categories table
create table categories (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamp with time zone default now()
);

-- Transactions table
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  category_id uuid references categories(id) on delete set null,
  amount decimal(10,2) not null,
  description text,
  date date not null default current_date,
  created_at timestamp with time zone default now()
);

-- Monthly budgets table
create table monthly_budgets (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  month text not null,
  budgeted_amount decimal(10,2) not null default 0,
  unique(household_id, category_id, month)
);

-- Indexes for performance
create index idx_categories_household on categories(household_id);
create index idx_transactions_household on transactions(household_id);
create index idx_transactions_date on transactions(date);
create index idx_monthly_budgets_household_month on monthly_budgets(household_id, month);
