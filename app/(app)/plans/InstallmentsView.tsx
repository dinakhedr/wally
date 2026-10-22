import Link from "next/link";
import { Check, ChevronRight, Plus, Undo2 } from "lucide-react";
import { payInstallment, undoInstallmentPayment } from "@/app/plans-actions";
import { Card, SectionTitle } from "@/components/Card";
import { formatMoney, parseISODate } from "@/lib/format";
import { installmentStatus, lastDayOfMonth, monthLabel, monthOf, monthsAhead, type InstallmentRow, type InstallmentStatus } from "@/lib/plans";

const monthYear = (iso: string) => parseISODate(iso).toLocaleDateString("en", { month: "short", year: "numeric" });
const shortDate = (iso: string) => parseISODate(iso).toLocaleDateString("en", { day: "numeric", month: "short" });

export function InstallmentsView({ rows, today, currency }: { rows: InstallmentRow[]; today: string; currency: string }) {
  const thisMonth = monthOf(today);
  const endOfThisMonth = lastDayOfMonth(thisMonth);
  const all = rows.map(installmentStatus);
  const active = all.filter((i) => !i.done).sort((a, b) => a.lastDue.localeCompare(b.lastDue));
  const finished = all.filter((i) => i.done);

  const monthly = active.reduce((n, i) => n + i.monthly_amount, 0);
  const remaining = active.reduce((n, i) => n + i.remainingAmount, 0);

  // Coming months: what's due each month, and which plans end then.
  const months = monthsAhead(today, 12);
  const coming = months.map((m) => {
    const due = active.filter((i) => i.unpaid.some((u) => (monthOf(u.due) < thisMonth ? thisMonth : monthOf(u.due)) === m));
    const amount = active.reduce(
      (n, i) => n + i.unpaid.filter((u) => (monthOf(u.due) < thisMonth ? thisMonth : monthOf(u.due)) === m).length * i.monthly_amount,
      0,
    );
    const ending = active.filter((i) => monthOf(i.lastDue) === m);
    return { month: m, amount, count: due.length, ending };
  });
  // Stop after the last month with anything due.
  const lastBusy = coming.map((c) => c.amount > 0).lastIndexOf(true);
  const comingShown = coming.slice(0, lastBusy + 1);
  const peak = Math.max(1, ...coming.map((c) => c.amount));

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-sky-soft p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-sky">Each month</p>
          <p className="mt-1 truncate text-lg font-extrabold tabular-nums">{formatMoney(monthly, currency)}</p>
          <p className="text-xs text-muted">
            {active.length} active plan{active.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-3xl bg-card p-4 ring-1 ring-line">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Left to pay</p>
          <p className="mt-1 truncate text-lg font-extrabold tabular-nums">{formatMoney(Math.round(remaining), currency)}</p>
          <p className="text-xs text-muted">across all plans</p>
        </div>
      </section>

      <Link
        href="/plans/installments/new"
        className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3.5 font-bold text-violet ring-1 ring-line"
      >
        <Plus size={18} /> Add an installment
      </Link>

      {!all.length && <p className="py-8 text-center text-muted">No installments yet. Add a phone, car or loan you pay monthly.</p>}

      {active.map((i) => (
        <PlanCard key={i.id} plan={i} currency={currency} payable={!!i.nextDue && i.nextDue <= endOfThisMonth} today={today} />
      ))}

      {comingShown.length > 0 && (
        <Card>
          <SectionTitle>Coming months</SectionTitle>
          <ul className="space-y-3">
            {comingShown.map((c) => (
              <li key={c.month}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold">{monthLabel(c.month, { year: c.month.slice(0, 4) !== thisMonth.slice(0, 4) })}</span>
                  <span className="font-bold tabular-nums">{formatMoney(c.amount, currency)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-card-2" aria-hidden>
                  <div className="h-full rounded-full bg-sky" style={{ width: `${(c.amount / peak) * 100}%` }} />
                </div>
                {c.ending.map((e) => (
                  <p key={e.id} className="mt-1 text-xs text-muted">
                    🎉 <span className="font-semibold text-ink">{e.name}</span> ends, freeing up{" "}
                    <span className="font-semibold text-ink">{formatMoney(e.monthly_amount, currency)}</span> a month
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {finished.length > 0 && (
        <details className="rounded-3xl bg-card p-4 ring-1 ring-line">
          <summary className="cursor-pointer px-1 font-bold text-muted">Finished ({finished.length})</summary>
          <ul className="mt-2 divide-y divide-line">
            {finished.map((i) => (
              <li key={i.id}>
                <Link href={`/plans/installments/${i.id}`} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{i.name}</span>
                    <span className="block text-xs text-muted">
                      Paid off {monthYear(i.lastDue)}
                      {i.note ? ` · ${i.note}` : ""}
                    </span>
                  </span>
                  <span className="font-bold tabular-nums text-muted">{formatMoney(i.total_amount, currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function PlanCard({ plan, currency, payable, today }: { plan: InstallmentStatus; currency: string; payable: boolean; today: string }) {
  const pct = (plan.paidCount / plan.months_total) * 100;
  const overdue = !!plan.nextDue && plan.nextDue < today;
  return (
    <Card className="!p-4">
      <Link href={`/plans/installments/${plan.id}`} className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-lg font-bold">{plan.name}</span>
          <span className="block text-sm text-muted">
            {formatMoney(plan.monthly_amount, currency)}/month{plan.note ? ` · ${plan.note}` : ""}
          </span>
        </span>
        <ChevronRight size={20} className="mt-1 shrink-0 text-muted" />
      </Link>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-card-2" role="progressbar" aria-valuenow={plan.paidCount} aria-valuemax={plan.months_total} aria-label={`${plan.name} paid months`}>
        <div className="h-full rounded-full bg-mint" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>
          <span className="font-bold text-ink">
            {plan.paidCount} of {plan.months_total}
          </span>{" "}
          months paid
        </span>
        <span>Ends {monthYear(plan.lastDue)}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-sm">
          <span className="text-muted">Left </span>
          <span className="font-bold tabular-nums">{formatMoney(plan.remainingAmount, currency)}</span>
        </span>
        <div className="flex items-center gap-1">
          {plan.paidCount > 0 && (
            <form action={undoInstallmentPayment}>
              <input type="hidden" name="id" value={plan.id} />
              <button aria-label={`Undo last ${plan.name} payment`} className="rounded-full p-2 text-muted">
                <Undo2 size={16} />
              </button>
            </form>
          )}
          {payable ? (
            <form action={payInstallment}>
              <input type="hidden" name="id" value={plan.id} />
              <button className="flex items-center gap-1 rounded-full bg-mint px-3 py-1.5 text-xs font-bold text-white">
                <Check size={14} strokeWidth={3} /> Pay month {plan.nextSeq}
              </button>
            </form>
          ) : (
            plan.nextDue && <span className="text-xs text-muted">Next {shortDate(plan.nextDue)}</span>
          )}
        </div>
      </div>
      {overdue && <p className="mt-2 text-xs font-semibold text-coral">Month {plan.nextSeq} was due {shortDate(plan.nextDue!)}</p>}
    </Card>
  );
}
