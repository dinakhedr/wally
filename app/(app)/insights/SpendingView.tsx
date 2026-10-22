import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, SectionTitle } from "@/components/Card";
import { Donut } from "@/components/charts/Donut";
import { SpendCalendar } from "@/components/charts/SpendCalendar";
import { EntryRow } from "@/components/EntryRow";
import { formatMoney } from "@/lib/format";
import { categorySpend, dailySpend, monthTotals } from "@/lib/insights";
import { addMonths, monthLabel, monthOf } from "@/lib/plans";
import type { Category } from "@/lib/types";
import { SpendSplit, type Shared } from "./shared";

export function SpendingView({
  entries,
  billPayments,
  installmentPayments,
  currency,
  today,
  month,
  thisMonth,
  categories,
  monthlyBudget,
  weekStartsOn,
}: Shared & {
  month: string;
  thisMonth: string;
  categories: Category[];
  monthlyBudget: number | null;
  weekStartsOn: number;
  daysInMonth: number;
}) {
  const prevMonth = monthOf(addMonths(`${month}-01`, -1));
  const nextMonth = monthOf(addMonths(`${month}-01`, 1));
  const [totals] = monthTotals([month], entries, billPayments, installmentPayments);
  const cats = categorySpend(month, prevMonth, entries, billPayments, installmentPayments);
  const days = Object.fromEntries(dailySpend(month, entries, billPayments, installmentPayments));
  const biggest = entries
    .filter((e) => e.kind === "expense" && monthOf(e.date) === month)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const budgets = [
    ...(monthlyBudget ? [{ key: "__all", label: "Whole month", emoji: "💰", budget: monthlyBudget, spent: totals.spending }] : []),
    ...categories
      .filter((c) => c.budget)
      .map((c) => ({ key: c.id, label: c.name, emoji: c.emoji, budget: c.budget!, spent: cats.find((x) => x.name === c.name)?.amount ?? 0 }))
      .sort((a, b) => b.spent / b.budget - a.spent / a.budget),
  ];
  const isPast = month < thisMonth;

  return (
    <>
      <div className="flex items-center justify-between rounded-3xl bg-card p-2 ring-1 ring-line">
        <Link href={`/insights?tab=spending&month=${prevMonth}`} aria-label="Previous month" className="rounded-full p-2 text-muted">
          <ChevronLeft size={20} />
        </Link>
        <p className="font-bold">{monthLabel(month, { year: true })}</p>
        {isPast ? (
          <Link href={`/insights?tab=spending&month=${nextMonth}`} aria-label="Next month" className="rounded-full p-2 text-muted">
            <ChevronRight size={20} />
          </Link>
        ) : (
          <span className="w-9" />
        )}
      </div>

      <Card>
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Total spending</p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums">{formatMoney(totals.spending, currency)}</p>
        <div className="mt-4">
          <SpendSplit expenses={totals.expenses} bills={totals.bills} installments={totals.installments} currency={currency} />
        </div>
      </Card>

      <Card>
        <SectionTitle>By category</SectionTitle>
        {cats.some((c) => c.amount > 0) ? (
          <Donut
            currency={currency}
            total={totals.spending}
            slices={cats.filter((c) => c.amount > 0).map((c) => ({ key: c.key, label: c.name, emoji: c.emoji, amount: c.amount }))}
          />
        ) : (
          <p className="py-4 text-sm text-muted">No spending this month yet.</p>
        )}
      </Card>

      {cats.length > 0 && (
        <Card>
          <SectionTitle>Compared with {monthLabel(prevMonth)}</SectionTitle>
          <ul className="divide-y divide-line text-sm">
            {cats.map((c) => {
              const diff = c.amount - c.previous;
              return (
                <li key={c.key} className="flex items-center gap-3 py-2.5">
                  <span aria-hidden>{c.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.name}</span>
                    <span className="block text-xs text-muted tabular-nums">
                      {diff === 0
                        ? "Same as last month"
                        : `${diff > 0 ? "▲" : "▼"} ${formatMoney(Math.round(Math.abs(diff)), currency)} vs ${monthLabel(prevMonth).slice(0, 3)}`}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{formatMoney(Math.round(c.amount), currency)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card>
        <SectionTitle
          action={
            <Link href="/settings/categories" className="text-sm font-semibold text-violet">
              Edit
            </Link>
          }
        >
          Budgets
        </SectionTitle>
        {budgets.length ? (
          <ul className="space-y-4">
            {budgets.map((b) => {
              const pct = (b.spent / b.budget) * 100;
              const state = pct > 100 ? "over" : pct >= 80 ? "close" : "ok";
              return (
                <li key={b.key}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-semibold">
                      {b.emoji} {b.label}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">
                      <b className="text-ink">{formatMoney(b.spent, currency)}</b> / {formatMoney(b.budget, currency)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-card-2">
                    <div
                      className={`h-full rounded-full ${state === "over" ? "bg-coral" : state === "close" ? "bg-sun" : "bg-mint"}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {state === "over"
                      ? `⚠️ Over by ${formatMoney(b.spent - b.budget, currency)}`
                      : `${formatMoney(b.budget - b.spent, currency)} left${state === "close" ? " · getting close" : ""}`}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No budgets yet. Set them in{" "}
            <Link href="/settings/categories" className="font-semibold text-violet">
              Settings → Categories
            </Link>
            .
          </p>
        )}
      </Card>

      <Card>
        <SectionTitle>Spending calendar</SectionTitle>
        <SpendCalendar month={month} days={days} currency={currency} weekStartsOn={weekStartsOn} today={today} />
      </Card>

      {biggest.length > 0 && (
        <Card>
          <SectionTitle>Biggest expenses</SectionTitle>
          <ul className="divide-y divide-line">
            {biggest.map((e) => (
              <EntryRow key={e.id} entry={e} currency={currency} editable />
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
