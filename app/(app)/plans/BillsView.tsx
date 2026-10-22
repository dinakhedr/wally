import Link from "next/link";
import { Check, ChevronDown, Pause, Plus, Undo2 } from "lucide-react";
import { settleBill, undoBillPayment } from "@/app/plans-actions";
import { Card } from "@/components/Card";
import { CategoryBubble } from "@/components/CategoryBubble";
import type { Bill } from "@/lib/data";
import { dueLabel, formatMoney, parseISODate } from "@/lib/format";
import { FREQUENCY_LABEL, lastDayOfMonth, monthLabel, monthOf, monthsAhead, occurrences } from "@/lib/plans";

type Line =
  | { kind: "due"; bill: Bill; date: string; payable: boolean }
  | { kind: "paid"; bill: Bill; date: string; amount: number; skipped: boolean; paymentId: string; undoable: boolean };

const shortDate = (iso: string) => parseISODate(iso).toLocaleDateString("en", { day: "numeric", month: "short" });

export function BillsView({ bills, today, currency }: { bills: Bill[]; today: string; currency: string }) {
  const thisMonth = monthOf(today);
  const months = monthsAhead(today, 12);
  const until = lastDayOfMonth(months[months.length - 1]);
  const endOfThisMonth = lastDayOfMonth(thisMonth);

  const active = bills.filter((b) => b.active);
  const paused = bills.filter((b) => !b.active);

  const byMonth = new Map<string, Line[]>(months.map((m) => [m, []]));
  for (const bill of active) {
    // Paid (or skipped) this month
    const latest = [...bill.payments].sort((a, b) => b.due_on.localeCompare(a.due_on))[0];
    for (const p of bill.payments.filter((p) => monthOf(p.due_on) === thisMonth)) {
      byMonth.get(thisMonth)!.push({
        kind: "paid",
        bill,
        date: p.due_on,
        amount: p.amount,
        skipped: p.status === "skipped",
        paymentId: p.id,
        undoable: p.id === latest?.id,
      });
    }
    // Still to pay; anything overdue shows in this month.
    for (const date of occurrences(bill.next_due, bill.frequency, until)) {
      if (bill.end_date && date > bill.end_date) break;
      const month = monthOf(date) < thisMonth ? thisMonth : monthOf(date);
      byMonth.get(month)?.push({ kind: "due", bill, date, payable: date === bill.next_due && date <= endOfThisMonth });
    }
  }
  // Still-to-pay first (by date), then what's already paid.
  for (const lines of byMonth.values())
    lines.sort((a, b) => (a.kind === b.kind ? a.date.localeCompare(b.date) : a.kind === "due" ? -1 : 1));

  const current = byMonth.get(thisMonth)!;
  const monthTotal = (lines: Line[]) =>
    lines.reduce((n, l) => n + (l.kind === "paid" ? l.amount : l.bill.amount), 0);
  const paidSoFar = current.reduce((n, l) => n + (l.kind === "paid" ? l.amount : 0), 0);
  const leftThisMonth = current.reduce((n, l) => n + (l.kind === "due" ? l.bill.amount : 0), 0);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-sky-soft p-5">
        <p className="text-sm font-semibold text-sky">{monthLabel(thisMonth)} bills</p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums">{formatMoney(monthTotal(current), currency)}</p>
        <p className="mt-1 text-sm text-muted">
          Paid {formatMoney(paidSoFar, currency)} · Left {formatMoney(leftThisMonth, currency)}
        </p>
      </section>

      <Link
        href="/plans/bills/new"
        className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3.5 font-bold text-violet ring-1 ring-line"
      >
        <Plus size={18} /> Add a bill
      </Link>

      {!active.length && !paused.length && (
        <p className="py-8 text-center text-muted">No bills yet. Add rent, subscriptions or anything that repeats.</p>
      )}

      {active.length > 0 && current.length > 0 && (
        <Card className="!p-4">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="font-bold">{monthLabel(thisMonth)}</h2>
            <span className="text-sm font-bold tabular-nums text-muted">{formatMoney(monthTotal(current), currency)}</span>
          </div>
          <ul className="mt-1 divide-y divide-line">
            {current.map((l) => (
              <BillLine key={`${l.kind}-${l.bill.id}-${l.date}`} line={l} currency={currency} today={today} />
            ))}
          </ul>
        </Card>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-muted">Coming months</h2>
          <div className="space-y-2">
            {months.slice(1).map((month) => {
              const lines = byMonth.get(month)!;
              if (!lines.length) return null;
              return (
                <details key={month} className="group rounded-3xl bg-card px-4 ring-1 ring-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5">
                    <span className="font-bold">
                      {monthLabel(month, { year: month.slice(0, 4) !== thisMonth.slice(0, 4) })}
                      <span className="ml-2 text-xs font-semibold text-muted">
                        {lines.length} bill{lines.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-bold tabular-nums">{formatMoney(monthTotal(lines), currency)}</span>
                      <ChevronDown size={18} className="text-muted transition group-open:rotate-180" />
                    </span>
                  </summary>
                  <ul className="divide-y divide-line border-t border-line">
                    {lines.map((l) => (
                      <BillLine key={`${l.kind}-${l.bill.id}-${l.date}`} line={l} currency={currency} today={today} />
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </section>
      )}

      {paused.length > 0 && (
        <Card className="!p-4">
          <h2 className="flex items-center gap-2 px-1 font-bold text-muted">
            <Pause size={16} /> Paused
          </h2>
          <ul className="mt-1 divide-y divide-line">
            {paused.map((b) => (
              <li key={b.id}>
                <Link href={`/plans/bills/${b.id}`} className="flex items-center gap-3 py-3 opacity-70">
                  <CategoryBubble emoji={b.category?.emoji ?? "🔁"} color={b.category?.color ?? "sky"} size="sm" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{b.name}</span>
                  <span className="tabular-nums">{formatMoney(b.amount, currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function BillLine({ line, currency, today }: { line: Line; currency: string; today: string }) {
  const { bill } = line;
  const overdue = line.kind === "due" && line.date < today;
  return (
    <li className="flex items-center gap-3 py-3">
      <Link href={`/plans/bills/${bill.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <CategoryBubble emoji={bill.category?.emoji ?? "🔁"} color={bill.category?.color ?? "sky"} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{bill.name}</span>
          <span className={`block text-xs ${overdue ? "font-semibold text-coral" : "text-muted"}`}>
            {line.kind === "paid"
              ? `${line.skipped ? "Skipped" : "Paid"} · ${shortDate(line.date)}`
              : `${line.payable ? dueLabel(line.date) : shortDate(line.date)} · ${FREQUENCY_LABEL[bill.frequency]}`}
          </span>
        </span>
      </Link>
      <span className={`shrink-0 font-bold tabular-nums ${line.kind === "paid" ? "text-muted" : ""}`}>
        {formatMoney(line.kind === "paid" ? line.amount : bill.amount, currency)}
      </span>
      {line.kind === "due" && line.payable && (
        <form action={settleBill}>
          <input type="hidden" name="id" value={bill.id} />
          <button
            aria-label={`Mark ${bill.name} paid`}
            className="flex items-center gap-1 rounded-full bg-mint px-3 py-1.5 text-xs font-bold text-white"
          >
            <Check size={14} strokeWidth={3} /> Pay
          </button>
        </form>
      )}
      {line.kind === "paid" && line.undoable && (
        <form action={undoBillPayment}>
          <input type="hidden" name="payment_id" value={line.paymentId} />
          <button aria-label={`Undo ${bill.name} payment`} className="rounded-full p-1.5 text-muted">
            <Undo2 size={16} />
          </button>
        </form>
      )}
    </li>
  );
}
