/**
 * Numbers behind the Insights tabs. Pure functions over rows fetched once per
 * page. Total spending = expenses + bills paid + installments paid.
 */
import { monthOf } from "./plans";
import type { Entry, Tint } from "./types";

export type BillPayment = { amount: number; due_on: string; category: { name: string; emoji: string; color: Tint } | null; name: string };
export type InstallmentPayment = { amount: number; due_on: string };

export type MonthTotals = {
  month: string;
  income: number;
  expenses: number;
  bills: number;
  installments: number;
  spending: number;
  savings: number;
};

export function monthTotals(
  months: string[],
  entries: Entry[],
  bills: BillPayment[],
  installments: InstallmentPayment[],
): MonthTotals[] {
  return months.map((month) => {
    const inMonth = <T extends { date?: string; due_on?: string }>(r: T) => monthOf((r.date ?? r.due_on)!) === month;
    const income = entries.filter((e) => e.kind === "income" && inMonth(e)).reduce((n, e) => n + e.amount, 0);
    const expenses = entries.filter((e) => e.kind === "expense" && inMonth(e)).reduce((n, e) => n + e.amount, 0);
    const b = bills.filter(inMonth).reduce((n, p) => n + p.amount, 0);
    const i = installments.filter(inMonth).reduce((n, p) => n + p.amount, 0);
    const spending = expenses + b + i;
    return { month, income, expenses, bills: b, installments: i, spending, savings: income - spending };
  });
}

/** Percentage change, or null when there's nothing to compare against. */
export function change(now: number, before: number) {
  if (!before) return null;
  return ((now - before) / Math.abs(before)) * 100;
}

export type CategorySpend = { key: string; name: string; emoji: string; color: Tint; amount: number; previous: number };

/**
 * Spending per category for a month, with the previous month alongside. Bill
 * payments count under the bill's category; installments are one group.
 */
export function categorySpend(
  month: string,
  previousMonth: string,
  entries: Entry[],
  bills: BillPayment[],
  installments: InstallmentPayment[],
): CategorySpend[] {
  const map = new Map<string, CategorySpend>();
  const add = (cat: { name: string; emoji: string; color: Tint } | null, amount: number, which: "amount" | "previous") => {
    const name = cat?.name ?? "Uncategorised";
    const row = map.get(name) ?? { key: name, name, emoji: cat?.emoji ?? "📦", color: cat?.color ?? "violet", amount: 0, previous: 0 };
    row[which] += amount;
    map.set(name, row);
  };
  for (const [m, which] of [
    [month, "amount"],
    [previousMonth, "previous"],
  ] as const) {
    for (const e of entries) if (e.kind === "expense" && monthOf(e.date) === m) add(e.category, e.amount, which);
    for (const p of bills) if (monthOf(p.due_on) === m) add(p.category ?? { name: "Bills", emoji: "🔁", color: "sky" }, p.amount, which);
    for (const p of installments)
      if (monthOf(p.due_on) === m) add({ name: "Installments", emoji: "🧾", color: "sky" }, p.amount, which);
  }
  return [...map.values()].filter((c) => c.amount > 0 || c.previous > 0).sort((a, b) => b.amount - a.amount || b.previous - a.previous);
}

/** Daily totals for a month (expenses + bills + installments), keyed by YYYY-MM-DD. */
export function dailySpend(month: string, entries: Entry[], bills: BillPayment[], installments: InstallmentPayment[]) {
  const days = new Map<string, number>();
  const add = (date: string, amount: number) => monthOf(date) === month && days.set(date, (days.get(date) ?? 0) + amount);
  for (const e of entries) if (e.kind === "expense") add(e.date, e.amount);
  for (const p of bills) add(p.due_on, p.amount);
  for (const p of installments) add(p.due_on, p.amount);
  return days;
}

export type Tip = { emoji: string; text: string };

/** A few plain-language observations for the Overview tab. */
export function tips(opts: {
  current: MonthTotals;
  previous: MonthTotals | undefined;
  categories: CategorySpend[];
  overBudget: { name: string; over: number }[];
  endingSoon: { name: string; monthly: number; month: string }[];
  format: (n: number) => string;
}): Tip[] {
  const out: Tip[] = [];
  const { current, previous, categories, overBudget, endingSoon, format } = opts;

  for (const b of overBudget.slice(0, 2)) out.push({ emoji: "⚠️", text: `${b.name} is ${format(b.over)} over its budget this month.` });

  const rise = categories
    .filter((c) => c.previous > 0 && c.amount - c.previous > 0)
    .sort((a, b) => b.amount - b.previous - (a.amount - a.previous))[0];
  if (rise && rise.amount - rise.previous >= 0.2 * rise.previous) {
    out.push({ emoji: rise.emoji, text: `${rise.name} is up ${format(rise.amount - rise.previous)} on last month.` });
  }

  if (current.income > 0) {
    const rate = (current.savings / current.income) * 100;
    if (rate >= 20) out.push({ emoji: "🌱", text: `You're saving ${Math.round(rate)}% of your income this month. Nice.` });
    else if (rate < 0) out.push({ emoji: "🧯", text: `Spending is ${format(-current.savings)} more than income this month.` });
  }

  const ending = endingSoon[0];
  if (ending) out.push({ emoji: "🎉", text: `${ending.name} ends in ${ending.month}, freeing up ${format(ending.monthly)} a month.` });

  if (!out.length && previous && current.spending < previous.spending) {
    out.push({ emoji: "👏", text: `You've spent ${format(previous.spending - current.spending)} less than last month so far.` });
  }
  return out.slice(0, 3);
}
