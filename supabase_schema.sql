-- Finzo Supabase Schema
-- Run this in Supabase → SQL Editor → New Query → Run

-- TRANSACTIONS
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  date text, description text, merchant text,
  amount numeric, type text, category text,
  upi_id text, source text, account_type text,
  bank text, anomaly boolean default false,
  anomaly_reason text, month int, year int,
  created_at timestamptz default now()
);

-- STATEMENTS
create table if not exists statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  bank text, account_type text, month int, year int,
  source text, total_debit numeric, total_credit numeric,
  raw_filename text, created_at timestamptz default now()
);

-- BUDGETS
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  category text, limit_amount numeric,
  month int, year int,
  ai_set boolean default true, ai_reason text,
  unique(user_id, category, year, month)
);

-- INVESTMENTS
create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text, type text, invested numeric,
  current_value numeric, units numeric, nav numeric,
  sip_amount numeric, risk text, broker text,
  unique(user_id, name, type)
);

-- ROW LEVEL SECURITY (each user sees only their own data)
alter table transactions  enable row level security;
alter table statements    enable row level security;
alter table budgets       enable row level security;
alter table investments   enable row level security;

create policy "own" on transactions  for all using (auth.uid() = user_id);
create policy "own" on statements    for all using (auth.uid() = user_id);
create policy "own" on budgets       for all using (auth.uid() = user_id);
create policy "own" on investments   for all using (auth.uid() = user_id);

-- INDEX for fast month queries
create index if not exists idx_txn_month on transactions(user_id, year, month);
create index if not exists idx_txn_cat   on transactions(user_id, category);
