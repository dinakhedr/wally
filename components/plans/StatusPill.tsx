import { Check } from "lucide-react";

/** Green "Paid" (or grey "Skipped") label for bill and installment rows. */
export function StatusPill({ skipped = false }: { skipped?: boolean }) {
  return skipped ? (
    <span className="rounded-full bg-card-2 px-2 py-0.5 text-[11px] font-bold text-muted">Skipped</span>
  ) : (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-mint-soft px-2 py-0.5 text-[11px] font-bold text-mint-ink">
      <Check size={11} strokeWidth={3} aria-hidden /> Paid
    </span>
  );
}
