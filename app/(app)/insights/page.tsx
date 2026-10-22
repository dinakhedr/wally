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
import { addMonths, lastDayOfMonth, monthOf, monthsAhead } from "@/lib/plans";
import { requireUser } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import { OverviewView } from "./OverviewView";
import { SavingsView } from "./SavingsView";
import { SpendingView } from "./SpendingView";

type Params = { tab?: string; month?: string };

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const tab = params.tab === "spending" || params.tab === "savings" ? params.tab : "overview";
  const { supabase, user } = await requireUser();
  const today = await getToday();
  const thisMonth = monthOf(today);

  // Spending can look at any past month; the others are about now.
  const focus = tab === "spending" && /^\d{4}-\d{2}$/.test(params.month ?? "") && params.month! <= thisMonth ? params.month! : thisMonth;
  const months = monthsAhead(addMonths(`${focus}-01`, -5), 6); // focus month and the 5 before it
  const from = `${months[0]}-01`;
  const to = lastDayOfMonth(focus);

  const [profile, entries, billPayments, installmentPayments, categories, installments, goals] = await Promise.all([
    getProfile(supabase, user.id),
    getEntries(supabase, { from, to, limit: 5000 }),
    getBillPayments(supabase, from, to),
    getInstallmentPayments(supabase, from, to),
    getCategories(supabase, "expense"),
    getInstallments(supabase),
    tab === "savings" ? getGoals(supabase) : Promise.resolve([]),
  ]);

  const shared = { months, entries, billPayments, installmentPayments, currency: profile.currency, today };

  return (
    <>
      <PageHeader title="Insights" profile={profile} />
      <Segmented
        active={tab}
        tabs={[
          { key: "overview", label: "Overview", href: "/insights" },
          { key: "spending", label: "Spending", href: "/insights?tab=spending" },
          { key: "savings", label: "Savings", href: "/insights?tab=savings" },
        ]}
      />
      <div className="mt-4 space-y-4">
        {tab === "overview" && (
          <OverviewView {...shared} categories={categories} installments={installments} monthlyBudget={profile.monthly_budget} />
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
        {tab === "savings" && <SavingsView {...shared} installments={installments} goals={goals} />}
      </div>
    </>
  );
}
