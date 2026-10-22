"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { CURRENCIES } from "@/lib/format";
import type { ImportPayload } from "@/lib/import";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type AddState = { error?: string } | null;

export async function addEntry(_prev: AddState, form: FormData): Promise<AddState> {
  const { supabase } = await requireUser();

  const kind = form.get("kind") === "income" ? "income" : "expense";
  const amount = Number(String(form.get("amount") ?? "").replace(/,/g, ""));
  const categoryId = String(form.get("category_id") ?? "") || null;
  const date = String(form.get("date") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, 200) || null;

  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount above zero." };
  if (amount >= 1e10) return { error: "That amount is too large." };
  if (!categoryId) return { error: "Pick a category." };
  if (!ISO_DATE.test(date)) return { error: "Pick a date." };

  const row = { amount: Math.round(amount * 100) / 100, category_id: categoryId, note };
  const { error } =
    kind === "expense"
      ? await supabase.from("expenses").insert({ ...row, spent_on: date })
      : await supabase.from("income").insert({ ...row, received_on: date });

  if (error) return { error: "Couldn’t save. Please try again." };

  revalidatePath("/", "layout");
  redirect(`/?added=${kind}`);
}

export async function deleteEntry(form: FormData) {
  const { supabase } = await requireUser();
  const id = String(form.get("id") ?? "");
  const table = form.get("kind") === "income" ? "income" : "expenses";
  if (id) await supabase.from(table).delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function updateSettings(form: FormData) {
  const { supabase, user } = await requireUser();
  const currency = String(form.get("currency") ?? "");
  const budgetRaw = String(form.get("monthly_budget") ?? "").replace(/,/g, "").trim();
  const budget = budgetRaw === "" ? null : Number(budgetRaw);

  const patch: Record<string, unknown> = {};
  if (CURRENCIES.includes(currency)) patch.currency = currency;
  if (budget === null || (Number.isFinite(budget) && budget >= 0)) patch.monthly_budget = budget;

  await supabase.from("profiles").update(patch).eq("id", user.id);
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}

export type ImportResult =
  | { ok: true; counts: Record<string, number> }
  | { ok: false; error: string };

const IMPORT_LISTS = [
  "categories",
  "expenses",
  "income",
  "recurring",
  "recurring_payments",
  "installments",
  "installment_payments",
] as const;

export async function importSheet(payload: ImportPayload): Promise<ImportResult> {
  const { supabase } = await requireUser();

  if (!payload || typeof payload !== "object" || IMPORT_LISTS.some((k) => !Array.isArray(payload[k]))) {
    return { ok: false, error: "That file couldn’t be read. Please try again." };
  }
  if (IMPORT_LISTS.reduce((n, k) => n + payload[k].length, 0) > 50_000) {
    return { ok: false, error: "That sheet is too big to import in one go." };
  }

  const { data, error } = await supabase.rpc("import_sheet", { p: payload });
  if (error) {
    console.error("import_sheet failed", error);
    return {
      ok: false,
      // PGRST202: function not found, i.e. migration 002 hasn't been run yet.
      error: error.code === "PGRST202"
        ? "Wally’s database needs a quick update before importing. Run supabase/migrations/002_import.sql in Supabase."
        : "Import failed and nothing was changed. Please try again.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, counts: data as Record<string, number> };
}
