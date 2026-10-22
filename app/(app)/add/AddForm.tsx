"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { CalendarDays, LayoutGrid, Search, X } from "lucide-react";
import { addEntry, type AddState } from "@/app/actions";
import { CategoryBubble } from "@/components/CategoryBubble";
import { parseISODate, toISODate } from "@/lib/format";
import type { Category, Kind } from "@/lib/types";

const GRID_SIZE = 7;

function currencySymbol(currency: string) {
  try {
    return (
      new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}

export function AddForm({
  categories,
  currency,
  today,
  initialKind,
  initialCategoryId,
}: {
  categories: Category[]; // already sorted most-recent first
  currency: string;
  today: string;
  initialKind: Kind;
  initialCategoryId: string | null;
}) {
  const [state, formAction, pending] = useActionState<AddState, FormData>(addEntry, null);
  const [kind, setKind] = useState<Kind>(initialKind);
  const [categoryId, setCategoryId] = useState<string | null>(initialCategoryId);
  const [date, setDate] = useState(today);
  const [showAll, setShowAll] = useState(false);

  const ofKind = useMemo(() => categories.filter((c) => c.kind === kind), [categories, kind]);
  const selected = ofKind.find((c) => c.id === categoryId) ?? null;

  // Top picks; if the chosen category came from "More", swap it into the last slot.
  const grid = useMemo(() => {
    const top = ofKind.slice(0, GRID_SIZE);
    if (selected && !top.some((c) => c.id === selected.id)) top[top.length - 1] = selected;
    return top;
  }, [ofKind, selected]);

  const yesterday = (() => {
    const d = parseISODate(today);
    d.setDate(d.getDate() - 1);
    return toISODate(d);
  })();

  const accent = kind === "expense" ? "coral" : "mint";

  function switchKind(k: Kind) {
    setKind(k);
    setCategoryId(null);
  }

  return (
    <form action={formAction} className="pt-6">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="category_id" value={categoryId ?? ""} />
      <input type="hidden" name="date" value={date} />

      <div className="flex items-center justify-between">
        <Link href="/" aria-label="Close" className="-ml-2 rounded-full p-2 text-muted">
          <X size={24} />
        </Link>
        <div className="flex rounded-full bg-card-2 p-1 text-sm font-bold">
          {(["expense", "income"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => switchKind(k)}
              aria-pressed={kind === k}
              className={`rounded-full px-5 py-2 transition ${
                kind === k ? (k === "expense" ? "bg-coral text-white" : "bg-mint text-white") : "text-muted"
              }`}
            >
              {k === "expense" ? "Expense" : "Income"}
            </button>
          ))}
        </div>
        <span className="w-10" />
      </div>

      {/* Amount */}
      <label className="mt-8 flex items-baseline justify-center gap-2">
        <span className={`text-2xl font-bold ${accent === "coral" ? "text-coral" : "text-mint"}`}>
          {currencySymbol(currency)}
        </span>
        <input
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          placeholder="0"
          aria-label="Amount"
          className="w-full max-w-[14rem] bg-transparent text-center text-6xl font-extrabold tracking-tight tabular-nums outline-none placeholder:text-line"
          style={{ fontSize: "3.75rem" }}
        />
      </label>

      {/* Categories */}
      <div className="mt-8 grid grid-cols-4 gap-2">
        {grid.map((c) => (
          <CategoryTile key={c.id} category={c} selected={c.id === categoryId} onSelect={() => setCategoryId(c.id)} />
        ))}
        {ofKind.length > GRID_SIZE && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="flex flex-col items-center gap-1.5 rounded-2xl py-3 ring-1 ring-line transition active:scale-95"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card-2 text-muted">
              <LayoutGrid size={20} />
            </span>
            <span className="text-xs font-semibold text-muted">More</span>
          </button>
        )}
      </div>

      {/* Date */}
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
        <Chip active={date === today} onClick={() => setDate(today)}>Today</Chip>
        <Chip active={date === yesterday} onClick={() => setDate(yesterday)}>Yesterday</Chip>
        <label
          className={`relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
            date !== today && date !== yesterday ? "bg-violet text-white ring-violet" : "bg-card text-ink ring-line"
          }`}
        >
          <CalendarDays size={16} />
          {date !== today && date !== yesterday
            ? parseISODate(date).toLocaleDateString("en", { day: "numeric", month: "short" })
            : "Pick date"}
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="absolute inset-0 opacity-0"
            aria-label="Pick a date"
          />
        </label>
      </div>

      {/* Note */}
      <input
        name="note"
        maxLength={200}
        placeholder="Add a note (optional)"
        className="mt-4 w-full rounded-2xl bg-card px-4 py-3.5 ring-1 ring-line outline-none placeholder:text-muted focus:ring-2 focus:ring-violet"
      />

      {state?.error && <p className="mt-4 text-center text-sm font-semibold text-coral">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className={`mt-6 w-full rounded-2xl py-4 text-lg font-bold text-white shadow-lg transition active:scale-[.98] disabled:opacity-60 ${
          kind === "expense" ? "bg-coral shadow-coral/30" : "bg-mint shadow-mint/30"
        }`}
      >
        {pending ? "Saving…" : kind === "expense" ? "Add expense" : "Add income"}
      </button>

      {showAll && (
        <AllCategories
          categories={ofKind}
          selectedId={categoryId}
          onPick={(id) => {
            setCategoryId(id);
            setShowAll(false);
          }}
          onClose={() => setShowAll(false)}
        />
      )}
    </form>
  );
}

function CategoryTile({ category, selected, onSelect }: { category: Category; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 transition active:scale-95 ${
        selected ? "bg-violet-soft ring-2 ring-violet" : "bg-card ring-1 ring-line"
      }`}
    >
      <CategoryBubble emoji={category.emoji} color={category.color} />
      <span className="w-full truncate px-1 text-center text-xs font-semibold">{category.name}</span>
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
        active ? "bg-violet text-white ring-violet" : "bg-card ring-line"
      }`}
    >
      {children}
    </button>
  );
}

function AllCategories({
  categories,
  selectedId,
  onPick,
  onClose,
}: {
  categories: Category[];
  selectedId: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...categories]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [categories, query]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg" role="dialog" aria-label="All categories">
      <div className="mx-auto max-w-md px-4 pt-6 pb-16">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} aria-label="Back" className="-ml-2 rounded-full p-2 text-muted">
            <X size={24} />
          </button>
          <h2 className="text-xl font-extrabold">All categories</h2>
        </div>
        <label className="mt-4 flex items-center gap-2 rounded-2xl bg-card px-4 py-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-violet">
          <Search size={18} className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories"
            className="w-full bg-transparent outline-none placeholder:text-muted"
          />
        </label>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {shown.map((c) => (
            <CategoryTile key={c.id} category={c} selected={c.id === selectedId} onSelect={() => onPick(c.id)} />
          ))}
        </div>
        {!shown.length && <p className="mt-8 text-center text-sm text-muted">No category called “{query}”.</p>}
      </div>
    </div>
  );
}
