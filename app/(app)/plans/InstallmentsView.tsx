import Link from "next/link";
import { Check, ChevronRight, Plus, Undo2 } from "lucide-react";
import { payInstallment, undoInstallmentPayment } from "@/app/plans-actions";
import { Card } from "@/components/Card";
import { MonthList } from "@/components/plans/MonthList";
import { formatMoney, parseISODate } from "@/lib/format";
import { installmentStatus, monthLabel, monthOf, type InstallmentRow, type InstallmentStatus } from "@/lib/plans";
import { installmentSchedule } from "@/lib/schedule";

const monthYear = (iso: string) => parseISODate(iso).toLocaleDateString("en", { month: "short", year: "numeric" });
const shortDate = (iso: string) => parseISODate(iso).toLocaleDateString("en", { day: "numeric", month: "short" });

export function InstallmentsView({ rows, today, currency }: { rows: InstallmentRow[]; today: string; currency: string }) {
  const thisMonth = monthOf(today);
  const all = rows.map(installmentStatus);
  const active = all.filter((i) => !i.done).sort((a, b) => a.lastDue.localeCompare(b.lastDue));
  const finished = all.filter((i) => i.done);

  const monthly = active.reduce((n, i) => n + i.monthly_amount, 0);
  const remaining = active.reduce((n, i) => n + i.remainingAmount, 0);

  // Months: what's due (or was paid) each month, and which plans end then.
  const { byMonth, past, future } = installmentSchedule(rows, today);
  const year = (m: string) => m.slice(0, 4) !== thisMonth.slice(0, 4);
  const monthRows = [...future, ...past]
    .filter((m) => byMonth.get(m)?.length)
    .map((m) => {
      const lines = byMonth.get(m)!;
      const ending = all.filter((i) => monthOf(i.lastDue) === m);
      return {
        month: m,
        label: monthLabel(m, { year: year(m) }),
        total: formatMoney(lines.reduce((n, l) => n + l.amount, 0), currency),
        count: `${lines.length} payment${lines.length === 1 ? "" : "s"}`,
        href: `/plans/month/${m}?type=installments`,
        past: m < thisMonth,
        note: ending.length ? (
          <span className="mt-0.5 block text-xs text-muted">
            🎉 {ending.map((e) => e.name).join(", ")} {ending.length === 1 ? "ends" : "end"}, freeing up{" "}
            <b className="text-ink">{formatMoney(ending.reduce((n, e) => n + e.monthly_amount, 0), currency)}</b> a month
          </span>
        ) : undefined,
      };
    });

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
        <PlanCard key={i.id} plan={i} currency={currency} payable={!!i.nextDue && i.nextDue <= today} today={today} />
      ))}

      {monthRows.length > 0 && <MonthList title="Months" rows={monthRows} />}

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
