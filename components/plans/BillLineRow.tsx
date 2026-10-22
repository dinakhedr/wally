import Link from "next/link";
import { Check, Undo2 } from "lucide-react";
import { settleBill, undoBillPayment } from "@/app/plans-actions";
import { CategoryBubble } from "@/components/CategoryBubble";
import { dueLabel, formatMoney, parseISODate } from "@/lib/format";
import { FREQUENCY_LABEL } from "@/lib/plans";
import type { BillLine } from "@/lib/schedule";

const shortDate = (iso: string) => parseISODate(iso).toLocaleDateString("en", { day: "numeric", month: "short" });

export function BillLineRow({ line, currency, today, back }: { line: BillLine; currency: string; today: string; back: string }) {
  const { bill } = line;
  const overdue = line.kind === "due" && line.date < today;
  const soon = line.kind === "due" && line.date === bill.next_due && !line.payable;
  return (
    <li className="flex items-center gap-3 py-3">
      <Link href={`/plans/bills/${bill.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <CategoryBubble emoji={bill.category?.emoji ?? "🔁"} color={bill.category?.color ?? "sky"} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{bill.name}</span>
          <span className={`block text-xs ${overdue ? "font-semibold text-coral" : "text-muted"}`}>
            {line.kind === "paid"
              ? `${line.skipped ? "Skipped" : "Paid"} · ${shortDate(line.date)}`
              : `${line.payable || soon ? dueLabel(line.date) : shortDate(line.date)} · ${FREQUENCY_LABEL[bill.frequency]}`}
          </span>
        </span>
      </Link>
      <span className={`shrink-0 font-bold tabular-nums ${line.kind === "paid" ? "text-muted" : ""}`}>
        {formatMoney(line.kind === "paid" ? line.amount : bill.amount, currency)}
      </span>
      {line.kind === "due" && line.payable && (
        <form action={settleBill}>
          <input type="hidden" name="id" value={bill.id} />
          <input type="hidden" name="back" value={back} />
          <button aria-label={`Mark ${bill.name} paid`} className="flex items-center gap-1 rounded-full bg-mint px-3 py-1.5 text-xs font-bold text-white">
            <Check size={14} strokeWidth={3} /> Pay
          </button>
        </form>
      )}
      {line.kind === "paid" && line.undoable && (
        <form action={undoBillPayment}>
          <input type="hidden" name="payment_id" value={line.paymentId} />
          <input type="hidden" name="back" value={back} />
          <button aria-label={`Undo ${bill.name} payment`} className="rounded-full p-1.5 text-muted">
            <Undo2 size={16} />
          </button>
        </form>
      )}
    </li>
  );
}
