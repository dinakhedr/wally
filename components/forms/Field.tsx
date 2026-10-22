/** Labelled form field shell shared by the plan, goal and category forms. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      {hint && <span className="block text-xs text-muted">{hint}</span>}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

export const inputClass =
  "w-full rounded-2xl bg-card-2 px-4 py-3 outline-none placeholder:text-muted focus:ring-2 focus:ring-violet";
