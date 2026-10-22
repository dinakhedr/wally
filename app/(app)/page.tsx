import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, SectionTitle } from "@/components/Card";
import { CategoryBubble } from "@/components/CategoryBubble";
import { EntryRow } from "@/components/EntryRow";
import { PageHeader } from "@/components/PageHeader";
import { Toast } from "@/components/Toast";
import { getCategories, getEntries, getPlanPayments, getProfile, getUpcomingBills, sortByRecent, totals } from "@/lib/data";
import { dueLabel, formatMoney, monthBounds, toISODate } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";
import { getNow } from "@/lib/today";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const { added } = await searchParams;
  const { supabase, user } = await requireUser();
  const now = await getNow();
  const today = toISODate(now);
  const month = monthBounds(now);
  const in14 = new Date(now);
  in14.setDate(in14.getDate() + 14);

  const [profile, categories, monthEntries, bills, paid] = await Promise.all([
    getProfile(supabase, user.id),
    getCategories(supabase, "expense"),
    getEntries(supabase, { from: month.start, to: month.end }),
    getUpcomingBills(supabase, toISODate(in14), 3),
    getPlanPayments(supabase, month.start, month.end),
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
  const usedPct = budget ? Math.min(100, (spent / budget) * 100) : 0;

  const recent = sortByRecent(categories).slice(0, 4);
  const todays = monthEntries.filter((e) => e.date === today);
  const firstName = profile.display_name?.split(" ")[0];

  return (
    <>
      <PageHeader
        subtitle={now.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}
        title={`${greeting(now.getHours())}${firstName ? `, ${firstName}` : ""}`}
        profile={profile}
      />

      {/* Left to spend */}
      <section className="rounded-3xl bg-gradient-to-br from-[#8a6bff] to-[#5a34f0] p-5 text-white shadow-lg shadow-violet/30">
        {left != null ? (
          <>
            <p className="text-sm font-medium text-white/80">Left to spend in {now.toLocaleDateString("en", { month: "long" })}</p>
            <p className={`mt-1 text-4xl font-extrabold tracking-tight tabular-nums ${left < 0 ? "text-[#ffd1cc]" : ""}`}>
              {formatMoney(left, currency)}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className={`h-full rounded-full ${usedPct >= 100 ? "bg-[#ff8a7f]" : usedPct >= 80 ? "bg-[#ffc25c]" : "bg-white"}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-sm text-white/85">
              <span>
                {formatMoney(spent, currency)} of {formatMoney(budget!, currency)}
                <span className="text-white/60"> · {budgetSource}</span>
              </span>
              {left > 0 && <span>~{formatMoney(Math.floor(perDay), currency)}/day</span>}
            </div>
            {(paid.bills > 0 || paid.installments > 0) && <SpentBreakdown expenses={expensesSpent} paid={paid} currency={currency} />}
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-white/80">Spent this month</p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums">{formatMoney(spent, currency)}</p>
            {(paid.bills > 0 || paid.installments > 0) && <SpentBreakdown expenses={expensesSpent} paid={paid} currency={currency} />}
            <Link href="/settings" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white/90">
              Set a monthly budget to see what’s left <ChevronRight size={16} />
            </Link>
          </>
        )}
      </section>

      {/* Recent categories */}
      <div className="mt-6">
        <SectionTitle>Quick add</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          {recent.map((c) => (
            <Link
              key={c.id}
              href={`/add?category=${c.id}`}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-card py-3 ring-1 ring-line transition active:scale-95"
            >
              <CategoryBubble emoji={c.emoji} color={c.color} />
              <span className="w-full truncate px-1 text-center text-xs font-semibold">{c.name}</span>
            </Link>
          ))}
        </div>
      </div>

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

      {/* Today */}
      <Card className="mt-4">
        <SectionTitle
          action={
            <Link href="/activity" className="text-sm font-semibold text-violet">
              All activity
            </Link>
          }
        >
          Today
        </SectionTitle>
        {todays.length ? (
          <ul className="divide-y divide-line">
            {todays.map((e) => (
              <EntryRow key={`${e.kind}-${e.id}`} entry={e} currency={currency} />
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-muted">Nothing yet today. Tap + to add something.</p>
        )}
      </Card>

      {added && <Toast message={added === "income" ? "Income added" : "Expense added"} />}
    </>
  );
}

function SpentBreakdown({
  expenses,
  paid,
  currency,
}: {
  expenses: number;
  paid: { bills: number; installments: number };
  currency: string;
}) {
  return (
    <p className="mt-2 text-xs text-white/70">
      Expenses {formatMoney(expenses, currency)} · Bills {formatMoney(paid.bills, currency)} · Installments{" "}
      {formatMoney(paid.installments, currency)}
    </p>
  );
}
