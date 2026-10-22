-- Wally migration 002: Google Sheet import
-- Run once in Supabase → SQL Editor on a project that already ran schema.sql.
-- Safe to re-run.

-- Quarterly bills (e.g. a home phone bill every 3 months).
alter table public.recurring drop constraint if exists recurring_frequency_check;
alter table public.recurring add constraint recurring_frequency_check
  check (frequency in ('weekly', 'monthly', 'quarterly', 'yearly'));

-- import_key remembers where an imported row came from, so importing the same
-- sheet twice never creates duplicates. Rows added in the app leave it null.
alter table public.expenses     add column if not exists import_key text;
alter table public.income       add column if not exists import_key text;
alter table public.recurring    add column if not exists import_key text;
alter table public.installments add column if not exists import_key text;

create unique index if not exists expenses_import_key_idx     on public.expenses (user_id, import_key);
create unique index if not exists income_import_key_idx       on public.income (user_id, import_key);
create unique index if not exists recurring_import_key_idx    on public.recurring (user_id, import_key);
create unique index if not exists installments_import_key_idx on public.installments (user_id, import_key);

-- Imports a whole sheet for the signed-in user in one transaction.
-- `p` is built by lib/import.ts; categories are referenced by (kind, name).
-- Runs as the caller, so row-level security still applies to every insert.
create or replace function public.import_sheet(p jsonb, hide_unused_starters boolean default true)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  r jsonb;
  cat uuid;
  parent uuid;
  new_id uuid;
  n_categories int := 0;
  n_expenses int := 0;
  n_income int := 0;
  n_recurring int := 0;
  n_recurring_payments int := 0;
  n_installments int := 0;
  n_installment_payments int := 0;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  -- Categories: create or refresh by (kind, name).
  for r in select * from jsonb_array_elements(coalesce(p -> 'categories', '[]')) loop
    insert into public.categories (user_id, kind, name, emoji, color, budget, archived, sort_order)
    values (
      uid, r ->> 'kind', r ->> 'name', coalesce(r ->> 'emoji', '📦'), coalesce(r ->> 'color', 'violet'),
      (r ->> 'budget')::numeric, coalesce((r ->> 'archived')::boolean, false), coalesce((r ->> 'sort')::int, 0)
    )
    on conflict (user_id, kind, name) do update
      set emoji = excluded.emoji, color = excluded.color, budget = excluded.budget,
          archived = excluded.archived, sort_order = excluded.sort_order;
    n_categories := n_categories + 1;
  end loop;

  -- Expenses
  for r in select * from jsonb_array_elements(coalesce(p -> 'expenses', '[]')) loop
    select id into cat from public.categories where user_id = uid and kind = 'expense' and name = r ->> 'category';
    insert into public.expenses (user_id, category_id, amount, note, spent_on, created_at, import_key)
    values (uid, cat, (r ->> 'amount')::numeric, nullif(r ->> 'note', ''), (r ->> 'date')::date,
            coalesce((r ->> 'created_at')::timestamptz, now()), r ->> 'key')
    on conflict (user_id, import_key) do nothing;
    if found then n_expenses := n_expenses + 1; end if;
  end loop;

  -- Income
  for r in select * from jsonb_array_elements(coalesce(p -> 'income', '[]')) loop
    select id into cat from public.categories where user_id = uid and kind = 'income' and name = r ->> 'category';
    insert into public.income (user_id, category_id, amount, note, received_on, created_at, import_key)
    values (uid, cat, (r ->> 'amount')::numeric, nullif(r ->> 'note', ''), (r ->> 'date')::date,
            coalesce((r ->> 'created_at')::timestamptz, now()), r ->> 'key')
    on conflict (user_id, import_key) do nothing;
    if found then n_income := n_income + 1; end if;
  end loop;

  -- Recurring bills
  for r in select * from jsonb_array_elements(coalesce(p -> 'recurring', '[]')) loop
    select id into cat from public.categories where user_id = uid and kind = 'expense' and name = r ->> 'category';
    insert into public.recurring (user_id, category_id, name, amount, frequency, next_due, active, import_key)
    values (uid, cat, r ->> 'name', (r ->> 'amount')::numeric, r ->> 'frequency', (r ->> 'next_due')::date,
            coalesce((r ->> 'active')::boolean, true), r ->> 'key')
    on conflict (user_id, import_key) do nothing;
    if found then n_recurring := n_recurring + 1; end if;
  end loop;

  -- Paid bills → an expense plus a recurring_payments row linking it to its bill.
  for r in select * from jsonb_array_elements(coalesce(p -> 'recurring_payments', '[]')) loop
    select id into cat from public.categories where user_id = uid and kind = 'expense' and name = r ->> 'category';
    select id into parent from public.recurring where user_id = uid and import_key = r ->> 'parent_key';
    new_id := null;
    insert into public.expenses (user_id, category_id, amount, note, spent_on, created_at, import_key)
    values (uid, cat, (r ->> 'amount')::numeric, nullif(r ->> 'note', ''), (r ->> 'date')::date,
            coalesce((r ->> 'created_at')::timestamptz, now()), r ->> 'key')
    on conflict (user_id, import_key) do nothing
    returning id into new_id;
    if new_id is not null then
      n_expenses := n_expenses + 1;
      if parent is not null then
        insert into public.recurring_payments (user_id, recurring_id, due_on, amount, expense_id)
        values (uid, parent, (r ->> 'date')::date, (r ->> 'amount')::numeric, new_id)
        on conflict (recurring_id, due_on) do nothing;
        if found then n_recurring_payments := n_recurring_payments + 1; end if;
      end if;
    end if;
  end loop;

  -- Installments
  for r in select * from jsonb_array_elements(coalesce(p -> 'installments', '[]')) loop
    select id into cat from public.categories where user_id = uid and kind = 'expense' and name = r ->> 'category';
    insert into public.installments (user_id, category_id, name, total_amount, monthly_amount, months_total, first_due, note, import_key)
    values (uid, cat, r ->> 'name', (r ->> 'total')::numeric, (r ->> 'monthly')::numeric, (r ->> 'months')::int,
            (r ->> 'first_due')::date, nullif(r ->> 'note', ''), r ->> 'key')
    on conflict (user_id, import_key) do nothing;
    if found then n_installments := n_installments + 1; end if;
  end loop;

  -- Paid installments → an expense plus an installment_payments row.
  for r in select * from jsonb_array_elements(coalesce(p -> 'installment_payments', '[]')) loop
    select id into cat from public.categories where user_id = uid and kind = 'expense' and name = r ->> 'category';
    select id into parent from public.installments where user_id = uid and import_key = r ->> 'parent_key';
    new_id := null;
    insert into public.expenses (user_id, category_id, amount, note, spent_on, created_at, import_key)
    values (uid, cat, (r ->> 'amount')::numeric, nullif(r ->> 'note', ''), (r ->> 'date')::date,
            coalesce((r ->> 'created_at')::timestamptz, now()), r ->> 'key')
    on conflict (user_id, import_key) do nothing
    returning id into new_id;
    if new_id is not null then
      n_expenses := n_expenses + 1;
      if parent is not null then
        insert into public.installment_payments (user_id, installment_id, seq, due_on, amount, expense_id)
        values (uid, parent, (r ->> 'seq')::int, (r ->> 'date')::date, (r ->> 'amount')::numeric, new_id)
        on conflict (installment_id, seq) do nothing;
        if found then n_installment_payments := n_installment_payments + 1; end if;
      end if;
    end if;
  end loop;

  -- "Recent" should reflect when categories were really used, not the import time.
  update public.categories c
     set last_used_at = s.last_used
    from (
      select category_id, max(created_at) as last_used
        from (
          select category_id, created_at from public.expenses where user_id = uid
          union all
          select category_id, created_at from public.income where user_id = uid
        ) x
       where category_id is not null
       group by category_id
    ) s
   where c.id = s.category_id and c.user_id = uid;

  -- Hide Wally's starter categories the sheet doesn't use (and nothing points at).
  if hide_unused_starters then
    update public.categories c
       set archived = true
     where c.user_id = uid
       and c.name in ('Groceries', 'Dining out', 'Transport', 'Bills', 'Home', 'Shopping', 'Health', 'Fun', 'Coffee',
                      'Subscriptions', 'Education', 'Gifts', 'Travel', 'Personal care', 'Other', 'Salary', 'Freelance',
                      'Gift')
       and not exists (
         select 1 from jsonb_array_elements(coalesce(p -> 'categories', '[]')) pc
          where pc ->> 'kind' = c.kind and pc ->> 'name' = c.name
       )
       and not exists (select 1 from public.expenses e where e.category_id = c.id)
       and not exists (select 1 from public.income i where i.category_id = c.id)
       and not exists (select 1 from public.recurring rr where rr.category_id = c.id)
       and not exists (select 1 from public.installments ii where ii.category_id = c.id);
  end if;

  return jsonb_build_object(
    'categories', n_categories,
    'expenses', n_expenses,
    'income', n_income,
    'recurring', n_recurring,
    'recurring_payments', n_recurring_payments,
    'installments', n_installments,
    'installment_payments', n_installment_payments
  );
end $$;
