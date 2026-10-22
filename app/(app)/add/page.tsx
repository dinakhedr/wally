import { getCategories, getProfile, sortByRecent } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import { AddForm } from "./AddForm";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; kind?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const [profile, categories, today] = await Promise.all([
    getProfile(supabase, user.id),
    getCategories(supabase),
    getToday(),
  ]);

  const preset = categories.find((c) => c.id === params.category);
  const kind = preset?.kind ?? (params.kind === "income" ? "income" : "expense");

  return (
    <AddForm
      categories={sortByRecent(categories)}
      currency={profile.currency}
      today={today}
      initialKind={kind}
      initialCategoryId={preset?.id ?? null}
    />
  );
}
