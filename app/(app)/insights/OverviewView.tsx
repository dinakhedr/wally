import { Card, SectionTitle } from "@/components/Card";
import { MonthBars } from "@/components/charts/MonthBars";
import { formatMoney, parseISODate } from "@/lib/format";
import { categorySpend, monthTotals, tips } from "@/lib/insights";
import { addMonths, installmentStatus, monthLabel, monthOf, type InstallmentRow } from "@/lib/plans";
import type { Category } from "@/lib/types";
import { SpendSplit, StatTile, type Shared } from "./shared";

export function OverviewView({
  months,
  entries,
  billPayments,
  installmentPayments,
  currency,
  today,
  categories,
  installments,
}: Shared & { categories: Category[]; installments: InstallmentRow[]; monthlyBudget: number | null }) {
  const series = monthTotals(months, entries, billPayments, installmentPayments);
  const current = series[series.length - 1];
  const previous = series[series.length - 2];
  const fmt = (n: number) => formatMoney(n, currency);

  // Daily pace of day-to-day expenses (bills and installments are fixed costs).
  const day = Number(today.slice(8, 10));
  const daysInMonth = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
  const prevDays = new Date(Number(previous.month.slice(0, 4)), Number(previous.month.slice(5, 7)), 0).getDate();
  const perDay = current.expenses / day;
  const prevPerDay = previous.expenses / prevDays;
  const projected = perDay * daysInMonth;

  const cats = categorySpend(current.month, previous.month, entries, billPayments, installmentPayments);
  const overBudget = categories
    .filter((c) => c.budget)
    .map((c) => ({ name: c.name, over: (cats.find((x) => x.name === c.name)?.amount ?? 0) - c.budget! }))
    .filter((b) => b.over > 0)
    .sort((a, b) => b.over - a.over);
  const soon = addMonths(today, 3);
  const endingSoon = installments
    .map(installmentStatus)
    .filter((i) => !i.done && i.lastDue <= soon)
    .sort((a, b) => a.lastDue.localeCompare(b.lastDue))
    .map((i) => ({ name: i.name, monthly: i.monthly_amount, month: monthLabel(monthOf(i.lastDue)) }));
  const tipList = tips({ current, previous, categories: cats, overBudget, endingSoon, format: fmt });
  const rate = current.income > 0 ? Math.round((current.savings / current.income) * 100) : null;

  return (
    <>
      <p className="px-1 text-sm font-semibold text-muted">
        {parseISODate(`${current.month}-01`).toLocaleDateString("en", { month: "long", year: "numeric" })} so far
      </p>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Income" value={current.income} previous={previous.income} currency={currency} tone="bg-mint-soft" />
        <StatTile label="Spending" value={current.spending} previous={previous.spending} currency={currency} tone="bg-coral-soft" />
        <div className="col-span-2 flex items-center justify-between rounded-3xl bg-violet-soft p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{current.savings >= 0 ? "Saved" : "Overspent"}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{fmt(Math.abs(current.savings))}</p>
            <p className="text-xs text-muted">Last month {fmt(previous.savings)}</p>
          </div>
          {rate != null && (
            <div className="text-right">
              <p className="text-3xl font-extrabold tabular-nums">{rate}%</p>
              <p className="text-xs text-muted">of income</p>
            </div>
          )}
        </div>
      </div>

      <Card>
        <SectionTitle>Last 6 months</SectionTitle>
        <MonthBars data={series} currency={currency} />
      </Card>

      <Card>
        <SectionTitle>Where it went this month</SectionTitle>
        <SpendSplit expenses={current.expenses} bills={current.bills} installments={current.installments} currency={currency} />
      </Card>

      <Card>
        <SectionTitle>Daily pace</SectionTitle>
        <p className="text-sm text-muted">Day-to-day expenses, without bills and installments.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-extrabold tabular-nums">{fmt(Math.round(perDay))}</p>
            <p className="text-xs text-muted">per day this month</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold tabular-nums">{fmt(Math.round(prevPerDay))}</p>
            <p className="text-xs text-muted">per day last month</p>
          </div>
        </div>
        <p className="mt-3 rounded-2xl bg-card-2 px-4 py-3 text-sm">
          At this pace, day-to-day spending reaches about <b className="tabular-nums">{fmt(Math.round(projected))}</b> by the end
          of the month{previous.expenses > 0 && <> (last month: {fmt(Math.round(previous.expenses))})</>}.
        </p>
      </Card>

      {tipList.length > 0 && (
        <Card>
          <SectionTitle>Tips</SectionTitle>
          <ul className="space-y-3">
            {tipList.map((t) => (
              <li key={t.text} className="flex gap-3 text-sm">
                <span className="text-lg" aria-hidden>
                  {t.emoji}
                </span>
                <span>{t.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
