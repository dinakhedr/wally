"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { addMonths, nextOccurrence, type Frequency } from "@/lib/plans";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FREQUENCIES: Frequency[] = ["weekly", "monthly", "quarterly", "yearly"];

export type FormState = { error?: string } | null;

const amountOf = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

function done(path: string): never {
  revalidatePath("/", "layout");
  redirect(path);
}

// ─── Bills ───────────────────────────────────────────────────────────────────

export async function saveBill(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const amount = amountOf(form.get("amount"));
  const frequency = String(form.get("frequency")) as Frequency;
  const nextDue = String(form.get("next_due") ?? "");
  const categoryId = String(form.get("category_id") ?? "") || null;

  if (!name) return { error: "Give the bill a name." };
  if (!(amount > 0)) return { error: "Enter an amount above zero." };
  if (!FREQUENCIES.includes(frequency)) return { error: "Pick how often it repeats." };
  if (!ISO_DATE.test(nextDue)) return { error: "Pick the next due date." };

  const row = { name, amount, frequency, next_due: nextDue, category_id: categoryId };
  const { error } = id
    ? await supabase.from("recurring").update(row).eq("id", id)
    : await supabase.from("recurring").insert(row);
  if (error) return { error: "Couldn’t save. Please try again." };
  done("/plans");
}

export async function deleteBill(form: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("recurring").delete().eq("id", String(form.get("id") ?? ""));
  done("/plans");
}

export async function setBillActive(form: FormData) {
  const { supabase } = await requireUser();
  await supabase
    .from("recurring")
    .update({ active: form.get("active") === "true" })
    .eq("id", String(form.get("id") ?? ""));
  done("/plans");
}

/** Records the bill's next occurrence as paid (or skipped) and moves it on. */
export async function settleBill(form: FormData) {
  const { supabase } = await requireUser();
  const id = String(form.get("id") ?? "");
  const status = form.get("status") === "skipped" ? "skipped" : "paid";
  const { data: bill } = await supabase.from("recurring").select("amount, frequency, next_due").eq("id", id).single();
  if (!bill) done("/plans");

  await supabase
    .from("recurring_payments")
    .upsert(
      { recurring_id: id, due_on: bill.next_due, amount: status === "paid" ? bill.amount : 0, status },
      { onConflict: "recurring_id,due_on", ignoreDuplicates: true },
    );
  await supabase
    .from("recurring")
    .update({ next_due: nextOccurrence(bill.next_due, bill.frequency as Frequency) })
    .eq("id", id);
  done(String(form.get("back") ?? "/plans"));
}

/** Undo the most recent payment of a bill: deletes it and moves next_due back. */
export async function undoBillPayment(form: FormData) {
  const { supabase } = await requireUser();
  const paymentId = String(form.get("payment_id") ?? "");
  const { data: payment } = await supabase.from("recurring_payments").select("recurring_id, due_on").eq("id", paymentId).single();
  if (payment) {
    await supabase.from("recurring_payments").delete().eq("id", paymentId);
    await supabase.from("recurring").update({ next_due: payment.due_on }).eq("id", payment.recurring_id);
  }
  done(String(form.get("back") ?? "/plans"));
}

// ─── Installments ────────────────────────────────────────────────────────────

export async function saveInstallment(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const note = String(form.get("note") ?? "").trim().slice(0, 200) || null;
  const total = amountOf(form.get("total_amount"));
  const months = Math.round(Number(form.get("months_total")));
  const monthlyRaw = String(form.get("monthly_amount") ?? "").trim();
  const monthly = monthlyRaw ? amountOf(monthlyRaw) : Math.round((total / months) * 100) / 100;
  const firstDue = String(form.get("first_due") ?? "");
  const alreadyPaid = Math.max(0, Math.round(Number(form.get("already_paid") ?? 0)) || 0);

  if (!name) return { error: "Give the installment a name." };
  if (!(total > 0)) return { error: "Enter the total amount." };
  if (!(months >= 1 && months <= 600)) return { error: "Enter how many months (1–600)." };
  if (!(monthly > 0)) return { error: "Enter the monthly amount." };
  if (!ISO_DATE.test(firstDue)) return { error: "Pick the first payment date." };

  const row = { name, note, total_amount: total, monthly_amount: monthly, months_total: months, first_due: firstDue };

  if (id) {
    const { error } = await supabase.from("installments").update(row).eq("id", id);
    if (error) return { error: "Couldn’t save. Please try again." };
    done("/plans?tab=installments");
  }

  const { data: created, error } = await supabase.from("installments").insert(row).select("id").single();
  if (error || !created) return { error: "Couldn’t save. Please try again." };

  // Months already paid before adding it to Wally.
  const paid = Math.min(alreadyPaid, months);
  if (paid > 0) {
    await supabase.from("installment_payments").insert(
      Array.from({ length: paid }, (_, i) => ({
        installment_id: created.id,
        seq: i + 1,
        due_on: addMonths(firstDue, i),
        amount: monthly,
      })),
    );
  }
  done("/plans?tab=installments");
}

export async function deleteInstallment(form: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("installments").delete().eq("id", String(form.get("id") ?? ""));
  done("/plans?tab=installments");
}

/** Marks the earliest unpaid month of an installment as paid. */
export async function payInstallment(form: FormData) {
  const { supabase } = await requireUser();
  const id = String(form.get("id") ?? "");
  const { data: plan } = await supabase
    .from("installments")
    .select("monthly_amount, months_total, first_due, payments:installment_payments(seq)")
    .eq("id", id)
    .single();
  if (plan) {
    const paid = new Set((plan.payments ?? []).map((p: { seq: number }) => p.seq));
    let seq = 1;
    while (paid.has(seq)) seq++;
    if (seq <= plan.months_total) {
      await supabase.from("installment_payments").insert({
        installment_id: id,
        seq,
        due_on: addMonths(plan.first_due, seq - 1),
        amount: plan.monthly_amount,
      });
    }
  }
  done(String(form.get("back") ?? "/plans?tab=installments"));
}

/** Removes the latest paid month of an installment. */
export async function undoInstallmentPayment(form: FormData) {
  const { supabase } = await requireUser();
  const id = String(form.get("id") ?? "");
  const { data: last } = await supabase
    .from("installment_payments")
    .select("id")
    .eq("installment_id", id)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last) await supabase.from("installment_payments").delete().eq("id", last.id);
  done(String(form.get("back") ?? "/plans?tab=installments"));
}
