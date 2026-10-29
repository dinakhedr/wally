import Link from "next/link";
import { Check } from "lucide-react";
import { payInstallment } from "@/app/plans-actions";
import { dueLabel, formatMoney, parseISODate } from "@/lib/format";
import type { InstallmentLine } from "@/lib/schedule";
import { StatusPill } from "./StatusPill";

const shortDate = (iso: string) => parseISODate(iso).toLocaleDateString("en", { day: "numeric", month: "short" });

export function InstallmentLineRow({ line, currency, today, back }: { line: InstallmentLine; currency: string; today: string; back: string }) {
  const { plan } = line;
  const overdue = !line.paid && line.date < today;
  return (
    <li className="flex items-center gap-3 py-3">
      <Link href={`/plans/installments/${plan.id}`} className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{plan.name}</span>
        <span className={`mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs ${overdue ? "font-semibold text-coral" : "text-muted"}`}>
          {line.paid && <StatusPill />}
          Month {line.seq} of {plan.months_total} · {line.paid ? shortDate(line.date) : line.payable ? dueLabel(line.date) : shortDate(line.date)}
          {plan.note ? ` · ${plan.note}` : ""}
        </span>
      </Link>
      <span className={`shrink-0 font-bold tabular-nums ${line.paid ? "text-muted" : ""}`}>{formatMoney(line.amount, currency)}</span>
      {line.payable && (
        <form action={payInstallment}>
          <input type="hidden" name="id" value={plan.id} />
          <input type="hidden" name="back" value={back} />
          <button aria-label={`Pay ${plan.name} month ${line.seq}`} className="flex items-center gap-1 rounded-full bg-mint px-3 py-1.5 text-xs font-bold text-white">
            <Check size={14} strokeWidth={3} /> Pay
          </button>
        </form>
      )}
    </li>
  );
}
