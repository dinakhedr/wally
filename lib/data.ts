import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillPayment, InstallmentPayment } from "./insights";
import type { InstallmentRow } from "./plans";
import type { Category, Entry, Kind, Profile, Recurring } from "./types";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const CATEGORY_COLS = "id, kind, name, emoji, color, budget, sort_order, archived, last_used_at";

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<Profile> {
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, currency, monthly_budget, week_starts_on")
    .eq("id", userId)
    .maybeSingle();
  return {
    id: userId,
    display_name: data?.display_name ?? null,
    avatar_url: data?.avatar_url ?? null,
    currency: data?.currency ?? "EGP",
    monthly_budget: data?.monthly_budget == null ? null : Number(data.monthly_budget),
    week_starts_on: data?.week_starts_on ?? 6,
  };
}

export async function getCategories(supabase: SupabaseClient, kind?: Kind): Promise<Category[]> {
  let q = supabase.from("categories").select(CATEGORY_COLS).eq("archived", false).order("sort_order");
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  return (data ?? []).map((c: Row) => ({ ...c, budget: c.budget == null ? null : Number(c.budget) }) as Category);
}

/** Most recently used first, then the user's own ordering. */
export function sortByRecent(categories: Category[]) {
  return [...categories].sort((a, b) => {
    if (a.last_used_at && b.last_used_at) return b.last_used_at.localeCompare(a.last_used_at);
    if (a.last_used_at) return -1;
    if (b.last_used_at) return 1;
    return a.sort_order - b.sort_order;
  });
}

type EntryFilter = { from?: string; to?: string; kind?: Kind | "all"; search?: string; limit?: number };

export async function getEntries(supabase: SupabaseClient, f: EntryFilter = {}): Promise<Entry[]> {
  const kind = f.kind ?? "all";
  const limit = f.limit ?? 500;

  const fetch = async (table: "expenses" | "income", dateCol: "spent_on" | "received_on", k: Kind) => {
    let q = supabase
      .from(table)
      .select(`id, amount, note, ${dateCol}, created_at, category:categories(name, emoji, color)`)
      .order(dateCol, { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (f.from) q = q.gte(dateCol, f.from);
    if (f.to) q = q.lte(dateCol, f.to);
    const { data } = await q;
    return (data ?? []).map(
      (r: Row): Entry => ({
        id: r.id,
        kind: k,
        amount: Number(r.amount),
        note: r.note,
        date: r[dateCol],
        created_at: r.created_at,
        category: r.category ?? null,
      }),
    );
  };

  const [expenses, income] = await Promise.all([
    kind === "income" ? [] : fetch("expenses", "spent_on", "expense"),
    kind === "expense" ? [] : fetch("income", "received_on", "income"),
  ]);

  let entries = [...expenses, ...income].sort(
    (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at),
  );

  if (f.search) {
    const s = f.search.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.note?.toLowerCase().includes(s) ||
        e.category?.name.toLowerCase().includes(s) ||
        String(e.amount).includes(s),
    );
  }

  return entries.slice(0, limit);
}

export function totals(entries: Entry[]) {
  let spent = 0;
  let earned = 0;
  for (const e of entries) {
    if (e.kind === "expense") spent += e.amount;
    else earned += e.amount;
  }
  return { spent, earned };
}

export async function getUpcomingBills(supabase: SupabaseClient, until: string, limit = 5): Promise<Recurring[]> {
  const { data } = await supabase
    .from("recurring")
    .select("id, name, amount, frequency, next_due, category:categories(name, emoji, color)")
    .eq("active", true)
    .lte("next_due", until)
    .order("next_due")
    .limit(limit);
  return (data ?? []).map((r: Row) => ({ ...r, amount: Number(r.amount) }) as Recurring);
}

/** Bill and installment payments made between two dates (inclusive). */
export async function getPlanPayments(supabase: SupabaseClient, from: string, to: string) {
  const [bills, installments] = await Promise.all([
    supabase.from("recurring_payments").select("amount").eq("status", "paid").gte("due_on", from).lte("due_on", to),
    supabase.from("installment_payments").select("amount").gte("due_on", from).lte("due_on", to),
  ]);
  const sum = (rows: { amount: number | string }[] | null) => (rows ?? []).reduce((n, r) => n + Number(r.amount), 0);
  return { bills: sum(bills.data), installments: sum(installments.data) };
}

export type Bill = {
  id: string;
  name: string;
  amount: number;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  next_due: string;
  end_date: string | null;
  active: boolean;
  category_id: string | null;
  category: Pick<Category, "name" | "emoji" | "color"> | null;
  payments: { id: string; due_on: string; amount: number; status: "paid" | "skipped" }[];
};

export async function getBills(supabase: SupabaseClient): Promise<Bill[]> {
  const { data } = await supabase
    .from("recurring")
    .select(
      "id, name, amount, frequency, next_due, end_date, active, category_id, category:categories(name, emoji, color), payments:recurring_payments(id, due_on, amount, status)",
    )
    .order("next_due");
  return (data ?? []).map((b: Row) => ({
    ...b,
    amount: Number(b.amount),
    payments: (b.payments ?? []).map((p: Row) => ({ ...p, amount: Number(p.amount) })),
  })) as Bill[];
}

export async function getInstallments(supabase: SupabaseClient): Promise<InstallmentRow[]> {
  const { data } = await supabase
    .from("installments")
    .select("id, name, note, total_amount, monthly_amount, months_total, first_due, payments:installment_payments(seq, due_on, amount)")
    .order("first_due");
  return (data ?? []).map((i: Row) => ({
    ...i,
    total_amount: Number(i.total_amount),
    monthly_amount: Number(i.monthly_amount),
    payments: (i.payments ?? []).map((p: Row) => ({ ...p, amount: Number(p.amount) })),
  })) as InstallmentRow[];
}

/** Paid bill payments in a date range, with the bill's name and category. */
export async function getBillPayments(supabase: SupabaseClient, from: string, to: string): Promise<BillPayment[]> {
  const { data } = await supabase
    .from("recurring_payments")
    .select("amount, due_on, bill:recurring(name, category:categories(name, emoji, color))")
    .eq("status", "paid")
    .gte("due_on", from)
    .lte("due_on", to);
  return (data ?? []).map((p: Row) => ({
    amount: Number(p.amount),
    due_on: p.due_on,
    name: p.bill?.name ?? "Bill",
    category: p.bill?.category ?? null,
  }));
}

export async function getInstallmentPayments(supabase: SupabaseClient, from: string, to: string): Promise<InstallmentPayment[]> {
  const { data } = await supabase.from("installment_payments").select("amount, due_on").gte("due_on", from).lte("due_on", to);
  return (data ?? []).map((p: Row) => ({ amount: Number(p.amount), due_on: p.due_on }));
}

export type Goal = { id: string; name: string; emoji: string; target: number; saved: number; target_date: string | null };

export async function getGoals(supabase: SupabaseClient): Promise<Goal[]> {
  const { data } = await supabase.from("goals").select("id, name, emoji, target, saved, target_date").order("created_at");
  return (data ?? []).map((g: Row) => ({ ...g, target: Number(g.target), saved: Number(g.saved) })) as Goal[];
}
