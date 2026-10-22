"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import type { Tint } from "@/lib/types";

export type CategoryState = { error?: string } | null;

const TINTS: Tint[] = ["violet", "coral", "mint", "sun", "sky"];
const BACK = "/settings/categories";

export async function saveCategory(_prev: CategoryState, form: FormData): Promise<CategoryState> {
  const { supabase } = await requireUser();
  const id = String(form.get("id") ?? "");
  const kind = form.get("kind") === "income" ? "income" : "expense";
  const name = String(form.get("name") ?? "").trim().slice(0, 40);
  const emoji = String(form.get("emoji") ?? "").trim().slice(0, 8) || "📦";
  const color = String(form.get("color")) as Tint;
  const budgetRaw = String(form.get("budget") ?? "").replace(/,/g, "").trim();
  const budget = budgetRaw === "" ? null : Number(budgetRaw);

  if (!name) return { error: "Give the category a name." };
  if (!TINTS.includes(color)) return { error: "Pick a colour." };
  if (budget !== null && !(Number.isFinite(budget) && budget >= 0)) return { error: "Budget must be a number." };

  // Names are unique per kind, ignoring case.
  const { data: clash } = await supabase.from("categories").select("id").eq("kind", kind).ilike("name", name.replace(/[%_\\]/g, "\\$&"));
  if ((clash ?? []).some((c) => c.id !== id)) return { error: `You already have a category called “${name}”.` };

  const row = { name, emoji, color, budget: kind === "expense" ? budget : null };
  const { error } = id
    ? await supabase.from("categories").update(row).eq("id", id)
    : await supabase.from("categories").insert({ ...row, kind, sort_order: 1000 });
  if (error) return { error: "Couldn’t save. Please try again." };
  revalidatePath("/", "layout");
  redirect(BACK);
}

export async function setCategoryArchived(form: FormData) {
  const { supabase } = await requireUser();
  await supabase
    .from("categories")
    .update({ archived: form.get("archived") === "true" })
    .eq("id", String(form.get("id") ?? ""));
  revalidatePath("/", "layout");
  redirect(BACK);
}

/** Deletes a category. Anything that used it keeps its amount but loses the category. */
export async function deleteCategory(form: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("categories").delete().eq("id", String(form.get("id") ?? ""));
  revalidatePath("/", "layout");
  redirect(BACK);
}
