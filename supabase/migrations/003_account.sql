-- Wally migration 003: "Delete all data" and "Delete account" (Settings).
-- Run once in Supabase → SQL Editor. Safe to re-run.

-- Wipes the signed-in user's money data and categories, then restores the
-- starter categories. Profile settings (currency, budget) are kept.
create or replace function public.reset_my_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  delete from public.expenses where user_id = uid;
  delete from public.income where user_id = uid;
  delete from public.recurring where user_id = uid;      -- cascades to recurring_payments
  delete from public.installments where user_id = uid;   -- cascades to installment_payments
  delete from public.goals where user_id = uid;
  delete from public.categories where user_id = uid;

  perform public.seed_starter_categories(uid);
end $$;

-- Deletes the signed-in user's account. Everything they own is removed by the
-- ON DELETE CASCADE foreign keys to auth.users.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  delete from auth.users where id = uid;
end $$;

revoke execute on function public.reset_my_data() from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.reset_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
