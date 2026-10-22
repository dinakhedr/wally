"use client";

import { useActionState, useState } from "react";
import { saveInstallment, type FormState } from "@/app/plans-actions";
import { Field, inputClass } from "@/components/forms/Field";
import type { InstallmentRow } from "@/lib/plans";

export function InstallmentForm({ plan, today, currency }: { plan: InstallmentRow | null; today: string; currency: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveInstallment, null);
  const [total, setTotal] = useState(plan ? String(plan.total_amount) : "");
  const [months, setMonths] = useState(plan ? String(plan.months_total) : "");
  const suggested = Number(total) > 0 && Number(months) > 0 ? (Number(total) / Number(months)).toFixed(2) : "";

  return (
    <form action={action} className="space-y-4 rounded-3xl bg-card p-5 ring-1 ring-line">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <Field label="What is it?">
        <input name="name" required maxLength={60} defaultValue={plan?.name} placeholder="e.g. iPhone" className={inputClass} />
      </Field>
      <Field label="Bank or shop" hint="Optional">
        <input name="note" maxLength={200} defaultValue={plan?.note ?? ""} placeholder="e.g. CIB" className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Total (${currency})`}>
          <input name="total_amount" required inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0" className={inputClass} />
        </Field>
        <Field label="Months">
          <input name="months_total" required inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} placeholder="12" className={inputClass} />
        </Field>
      </div>
      <Field label={`Monthly payment (${currency})`} hint={suggested ? `Leave empty for ${suggested}` : "Leave empty to split the total evenly"}>
        <input name="monthly_amount" inputMode="decimal" defaultValue={plan?.monthly_amount ?? ""} placeholder={suggested || "0"} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First payment">
          <input type="date" name="first_due" required defaultValue={plan?.first_due ?? today} className={inputClass} />
        </Field>
        {!plan && (
          <Field label="Months already paid">
            <input name="already_paid" inputMode="numeric" defaultValue="0" className={inputClass} />
          </Field>
        )}
      </div>
      {state?.error && <p className="text-sm font-semibold text-coral">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-2xl bg-violet py-4 font-bold text-white disabled:opacity-60">
        {pending ? "Saving…" : plan ? "Save changes" : "Add installment"}
      </button>
    </form>
  );
}
