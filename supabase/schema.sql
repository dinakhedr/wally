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

  insert into public.categories (user_id, kind, name, emoji, color, sort_order)
  values
    (new.id, 'expense', 'Groceries',     '🛒', 'mint',   1),
    (new.id, 'expense', 'Dining out',    '🍔', 'coral',  2),
    (new.id, 'expense', 'Transport',     '🚗', 'sky',    3),
    (new.id, 'expense', 'Bills',         '💡', 'sun',    4),
    (new.id, 'expense', 'Home',          '🏠', 'violet', 5),
    (new.id, 'expense', 'Shopping',      '🛍️', 'coral',  6),
    (new.id, 'expense', 'Health',        '💊', 'mint',   7),
    (new.id, 'expense', 'Fun',           '🎬', 'violet', 8),
    (new.id, 'expense', 'Coffee',        '☕', 'sun',    9),
    (new.id, 'expense', 'Subscriptions', '📺', 'sky',   10),
    (new.id, 'expense', 'Education',     '📚', 'sky',   11),
    (new.id, 'expense', 'Gifts',         '🎁', 'coral', 12),
    (new.id, 'expense', 'Travel',        '✈️', 'sky',   13),
    (new.id, 'expense', 'Personal care', '💅', 'violet',14),
    (new.id, 'expense', 'Other',         '📦', 'sun',   15),
    (new.id, 'income',  'Salary',        '💼', 'mint',   1),
    (new.id, 'income',  'Freelance',     '💻', 'mint',   2),
    (new.id, 'income',  'Gift',          '🎁', 'mint',   3),
    (new.id, 'income',  'Other',         '💰', 'mint',   4)
  on conflict (user_id, kind, name) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
