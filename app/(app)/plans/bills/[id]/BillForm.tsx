"use client";

import { useActionState } from "react";
import { saveBill, type FormState } from "@/app/plans-actions";
import { Field, inputClass } from "@/components/forms/Field";
import type { Bill } from "@/lib/data";
import { FREQUENCY_LABEL } from "@/lib/plans";
import type { Category } from "@/lib/types";

export function BillForm({ bill, categories, today }: { bill: Bill | null; categories: Category[]; today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveBill, null);
  return (
    <form action={action} className="space-y-4 rounded-3xl bg-card p-5 ring-1 ring-line">
      {bill && <input type="hidden" name="id" value={bill.id} />}
      <Field label="Name">
        <input name="name" required maxLength={60} defaultValue={bill?.name} placeholder="e.g. Netflix" className={inputClass} />
      </Field>
      <Field label="Amount">
        <input name="amount" required inputMode="decimal" defaultValue={bill?.amount} placeholder="0" className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Repeats">
          <select name="frequency" defaultValue={bill?.frequency ?? "monthly"} className={inputClass}>
            {Object.entries(FREQUENCY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Next due">
          <input type="date" name="next_due" required defaultValue={bill?.next_due ?? today} className={inputClass} />
        </Field>
      </div>
      <Field label="Category">
        <select name="category_id" defaultValue={bill?.category_id ?? ""} className={inputClass}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </Field>
      {state?.error && <p className="text-sm font-semibold text-coral">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-2xl bg-violet py-4 font-bold text-white disabled:opacity-60">
        {pending ? "Saving…" : bill ? "Save changes" : "Add bill"}
      </button>
    </form>
  );
}
