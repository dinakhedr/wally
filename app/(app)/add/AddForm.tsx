"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { CalendarDays, Delete, LayoutGrid, PencilLine, Search, X } from "lucide-react";
import { addEntry, type AddState } from "@/app/actions";
import { CategoryBubble } from "@/components/CategoryBubble";
import { parseISODate, toISODate } from "@/lib/format";
import type { Category, Kind } from "@/lib/types";

const RECENT = 3;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;

/** Applies one keypad press to the amount text: max 2 decimals, 10 digits. */
function press(value: string, key: (typeof KEYS)[number]) {
  if (key === "back") return value.slice(0, -1);
  if (key === ".") return value.includes(".") ? value : (value || "0") + ".";
  const [whole, cents] = value.split(".");
  if (cents !== undefined && cents.length >= 2) return value;
  if (cents === undefined && whole.replace(/^0+/, "").length >= 10) return value;
  return value === "0" ? key : value + key;
}

const pretty = (value: string) => {
  if (!value) return "0";
  const [whole, cents] = value.split(".");
  const grouped = Number(whole || "0").toLocaleString("en");
  return cents !== undefined ? `${grouped}.${cents}` : grouped;
};

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
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const ofKind = useMemo(() => categories.filter((c) => c.kind === kind), [categories, kind]);
  const selected = ofKind.find((c) => c.id === categoryId) ?? null;

  // The 3 most recent; a category picked from "All" takes the last spot so it stays visible.
  const recent = useMemo(() => {
    const top = ofKind.slice(0, RECENT);
    if (selected && !top.some((c) => c.id === selected.id)) top[top.length - 1] = selected;
    return top;
  }, [ofKind, selected]);

  const yesterday = (() => {
    const d = parseISODate(today);
    d.setDate(d.getDate() - 1);
    return toISODate(d);
  })();
  const dateText =
    date === today ? "Today" : date === yesterday ? "Yesterday" : parseISODate(date).toLocaleDateString("en", { day: "numeric", month: "short" });

  const expense = kind === "expense";

  function switchKind(k: Kind) {
    setKind(k);
    setCategoryId(null);
  }

  return (
    <form action={formAction} className="fixed inset-0 z-40 overflow-y-auto bg-bg">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="category_id" value={categoryId ?? ""} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="date" value={date} />
      {!noteOpen && <input type="hidden" name="note" value={note} />}

      <div className="pb-safe mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-4">
        {/* Header */}
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
                className={`rounded-full px-5 py-2 transition ${kind === k ? (k === "expense" ? "bg-coral text-white" : "bg-mint text-white") : "text-muted"}`}
              >
                {k === "expense" ? "Expense" : "Income"}
              </button>
            ))}
          </div>
          <span className="w-10" />
        </div>

        {/* 1. Category */}
        <p className="mt-5 px-1 text-xs font-bold uppercase tracking-wide text-muted">Category</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {recent.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              aria-pressed={c.id === categoryId}
              className={`flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 transition active:scale-95 ${
                c.id === categoryId ? "bg-violet-soft ring-2 ring-violet" : "bg-card ring-1 ring-line"
              }`}
            >
              <CategoryBubble emoji={c.emoji} color={c.color} size="sm" />
              <span className="w-full truncate text-center text-[11px] font-bold">{c.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 ring-1 ring-line transition active:scale-95"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card-2 text-violet">
              <LayoutGrid size={18} />
            </span>
            <span className="text-[11px] font-bold text-violet">All</span>
          </button>
        </div>

        {/* 2. Amount */}
        <div className="mt-6 flex items-baseline justify-center gap-2" aria-live="polite">
          <span className={`text-lg font-extrabold ${expense ? "text-coral" : "text-mint"}`}>{currency}</span>
          <span className={`text-5xl font-extrabold tracking-tight tabular-nums ${amount ? "" : "text-line"}`}>{pretty(amount)}</span>
        </div>

        {/* Date + note */}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <label className="relative flex cursor-pointer items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-xs font-bold ring-1 ring-line">
            <CalendarDays size={14} /> {dateText}
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="absolute inset-0 opacity-0"
              aria-label="Date"
            />
          </label>
          {date === today && (
            <button type="button" onClick={() => setDate(yesterday)} className="rounded-full px-3.5 py-1.5 text-xs font-bold text-muted ring-1 ring-line">
              Yesterday?
            </button>
          )}
          {!noteOpen && (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className={`flex max-w-[12rem] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 ring-line ${note ? "bg-card" : "text-muted"}`}
            >
              <PencilLine size={14} /> <span className="truncate">{note || "Add note"}</span>
            </button>
          )}
        </div>
        {noteOpen && (
          <div className="mt-3 flex gap-2">
            <input
              name="note"
              autoFocus
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), setNoteOpen(false))}
              placeholder="Note (optional)"
              className="min-w-0 flex-1 rounded-2xl bg-card px-4 py-2.5 ring-1 ring-line outline-none focus:ring-2 focus:ring-violet"
            />
            <button type="button" onClick={() => setNoteOpen(false)} className="rounded-2xl bg-card-2 px-4 text-sm font-bold">
              Done
            </button>
          </div>
        )}

        {state?.error && <p className="mt-3 text-center text-sm font-semibold text-coral">{state.error}</p>}

        {/* Keypad */}
        <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setAmount((v) => press(v, k))}
              aria-label={k === "back" ? "Delete digit" : k === "." ? "Decimal point" : k}
              className={`flex h-14 items-center justify-center rounded-2xl text-2xl font-bold transition active:scale-95 ${
                k === "back" || k === "." ? "bg-card-2 text-muted" : "bg-card ring-1 ring-line"
              }`}
            >
              {k === "back" ? <Delete size={22} /> : k}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={pending}
          className={`mb-4 mt-3 w-full rounded-2xl py-4 text-lg font-bold text-white shadow-lg transition active:scale-[.98] disabled:opacity-60 ${
            expense ? "bg-coral shadow-coral/30" : "bg-mint shadow-mint/30"
          }`}
        >
          {pending ? "Saving…" : expense ? "Add expense" : "Add income"}
        </button>
      </div>

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
    return [...categories].sort((a, b) => a.name.localeCompare(b.name)).filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [categories, query]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg" role="dialog" aria-label="All categories">
      <div className="mx-auto max-w-md px-4 pt-4 pb-16">
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
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              aria-pressed={c.id === selectedId}
              className={`flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 transition active:scale-95 ${
                c.id === selectedId ? "bg-violet-soft ring-2 ring-violet" : "bg-card ring-1 ring-line"
              }`}
            >
              <CategoryBubble emoji={c.emoji} color={c.color} />
              <span className="w-full truncate text-center text-xs font-semibold">{c.name}</span>
            </button>
          ))}
        </div>
        {!shown.length && <p className="mt-8 text-center text-sm text-muted">No category called “{query}”.</p>}
      </div>
    </div>
  );
}
