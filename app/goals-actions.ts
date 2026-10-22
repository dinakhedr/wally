"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";

export type GoalState = { error?: string } | null;

const amountOf = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

const BACK = "/insights?tab=savings";

export async function saveGoal(_prev: GoalState, form: FormData): Promise<GoalState> {
  const { supabase } = await requireUser();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const emoji = String(form.get("emoji") ?? "").trim().slice(0, 8) || "🎯";
  const target = amountOf(form.get("target"));
  const savedRaw = String(form.get("saved") ?? "").trim();
  const saved = savedRaw ? amountOf(savedRaw) : 0;
  const targetDate = String(form.get("target_date") ?? "") || null;

  if (!name) return { error: "Give the goal a name." };
  if (!(target > 0)) return { error: "Enter a target amount." };
  if (!(saved >= 0)) return { error: "Saved so far can’t be negative." };

  const row = { name, emoji, target, saved, target_date: targetDate };
  const { error } = id ? await supabase.from("goals").update(row).eq("id", id) : await supabase.from("goals").insert(row);
  if (error) return { error: "Couldn’t save. Please try again." };
  revalidatePath("/insights");
  redirect(BACK);
}

/** Adds (or with a minus sign, takes out) money from a goal. */
export async function addToGoal(form: FormData) {
  const { supabase } = await requireUser();
  const id = String(form.get("id") ?? "");
  const delta = amountOf(form.get("amount"));
  if (id && Number.isFinite(delta) && delta !== 0) {
    const { data: goal } = await supabase.from("goals").select("saved").eq("id", id).single();
    if (goal) await supabase.from("goals").update({ saved: Math.max(0, Number(goal.saved) + delta) }).eq("id", id);
  }
  revalidatePath("/insights");
  redirect(BACK);
}

export async function deleteGoal(form: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("goals").delete().eq("id", String(form.get("id") ?? ""));
  revalidatePath("/insights");
  redirect(BACK);
}
