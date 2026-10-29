import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import {
  getBillPayments,
  getCategories,
  getEntries,
  getGoals,
  getInstallmentPayments,
  getInstallments,
  getProfile,
} from "@/lib/data";
import { monthBounds } from "@/lib/format";
import { monthTotals } from "@/lib/insights";
import { addMonths, lastDayOfMonth, monthOf, monthsAhead } from "@/lib/plans";
import { requireUser } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import { MonthsTable } from "./MonthsTable";
import { OverviewView } from "./OverviewView";
import { SpendingView } from "./SpendingView";

type Params = { tab?: string; month?: string; year?: string };

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const tab = params.tab === "spending" || params.tab === "months" ? params.tab : "overview";
  const { supabase, user } = await requireUser();
  const today = await getToday();
  const thisMonth = monthOf(today);
  const thisYear = Number(today.slice(0, 4));

  const tabs = (
    <Segmented
      active={tab}
      tabs={[
        { key: "overview", label: "Overview", href: "/insights" },
        { key: "spending", label: "Spending", href: "/insights?tab=spending" },
        { key: "months", label: "Months", href: "/insights?tab=months" },
      ]}
    />
  );

  // ─── Months: one year, Jan–Dec ────────────────────────────────────────────
  if (tab === "months") {
    const year = /^\d{4}$/.test(params.year ?? "") && Number(params.year) <= thisYear ? Number(params.year) : thisYear;
    const months = monthsAhead(`${year}-01-01`, 12);
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const [profile, entries, billPayments, installmentPayments] = await Promise.all([
      getProfile(supabase, user.id),
      getEntries(supabase, { from, to, limit: 10000 }),
      getBillPayments(supabase, from, to),
      getInstallmentPayments(supabase, from, to),
    ]);
    const rows = monthTotals(months, entries, billPayments, installmentPayments).map((m) => ({
      month: m.month,
      income: m.income,
      spending: m.spending,
      savings: m.savings,
      upcoming: m.month > thisMonth,
      partial: m.month === thisMonth,
    }));
    return (
      <>
        <PageHeader title="Insights" profile={profile} />
        {tabs}
        <div className="mt-4 space-y-4">
          <MonthsTable year={year} rows={rows} currency={profile.currency} canGoForward={year < thisYear} />
        </div>
      </>
    );
  }

  // ─── Overview and Spending ────────────────────────────────────────────────
  // Spending can look at any month, past or future; Overview is about now.
  const focus = tab === "spending" && /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : thisMonth;
  const months = monthsAhead(addMonths(`${focus}-01`, -5), 6); // focus month and the 5 before it
  const yearMonths = monthsAhead(`${thisYear}-01-01`, Number(thisMonth.slice(5, 7))); // January to now
  const from = tab === "overview" && yearMonths[0] < months[0] ? `${yearMonths[0]}-01` : `${months[0]}-01`;
  const to = lastDayOfMonth(focus);

  const [profile, entries, billPayments, installmentPayments, categories, installments, goals] = await Promise.all([
    getProfile(supabase, user.id),
    getEntries(supabase, { from, to, limit: 10000 }),
    getBillPayments(supabase, from, to),
    getInstallmentPayments(supabase, from, to),
    getCategories(supabase, "expense"),
    getInstallments(supabase),
    tab === "overview" ? getGoals(supabase) : Promise.resolve([]),
  ]);

  const shared = { months, entries, billPayments, installmentPayments, currency: profile.currency, today };

  return (
    <>
      <PageHeader title="Insights" profile={profile} />
      {tabs}
      <div className="mt-4 space-y-4">
        {tab === "overview" && (
          <OverviewView
            {...shared}
            categories={categories}
            installments={installments}
            monthlyBudget={profile.monthly_budget}
            yearMonths={yearMonths}
            goals={goals}
          />
        )}
        {tab === "spending" && (
          <SpendingView
            {...shared}
            month={focus}
            thisMonth={thisMonth}
            categories={categories}
            monthlyBudget={profile.monthly_budget}
            weekStartsOn={profile.week_starts_on}
            daysInMonth={monthBounds(new Date(Number(focus.slice(0, 4)), Number(focus.slice(5, 7)) - 1, 1)).daysInMonth}
          />
        )}
      </div>
    </>
  );
}
