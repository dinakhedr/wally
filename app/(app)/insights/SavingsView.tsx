import Link from "next/link";
import { Plus } from "lucide-react";
import { addToGoal } from "@/app/goals-actions";
import { Card, SectionTitle } from "@/components/Card";
import { SavingsBars } from "@/components/charts/SavingsBars";
import type { Goal } from "@/lib/data";
import { formatMoney, parseISODate } from "@/lib/format";
import { monthTotals } from "@/lib/insights";
import { installmentStatus, monthOf, type InstallmentRow } from "@/lib/plans";
import type { Shared } from "./shared";

const monthsBetween = (a: string, b: string) =>
  (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)));

export function SavingsView({
  months,
  entries,
  billPayments,
  installmentPayments,
  currency,
  today,
  installments,
  goals,
}: Shared & { installments: InstallmentRow[]; goals: Goal[] }) {
  const fmt = (n: number) => formatMoney(n, currency);
  const series = monthTotals(months, entries, billPayments, installmentPayments);
  const current = series[series.length - 1];
  const rate = current.income > 0 ? Math.round((current.savings / current.income) * 100) : null;

  // Average over finished months that have any activity.
  const finished = series.slice(0, -1).filter((m) => m.income > 0 || m.spending > 0);
  const basis = finished.length ? finished : [current];
  const average = basis.reduce((n, m) => n + m.savings, 0) / basis.length;

  // Installments that end within the next year free their monthly amount afterwards.
  const thisMonth = monthOf(today);
  const freed = installments
    .map(installmentStatus)
    .filter((i) => !i.done)
    .map((i) => ({ name: i.name, monthly: i.monthly_amount, after: monthsBetween(thisMonth, monthOf(i.lastDue)) + 1 }))
    .filter((i) => i.after < 12)
    .map((i) => ({ ...i, extra: i.monthly * (12 - i.after) }));
  const freedTotal = freed.reduce((n, i) => n + i.extra, 0);
  const projection = average * 12 + freedTotal;

  return (
    <>
      <section className="flex items-center justify-between rounded-3xl bg-violet-soft p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{current.savings >= 0 ? "Saved this month" : "Overspent this month"}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums">{fmt(Math.round(Math.abs(current.savings)))}</p>
          <p className="text-xs text-muted">
            Income {fmt(Math.round(current.income))} − spending {fmt(Math.round(current.spending))}
          </p>
        </div>
        {rate != null && (
          <div className="text-right">
            <p className="text-3xl font-extrabold tabular-nums">{rate}%</p>
            <p className="text-xs text-muted">savings rate</p>
          </div>
        )}
      </section>

      <Card>
        <SectionTitle>Last 6 months</SectionTitle>
        <SavingsBars data={series} currency={currency} />
      </Card>

      <Card>
        <SectionTitle>The year ahead</SectionTitle>
        <p className="text-3xl font-extrabold tabular-nums">{fmt(Math.round(projection))}</p>
        <p className="mt-1 text-sm text-muted">
          could be saved over the next 12 months if you keep saving about {fmt(Math.round(average))} a month
          {freedTotal > 0 ? ", plus money freed up as installments end" : ""}.
        </p>
        {freed.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {freed.map((f) => (
              <li key={f.name} className="flex justify-between gap-2">
                <span className="truncate">🎉 {f.name} ends</span>
                <span className="shrink-0 font-semibold tabular-nums">+{fmt(Math.round(f.extra))}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle
          action={
            <Link href="/insights/goals/new" className="flex items-center gap-1 text-sm font-semibold text-violet">
              <Plus size={16} /> New goal
            </Link>
          }
        >
          Goals
        </SectionTitle>
        {goals.length ? (
          <ul className="space-y-5">
            {goals.map((g) => {
              const pct = Math.min(100, (g.saved / g.target) * 100);
              const done = g.saved >= g.target;
              return (
                <li key={g.id}>
                  <Link href={`/insights/goals/${g.id}`} className="block">
                    <span className="block truncate font-bold">
                      {g.emoji} {g.name}
                    </span>
                    <span className="block text-sm tabular-nums text-muted">
                      <b className="text-ink">{fmt(g.saved)}</b> of {fmt(g.target)}
                    </span>
                  </Link>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-card-2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemax={100} aria-label={g.name}>
                    <div className={`h-full rounded-full ${done ? "bg-mint" : "bg-violet"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted">
                      {done
                        ? "🎉 Reached!"
                        : `${fmt(g.target - g.saved)} to go${g.target_date ? ` · by ${parseISODate(g.target_date).toLocaleDateString("en", { month: "short", year: "numeric" })}` : ""}`}
                    </span>
                    <form action={addToGoal} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={g.id} />
                      <input
                        name="amount"
                        inputMode="decimal"
                        placeholder="Amount"
                        aria-label={`Add money to ${g.name}`}
                        className="w-24 rounded-xl bg-card-2 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-violet"
                      />
                      <button className="rounded-xl bg-violet px-3 py-1.5 text-xs font-bold text-white">Add</button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">Saving for something? Add a goal like “Emergency fund — {currency} 60,000” and track it here.</p>
        )}
      </Card>
    </>
  );
}
