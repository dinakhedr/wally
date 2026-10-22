import { notFound } from "next/navigation";
import { BackHeader } from "@/components/forms/BackHeader";
import { DeleteButton } from "@/components/DeleteButton";
import { getProfile } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { EditEntryForm } from "./EditEntryForm";

export default async function EditEntryPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind: k, id } = await params;
  if (k !== "expense" && k !== "income") notFound();
  const kind = k;
  const { supabase, user } = await requireUser();
  const table = kind === "expense" ? "expenses" : "income";
  const dateCol = kind === "expense" ? "spent_on" : "received_on";

  const [profile, { data: row }, { data: cats }] = await Promise.all([
    getProfile(supabase, user.id),
    supabase.from(table).select(`id, amount, category_id, note, ${dateCol}`).eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, kind, name, emoji, color, budget, sort_order, archived, last_used_at").eq("kind", kind).order("sort_order"),
  ]);
  if (!row) notFound();
  const r = row as unknown as Record<string, string | number | null>;
  // Hidden categories are only offered if this entry already uses one.
  const categories = ((cats ?? []) as Category[]).filter((c) => !c.archived || c.id === r.category_id);

  return (
    <>
      <BackHeader href="/activity" title={kind === "expense" ? "Edit expense" : "Edit income"} />
      <EditEntryForm
        currency={profile.currency}
        categories={categories}
        entry={{
          id: String(r.id),
          kind,
          amount: Number(r.amount),
          category_id: (r.category_id as string | null) ?? null,
          date: String(r[dateCol]),
          note: (r.note as string | null) ?? null,
        }}
      />
      <div className="mt-4 flex justify-center">
        <DeleteButton id={id} kind={kind} label />
      </div>
    </>
  );
}
