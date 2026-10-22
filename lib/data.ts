import type { SupabaseClient } from "@supabase/supabase-js";
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
