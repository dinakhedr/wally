"use client";

import { useActionState, useState } from "react";
import { saveCategory, type CategoryState } from "@/app/category-actions";
import { CategoryBubble } from "@/components/CategoryBubble";
import { Field, inputClass } from "@/components/forms/Field";
import { TINT } from "@/lib/tint";
import type { Category, Kind, Tint } from "@/lib/types";

const COLORS: Tint[] = ["violet", "coral", "mint", "sun", "sky"];

export function CategoryForm({ category, kind, currency }: { category: Category | null; kind: Kind; currency: string }) {
  const [state, action, pending] = useActionState<CategoryState, FormData>(saveCategory, null);
  const [emoji, setEmoji] = useState(category?.emoji ?? "📦");
  const [color, setColor] = useState<Tint>(category?.color ?? (kind === "income" ? "mint" : "violet"));

  return (
    <form action={action} className="space-y-4 rounded-3xl bg-card p-5 ring-1 ring-line">
      {category && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="color" value={color} />
      <div className="flex justify-center">
        <CategoryBubble emoji={emoji} color={color} size="lg" />
      </div>
      <div className="grid grid-cols-[5rem_1fr] gap-3">
        <Field label="Emoji">
          <input name="emoji" maxLength={8} value={emoji} onChange={(e) => setEmoji(e.target.value)} className={`${inputClass} text-center text-xl`} />
        </Field>
        <Field label="Name">
          <input name="name" required maxLength={40} defaultValue={category?.name} placeholder="e.g. Coffee" className={inputClass} />
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">Colour</legend>
        <div className="mt-2 flex gap-3">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={`h-9 w-9 rounded-full ${TINT[c].bg} ${color === c ? "ring-4 ring-offset-2 ring-offset-card ring-line" : ""}`}
            />
          ))}
        </div>
      </fieldset>
      {kind === "expense" && (
        <Field label={`Monthly budget (${currency})`} hint="Optional. Leave empty for no budget.">
          <input name="budget" inputMode="decimal" defaultValue={category?.budget ?? ""} placeholder="e.g. 3000" className={inputClass} />
        </Field>
      )}
      {state?.error && <p className="text-sm font-semibold text-coral">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-2xl bg-violet py-4 font-bold text-white disabled:opacity-60">
        {pending ? "Saving…" : category ? "Save changes" : "Add category"}
      </button>
    </form>
  );
}
