-- Wally database schema
-- Run once in Supabase → SQL Editor on a fresh project, then run every file in
-- supabase/migrations/ in order. Safe to re-run: every object is created with
-- IF NOT EXISTS / OR REPLACE.
--
-- Every table carries user_id (defaulting to auth.uid()) and has Row Level
-- Security so each person only ever sees their own rows. Child rows reference
-- their parent through a composite (id, user_id) key, so a row can never point
-- at another user's category, bill or installment.

-- ─── Profiles ────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text,
  avatar_url     text,
  currency       text not null default 'EGP',
  monthly_budget numeric(12, 2) check (monthly_budget is null or monthly_budget >= 0),
  week_starts_on smallint not null default 6 check (week_starts_on between 0 and 6), -- 0 = Sunday, 6 = Saturday
  created_at     timestamptz not null default now()
);

-- ─── Categories ──────────────────────────────────────────────────────────────

create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind         text not null default 'expense' check (kind in ('expense', 'income')),
  name         text not null check (char_length(name) between 1 and 40),
  emoji        text not null default '📦',
  color        text not null default 'violet' check (color in ('violet', 'coral', 'mint', 'sun', 'sky')),
  budget       numeric(12, 2) check (budget is null or budget >= 0),
  sort_order   integer not null default 0,
  archived     boolean not null default false,
  last_used_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, kind, name)
);

create index if not exists categories_user_idx on public.categories (user_id, kind, archived);

-- ─── Expenses & income ───────────────────────────────────────────────────────

create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid,
  amount      numeric(12, 2) not null check (amount > 0),
  note        text check (char_length(note) <= 200),
  spent_on    date not null default current_date,
  created_at  timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);

create index if not exists expenses_user_date_idx on public.expenses (user_id, spent_on desc);

create table if not exists public.income (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid,
  amount      numeric(12, 2) not null check (amount > 0),
  note        text check (char_length(note) <= 200),
  received_on date not null default current_date,
  created_at  timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);

create index if not exists income_user_date_idx on public.income (user_id, received_on desc);

-- ─── Recurring bills ─────────────────────────────────────────────────────────

create table if not exists public.recurring (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid,
  name        text not null check (char_length(name) between 1 and 60),
  amount      numeric(12, 2) not null check (amount > 0),
  frequency   text not null default 'monthly' check (frequency in ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_due    date not null,
  end_date    date,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);

create index if not exists recurring_user_due_idx on public.recurring (user_id, active, next_due);

-- One row per bill occurrence that has been paid (or skipped).
create table if not exists public.recurring_payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recurring_id uuid not null,
  due_on       date not null,
  amount       numeric(12, 2) not null check (amount >= 0),
  status       text not null default 'paid' check (status in ('paid', 'skipped')),
  expense_id   uuid references public.expenses (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (recurring_id, due_on),
  foreign key (recurring_id, user_id) references public.recurring (id, user_id) on delete cascade
);

-- ─── Installments ────────────────────────────────────────────────────────────

create table if not exists public.installments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id    uuid,
  name           text not null check (char_length(name) between 1 and 60),
  total_amount   numeric(12, 2) not null check (total_amount > 0),
  monthly_amount numeric(12, 2) not null check (monthly_amount > 0),
  months_total   integer not null check (months_total between 1 and 600),
  first_due      date not null,
  note           text check (char_length(note) <= 200),
  created_at     timestamptz not null default now(),
  unique (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);

-- One row per installment month that has been paid. seq is 1-based.
create table if not exists public.installment_payments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  installment_id uuid not null,
  seq            integer not null check (seq >= 1),
  due_on         date not null,
  amount         numeric(12, 2) not null check (amount >= 0),
  expense_id     uuid references public.expenses (id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (installment_id, seq),
  foreign key (installment_id, user_id) references public.installments (id, user_id) on delete cascade
);

-- ─── Savings goals (optional) ────────────────────────────────────────────────

create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  emoji       text not null default '🎯',
  target      numeric(12, 2) not null check (target > 0),
  saved       numeric(12, 2) not null default 0 check (saved >= 0),
  target_date date,
  created_at  timestamptz not null default now()
);

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.profiles enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array[
    'categories', 'expenses', 'income', 'recurring', 'recurring_payments',
    'installments', 'installment_payments', 'goals'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- ─── Triggers ────────────────────────────────────────────────────────────────

-- Keep categories.last_used_at fresh so Home and Add can show "Recent".
create or replace function public.touch_category()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.category_id is not null then
    update public.categories set last_used_at = now() where id = new.category_id;
  end if;
  return new;
end $$;

drop trigger if exists expenses_touch_category on public.expenses;
create trigger expenses_touch_category after insert on public.expenses
  for each row execute function public.touch_category();

drop trigger if exists income_touch_category on public.income;
create trigger income_touch_category after insert on public.income
  for each row execute function public.touch_category();

-- Wally's starter categories, in display order.
create or replace function public.starter_categories()
returns table (kind text, name text, emoji text, color text, sort_order int)
language sql
immutable
set search_path = ''
as $$
  values
      ('expense', 'Groceries',          '🛒', 'mint',    1),
      ('expense', 'Cafe & Restaurants', '🍽️', 'coral',   2),
      ('expense', 'Transport',          '🚗', 'sky',     3),
      ('expense', 'Petrol',             '⛽', 'sun',     4),
      ('expense', 'Car Maintenance',    '🔧', 'sky',     5),
      ('expense', 'Ride Hailing',       '🚕', 'sun',     6),
      ('expense', 'Bills',              '💡', 'sun',     7),
      ('expense', 'Internet',           '📶', 'sky',     8),
      ('expense', 'Utilities',          '⚡', 'sun',     9),
      ('expense', 'Home',               '🏠', 'violet', 10),
      ('expense', 'Rent',               '🔑', 'violet', 11),
      ('expense', 'Shopping',           '🛍️', 'coral',  12),
      ('expense', 'Health',             '💊', 'mint',   13),
      ('expense', 'Gym',                '🏋️', 'mint',   14),
      ('expense', 'Personal care',      '💅', 'violet', 15),
      ('expense', 'Fun',                '🎬', 'violet', 16),
      ('expense', 'Subscriptions',      '📺', 'sky',    17),
      ('expense', 'Education',          '📚', 'sky',    18),
      ('expense', 'Gifts',              '🎁', 'coral',  19),
      ('expense', 'Charity',            '🏥', 'coral',  20),
      ('expense', 'Travel',             '✈️', 'sky',    21),
      ('expense', 'Pets',               '🐾', 'sun',    22),
      ('expense', 'Smoking',            '🚬', 'sun',    23),
      ('expense', 'Lent Money',         '🤝', 'sun',    24),
      ('expense', 'Debt Repayment',     '💸', 'coral',  25),
      ('income',  'Salary',             '💼', 'mint',    1),
      ('income',  'Freelance',          '💻', 'mint',    2),
      ('income',  'Bonus',              '🎉', 'mint',    3),
      ('income',  'Overtime',           '⏰', 'mint',    4),
      ('income',  'Commission',         '📊', 'mint',    5),
      ('income',  'Bank Interest',      '🏦', 'mint',    6),
      ('income',  'Certificate Interest','📋', 'mint',   7),
      ('income',  'Dividends',          '📈', 'mint',    8),
      ('income',  'Rental Income',      '🏠', 'mint',    9),
      ('income',  'Gift',               '🎁', 'mint',   10),
      ('income',  'Refund',             '🔄', 'mint',   11),
      ('income',  'Money Returned',     '💰', 'mint',   12),
      ('income',  'Borrowed Money',     '📥', 'mint',   13);
$$;

-- Adds any starter category the user doesn't have yet (names match ignoring
-- case), so it is safe to run for existing users too. With reorder = true it
-- also puts existing starter categories in the list's order.
drop function if exists public.seed_starter_categories(uuid);
create or replace function public.seed_starter_categories(uid uuid, reorder boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if reorder then
    update public.categories c
       set sort_order = s.sort_order
      from public.starter_categories() s
     where c.user_id = uid and c.kind = s.kind and lower(c.name) = lower(s.name);
  end if;

  insert into public.categories (user_id, kind, name, emoji, color, sort_order)
  select uid, s.kind, s.name, s.emoji, s.color, s.sort_order
    from public.starter_categories() s
   where not exists (
     select 1 from public.categories c
      where c.user_id = uid and c.kind = s.kind and lower(c.name) = lower(s.name)
   );
end $$;

-- Only the sign-up trigger and migrations may call it, never the app's users.
revoke execute on function public.seed_starter_categories(uuid, boolean) from public, anon, authenticated;

-- New sign-up → profile + starter categories.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  perform public.seed_starter_categories(new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
