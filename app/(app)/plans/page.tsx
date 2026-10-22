import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";
import { getProfile } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";

export default async function PlansPage() {
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);

  return (
    <>
      <PageHeader title="Plans" profile={profile} />
      <ComingSoon
        items={[
          { emoji: "🔁", color: "sky", title: "Bills", text: "Every recurring payment, month by month for the next 12 months." },
          { emoji: "🧾", color: "sky", title: "Installments", text: "Progress on each installment, and when each one ends and frees up money." },
        ]}
      />
    </>
  );
}
