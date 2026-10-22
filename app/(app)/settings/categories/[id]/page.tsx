import { notFound } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { deleteCategory, setCategoryArchived } from "@/app/category-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { BackHeader } from "@/components/forms/BackHeader";
import { getProfile } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { CategoryForm } from "./CategoryForm";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const [{ id }, { kind: k }] = await Promise.all([params, searchParams]);
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);

  let category: Category | null = null;
  let uses = 0;
  if (id !== "new") {
    const { data } = await supabase
      .from("categories")
      .select("id, kind, name, emoji, color, budget, sort_order, archived, last_used_at")
      .eq("id", id)
      .maybeSingle();
    if (!data) notFound();
    category = { ...data, budget: data.budget == null ? null : Number(data.budget) } as Category;
    const counts = await Promise.all(
      ["expenses", "income", "recurring"].map((t) =>
        supabase.from(t).select("id", { count: "exact", head: true }).eq("category_id", id),
      ),
    );
    uses = counts.reduce((n, r) => n + (r.count ?? 0), 0);
  }
  const kind = category?.kind ?? (k === "income" ? "income" : "expense");

  return (
    <>
      <BackHeader href={`/settings/categories${kind === "income" ? "?kind=income" : ""}`} title={category ? category.name : "New category"} />
      <CategoryForm category={category} kind={kind} currency={profile.currency} />
      {category && (
        <div className="mt-4 space-y-3">
          <form action={setCategoryArchived}>
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="archived" value={String(!category.archived)} />
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold ring-1 ring-line">
              {category.archived ? <Eye size={18} /> : <EyeOff size={18} />} {category.archived ? "Show again" : "Hide"}
            </button>
          </form>
          <ConfirmButton
            action={deleteCategory}
            id={category.id}
            message={
              uses
                ? `${category.name} is used by ${uses} entr${uses === 1 ? "y" : "ies"}. They’ll be kept but show as uncategorised. Delete anyway? (Hiding keeps them categorised.)`
                : `Delete ${category.name}?`
            }
          >
            <Trash2 size={18} /> Delete
          </ConfirmButton>
          {uses > 0 && <p className="px-1 text-xs text-muted">Used by {uses} entr{uses === 1 ? "y" : "ies"}. Hiding is usually better than deleting.</p>}
        </div>
      )}
    </>
  );
}
