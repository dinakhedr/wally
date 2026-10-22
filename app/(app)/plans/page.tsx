import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import { getBills, getInstallments, getProfile } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import { BillsView } from "./BillsView";
import { InstallmentsView } from "./InstallmentsView";

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active = tab === "installments" ? "installments" : "bills";
  const { supabase, user } = await requireUser();
  const [profile, today, bills, installments] = await Promise.all([
    getProfile(supabase, user.id),
    getToday(),
    active === "bills" ? getBills(supabase) : Promise.resolve([]),
    active === "installments" ? getInstallments(supabase) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title="Plans" profile={profile} />
      <Segmented
        active={active}
        tabs={[
          { key: "bills", label: "Bills", href: "/plans" },
          { key: "installments", label: "Installments", href: "/plans?tab=installments" },
        ]}
      />
      <div className="mt-4">
        {active === "bills" ? (
          <BillsView bills={bills} today={today} currency={profile.currency} />
        ) : (
          <InstallmentsView rows={installments} today={today} currency={profile.currency} />
        )}
      </div>
    </>
  );
}
