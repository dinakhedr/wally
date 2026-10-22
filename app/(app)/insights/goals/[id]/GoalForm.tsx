"use client";

import { useActionState } from "react";
import { saveGoal, type GoalState } from "@/app/goals-actions";
import { Field, inputClass } from "@/components/forms/Field";
import type { Goal } from "@/lib/data";

export function GoalForm({ goal, currency }: { goal: Goal | null; currency: string }) {
  const [state, action, pending] = useActionState<GoalState, FormData>(saveGoal, null);
  return (
    <form action={action} className="space-y-4 rounded-3xl bg-card p-5 ring-1 ring-line">
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <div className="grid grid-cols-[5rem_1fr] gap-3">
        <Field label="Emoji">
          <input name="emoji" maxLength={8} defaultValue={goal?.emoji ?? "🎯"} className={`${inputClass} text-center text-xl`} />
        </Field>
        <Field label="Goal">
          <input name="name" required maxLength={60} defaultValue={goal?.name} placeholder="e.g. Emergency fund" className={inputClass} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Target (${currency})`}>
          <input name="target" required inputMode="decimal" defaultValue={goal?.target} placeholder="60000" className={inputClass} />
        </Field>
        <Field label={`Saved so far (${currency})`}>
          <input name="saved" inputMode="decimal" defaultValue={goal?.saved ?? 0} className={inputClass} />
        </Field>
      </div>
      <Field label="Target date" hint="Optional">
        <input type="date" name="target_date" defaultValue={goal?.target_date ?? ""} className={inputClass} />
      </Field>
      {state?.error && <p className="text-sm font-semibold text-coral">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-2xl bg-violet py-4 font-bold text-white disabled:opacity-60">
        {pending ? "Saving…" : goal ? "Save changes" : "Add goal"}
      </button>
    </form>
  );
}
