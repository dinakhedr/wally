import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";
import { getProfile } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";

export default async function InsightsPage() {
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);

  return (
    <>
      <PageHeader title="Insights" profile={profile} />
      <ComingSoon
        items={[
          { emoji: "📈", color: "violet", title: "Overview", text: "Income, spending and savings vs. last month, 6-month trends and your daily pace." },
          { emoji: "🍩", color: "coral", title: "Spending", text: "Category breakdown, budgets, a spending calendar and your biggest expenses." },
          { emoji: "🐷", color: "mint", title: "Savings", text: "Savings rate, monthly chart, goals and a year-ahead projection." },
        ]}
      />
    </>
  );
}
