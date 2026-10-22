"use client";

import { useActionState } from "react";
import { updateEntry, type AddState } from "@/app/actions";
import { Field, inputClass } from "@/components/forms/Field";
import type { Category, Kind } from "@/lib/types";

type EditableEntry = { id: string; kind: Kind; amount: number; category_id: string | null; date: string; note: string | null };

export function EditEntryForm({ entry, categories, currency }: { entry: EditableEntry; categories: Category[]; currency: string }) {
  const [state, action, pending] = useActionState<AddState, FormData>(updateEntry, null);
  return (
    <form action={action} className="space-y-4 rounded-3xl bg-card p-5 ring-1 ring-line">
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="kind" value={entry.kind} />
      <Field label={`Amount (${currency})`}>
        <input name="amount" required inputMode="decimal" defaultValue={entry.amount} className={`${inputClass} text-2xl font-extrabold`} />
      </Field>
      <Field label="Category">
        <select name="category_id" defaultValue={entry.category_id ?? ""} className={inputClass}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
              {c.archived ? " (hidden)" : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date">
        <input type="date" name="date" required defaultValue={entry.date} className={inputClass} />
      </Field>
      <Field label="Note">
        <input name="note" maxLength={200} defaultValue={entry.note ?? ""} placeholder="Optional" className={inputClass} />
      </Field>
      {state?.error && <p className="text-sm font-semibold text-coral">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-2xl bg-violet py-4 font-bold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
