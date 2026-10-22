import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { CategoryBubble } from "@/components/CategoryBubble";
import { BackHeader } from "@/components/forms/BackHeader";
import { Segmented } from "@/components/Segmented";
import { getProfile } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind: k } = await searchParams;
  const kind = k === "income" ? "income" : "expense";
  const { supabase, user } = await requireUser();
  const [profile, { data }] = await Promise.all([
    getProfile(supabase, user.id),
    supabase.from("categories").select("id, kind, name, emoji, color, budget, sort_order, archived, last_used_at").eq("kind", kind).order("sort_order"),
  ]);
  const all = (data ?? []).map((c) => ({ ...c, budget: c.budget == null ? null : Number(c.budget) })) as Category[];
  const shown = all.filter((c) => !c.archived);
  const hidden = all.filter((c) => c.archived);

  const row = (c: Category) => (
    <li key={c.id}>
      <Link href={`/settings/categories/${c.id}`} className={`flex items-center gap-3 py-3 ${c.archived ? "opacity-60" : ""}`}>
        <CategoryBubble emoji={c.emoji} color={c.color} size="sm" />
        <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
        {c.budget != null && <span className="text-xs text-muted tabular-nums">Budget {formatMoney(c.budget, profile.currency)}</span>}
        <ChevronRight size={18} className="text-muted" />
      </Link>
    </li>
  );

  return (
    <>
      <BackHeader href="/settings" title="Categories" />
      <Segmented
        active={kind}
        tabs={[
          { key: "expense", label: "Expenses", href: "/settings/categories" },
          { key: "income", label: "Income", href: "/settings/categories?kind=income" },
        ]}
      />
      <Link
        href={`/settings/categories/new?kind=${kind}`}
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-card py-3.5 font-bold text-violet ring-1 ring-line"
      >
        <Plus size={18} /> Add a category
      </Link>
      {kind === "expense" && <p className="mt-3 px-1 text-xs text-muted">Tap a category to set a monthly budget for it.</p>}
      <ul className="mt-3 divide-y divide-line rounded-3xl bg-card px-4 ring-1 ring-line">{shown.map(row)}</ul>
      {hidden.length > 0 && (
        <>
          <h2 className="mt-6 px-1 text-sm font-bold uppercase tracking-wide text-muted">Hidden</h2>
          <p className="px-1 text-xs text-muted">Not shown when adding, but kept on past entries.</p>
          <ul className="mt-2 divide-y divide-line rounded-3xl bg-card px-4 ring-1 ring-line">{hidden.map(row)}</ul>
        </>
      )}
    </>
  );
}
