import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, SectionTitle } from "@/components/Card";
import { CategoryBubble } from "@/components/CategoryBubble";
import { EntryRow } from "@/components/EntryRow";
import { PageHeader } from "@/components/PageHeader";
import { Toast } from "@/components/Toast";
import { getCategories, getEntries, getPlanPayments, getProfile, getUpcomingBills, sortByRecent, totals } from "@/lib/data";
import { dayLabel, dueLabel, formatMoney, monthBounds, toISODate } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";
import { getNow } from "@/lib/today";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ added?: string; reset?: string }> }) {
  const { added, reset } = await searchParams;
  const { supabase, user } = await requireUser();
  const now = await getNow();
  const month = monthBounds(now);
  const in14 = new Date(now);
  in14.setDate(in14.getDate() + 14);

  const [profile, categories, monthEntries, bills, paid, recentEntries] = await Promise.all([
    getProfile(supabase, user.id),
    getCategories(supabase, "expense"),
    getEntries(supabase, { from: month.start, to: month.end }),
    getUpcomingBills(supabase, toISODate(in14), 3),
    getPlanPayments(supabase, month.start, month.end),
    getEntries(supabase, { recent: true, limit: 5 }),
  ]);

  const { currency } = profile;
  // Total spending = expenses + bills paid + installments paid.
  const { spent: expensesSpent, earned } = totals(monthEntries);
  const spent = expensesSpent + paid.bills + paid.installments;
  const categoryBudgets = categories.reduce((sum, c) => sum + (c.budget ?? 0), 0);
  const budget = profile.monthly_budget ?? (categoryBudgets > 0 ? categoryBudgets : earned > 0 ? earned : null);
  const budgetSource = profile.monthly_budget != null ? "budget" : categoryBudgets > 0 ? "category budgets" : "income";

  const left = budget != null ? budget - spent : null;
  const daysLeft = month.daysInMonth - now.getDate() + 1;
  const perDay = left != null && left > 0 ? left / daysLeft : 0;
  const usedPct = budget ? (spent / budget) * 100 : 0; // the ring caps at 100%, the label doesn't

  const recent = sortByRecent(categories).slice(0, 6);
  const firstName = profile.display_name?.split(" ")[0];

  return (
    <>
      <PageHeader
        subtitle={now.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}
        title={`${greeting(now.getHours())}${firstName ? `, ${firstName}` : ""}`}
        profile={profile}
      />

      {/* Left to spend: ring */}
      {budget != null && left != null ? (
        <section className="flex items-center gap-5 rounded-3xl bg-card p-5 ring-1 ring-line">
          <BudgetRing pct={usedPct} over={left < 0} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-muted">{left < 0 ? "Over budget by" : "Left to spend"}</p>
            <p className={`text-3xl font-extrabold tracking-tight tabular-nums ${left < 0 ? "text-coral" : ""}`}>
              <span className="mr-1 text-base">{currency}</span>
              {Math.round(Math.abs(left)).toLocaleString("en")}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {left > 0 ? `~${formatMoney(Math.floor(perDay), currency)}/day · ` : ""}
              {daysLeft} day{daysLeft === 1 ? "" : "s"} left
            </p>
          </div>
        </section>
      ) : (
        <Link href="/settings" className="flex items-center gap-3 rounded-3xl bg-violet-soft p-5">
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Set a monthly budget</span>
            <span className="block text-sm text-muted">See what’s left to spend and a daily allowance.</span>
          </span>
          <ChevronRight size={20} className="text-violet" />
        </Link>
      )}

      {/* Spent this month */}
      <section className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-line">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Spent in {now.toLocaleDateString("en", { month: "long" })}</span>
          {budget != null && (
            <span className="text-right text-xs text-muted">
              of {formatMoney(Math.round(budget), currency)}
              {budgetSource !== "budget" && <span className="block">({budgetSource})</span>}
            </span>
          )}
        </div>
        <p className="mt-1 text-2xl font-extrabold tabular-nums">{formatMoney(Math.round(spent), currency)}</p>
        <SpentSplit
          currency={currency}
          parts={[
            { label: "Expenses", value: expensesSpent, color: "var(--cat-1)" },
            { label: "Bills", value: paid.bills, color: "var(--cat-2)" },
            { label: "Installments", value: paid.installments, color: "var(--cat-3)" },
          ]}
        />
      </section>

      {/* Quick add: the 6 most recent categories, full names */}
      <section className="mt-4 rounded-3xl bg-card p-2 ring-1 ring-line">
        <div className="flex items-baseline justify-between px-2 pb-1.5 pt-1">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Quick add</span>
          <Link href="/add" className="text-sm font-bold text-violet">
            All ›
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5">
          {recent.map((c) => (
            <Link
              key={c.id}
              href={`/add?category=${c.id}`}
              className="flex min-h-12 items-center gap-2.5 rounded-2xl py-1.5 pl-1.5 pr-2.5 text-sm font-bold leading-tight transition active:scale-[.98] active:bg-card-2"
            >
              <CategoryBubble emoji={c.emoji} color={c.color} size="sm" />
              <span className="min-w-0">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming bills */}
      <Card className="mt-6">
        <SectionTitle
          action={
            <Link href="/plans" className="text-sm font-semibold text-violet">
              See all
            </Link>
          }
        >
          Coming up
        </SectionTitle>
        {bills.length ? (
          <ul className="divide-y divide-line">
            {bills.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-3">
                <CategoryBubble emoji={b.category?.emoji ?? "🔁"} color={b.category?.color ?? "sky"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{b.name}</p>
                  <p className="text-sm text-sky">{dueLabel(b.next_due)}</p>
                </div>
                <span className="font-bold tabular-nums">{formatMoney(b.amount, currency)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-muted">No bills due in the next two weeks.</p>
        )}
      </Card>

      {/* Recent: the 5 most recently added entries, any date */}
      <Card className="mt-4">
        <SectionTitle
          action={
            <Link href="/activity" className="text-sm font-semibold text-violet">
              All activity
            </Link>
          }
        >
          Recent
        </SectionTitle>
        {recentEntries.length ? (
          <ul className="divide-y divide-line">
            {recentEntries.map((e) => (
              <EntryRow key={`${e.kind}-${e.id}`} entry={e} currency={currency} editable dateLabel={dayLabel(e.date, now)} />
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-muted">Nothing yet. Tap + to add your first expense or income.</p>
        )}
      </Card>

      {added && <Toast message={added === "income" ? "Income added" : "Expense added"} />}
      {reset && <Toast message="All data deleted" />}
    </>
  );
}

/** Share of the budget used, as a ring. */
function BudgetRing({ pct, over }: { pct: number; over: boolean }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  const shown = Math.min(100, Math.max(0, pct));
  const label = pct >= 99 && pct < 100 ? pct.toFixed(1) : Math.round(pct).toString();
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${label}% of budget used`}>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="14" className="stroke-card-2" />
        {shown > 0 && (
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${(shown / 100) * c} ${c}`}
            className={over ? "stroke-coral" : "stroke-violet"}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold tabular-nums">{label}%</span>
        <span className="text-[11px] text-muted">used</span>
      </div>
    </div>
  );
}

/** Expenses / bills / installments as one bar, with a labelled amount under each. */
function SpentSplit({ parts, currency }: { parts: { label: string; value: number; color: string }[]; currency: string }) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  return (
    <>
      <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-card-2" role="img" aria-label="Spending split">
        {total > 0 &&
          parts
            .filter((p) => p.value > 0)
            .map((p) => <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {parts.map((p) => (
          <div key={p.label}>
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <i className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} aria-hidden />
              {p.label}
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums">{formatMoney(Math.round(p.value), currency)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
