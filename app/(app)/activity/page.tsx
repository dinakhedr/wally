import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { EntryRow } from "@/components/EntryRow";
import { PageHeader } from "@/components/PageHeader";
import { getEntries, getPlanPayments, getProfile, totals } from "@/lib/data";
import { dayLabel, formatMoney, monthBounds } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";
import { getNow } from "@/lib/today";
import type { Entry } from "@/lib/types";

type Params = { q?: string; type?: string; month?: string };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
] as const;

function href(params: Params, patch: Partial<Params>) {
  const next = { ...params, ...patch };
  const qs = new URLSearchParams();
  if (next.q) qs.set("q", next.q);
  if (next.type && next.type !== "all") qs.set("type", next.type);
  if (next.month) qs.set("month", next.month);
  const s = qs.toString();
  return s ? `/activity?${s}` : "/activity";
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const now = await getNow();

  const [y, m] = (/^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : monthKey(now)).split("-").map(Number);
  const monthDate = new Date(y, m - 1, 1);
  const { start, end } = monthBounds(monthDate);
  const prev = monthKey(new Date(y, m - 2, 1));
  const next = monthKey(new Date(y, m, 1));
  const isCurrent = monthKey(monthDate) === monthKey(now);
  const kind = params.type === "expense" || params.type === "income" ? params.type : "all";

  const [profile, entries, monthTotals, paid] = await Promise.all([
    getProfile(supabase, user.id),
    getEntries(supabase, { from: start, to: end, kind, search: params.q?.trim() }),
    getEntries(supabase, { from: start, to: end }),
    getPlanPayments(supabase, start, end),
  ]);
  const { currency } = profile;
  // Month totals ignore the search/filter; spending includes bills and installments paid.
  const { spent: expensesSpent, earned } = totals(monthTotals);
  const spent = expensesSpent + paid.bills + paid.installments;

  // Income by category, largest first; beyond four, the rest are grouped.
  const bySource = new Map<string, number>();
  for (const e of monthTotals)
    if (e.kind === "income") bySource.set(e.category?.name ?? "Other", (bySource.get(e.category?.name ?? "Other") ?? 0) + e.amount);
  const sources = [...bySource].sort((a, b) => b[1] - a[1]);
  const earnedRows: [string, number][] =
    sources.length > 4 ? [...sources.slice(0, 3), ["Other", sources.slice(3).reduce((n, [, v]) => n + v, 0)]] : sources;

  const days = new Map<string, Entry[]>();
  for (const e of entries) days.set(e.date, [...(days.get(e.date) ?? []), e]);

  return (
    <>
      <PageHeader title="Activity" profile={profile} />

      {/* Month switcher + totals */}
      <div className="flex items-center justify-between rounded-3xl bg-card p-2 ring-1 ring-line">
        <Link href={href(params, { month: prev })} aria-label="Previous month" className="rounded-full p-2 text-muted">
          <ChevronLeft size={20} />
        </Link>
        <p className="font-bold">{monthDate.toLocaleDateString("en", { month: "long", year: "numeric" })}</p>
        {isCurrent ? (
          <span className="w-9" />
        ) : (
          <Link href={href(params, { month: next })} aria-label="Next month" className="rounded-full p-2 text-muted">
            <ChevronRight size={20} />
          </Link>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-coral-soft p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-coral">Spent</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums">{formatMoney(Math.round(spent), currency)}</p>
          <dl className="mt-2 space-y-0.5 text-xs text-muted">
            {[
              ["Expenses", expensesSpent],
              ["Bills", paid.bills],
              ["Installments", paid.installments],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between gap-2">
                <dt>{label}</dt>
                <dd className="font-semibold tabular-nums text-ink">{formatMoney(Math.round(value as number), currency)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-2xl bg-mint-soft p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-mint">Earned</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums">{formatMoney(Math.round(earned), currency)}</p>
          <dl className="mt-2 space-y-0.5 text-xs text-muted">
            {earnedRows.length ? (
              earnedRows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="truncate">{label}</dt>
                  <dd className="shrink-0 font-semibold tabular-nums text-ink">{formatMoney(Math.round(value), currency)}</dd>
                </div>
              ))
            ) : (
              <div>No income this month</div>
            )}
          </dl>
        </div>
      </div>

      {/* Search + filters */}
      <form action="/activity" className="mt-4">
        {params.month && <input type="hidden" name="month" value={params.month} />}
        {kind !== "all" && <input type="hidden" name="type" value={kind} />}
        <label className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-violet">
          <Search size={18} className="text-muted" />
          <input
            name="q"
            type="search"
            defaultValue={params.q}
            placeholder="Search notes, categories, amounts"
            className="w-full bg-transparent outline-none placeholder:text-muted"
          />
        </label>
      </form>
      <div className="mt-3 flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={href(params, { type: f.value })}
            className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${
              kind === f.value ? "bg-violet text-white ring-violet" : "bg-card ring-line"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* List */}
      {days.size ? (
        [...days].map(([date, list]) => {
          const t = totals(list);
          return (
            <section key={date} className="mt-6">
              <div className="mb-1 flex justify-between px-1 text-sm font-bold text-muted">
                <h2>{dayLabel(date, now)}</h2>
                {t.spent > 0 && <span className="tabular-nums">{formatMoney(-t.spent, currency)}</span>}
              </div>
              <ul className="divide-y divide-line rounded-3xl bg-card px-4 ring-1 ring-line">
                {list.map((e) => (
                  <EntryRow
                    key={`${e.kind}-${e.id}`}
                    entry={e}
                    currency={currency}
                    editable
                    action={<DeleteButton id={e.id} kind={e.kind} />}
                  />
                ))}
              </ul>
            </section>
          );
        })
      ) : (
        <p className="mt-12 text-center text-muted">
          {params.q ? `Nothing matches “${params.q}” this month.` : "Nothing here yet for this month."}
        </p>
      )}
    </>
  );
}
