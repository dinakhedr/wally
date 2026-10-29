"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { formatMoney } from "@/lib/format";

export type MonthRow = { month: string; income: number; spending: number; savings: number; upcoming: boolean; partial: boolean };

const short = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleDateString("en", { month: "short" });
const n = (v: number) => Math.round(v).toLocaleString("en");
const signed = (v: number) => (v < 0 ? `−${n(-v)}` : n(v));

/** A year as a table of months; tick months to see their combined totals. */
export function MonthsTable({
  year,
  rows,
  currency,
  canGoForward,
}: {
  year: number;
  rows: MonthRow[];
  currency: string;
  canGoForward: boolean;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const selectable = rows.filter((r) => !r.upcoming);

  const toggle = (m: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  const allPicked = selectable.length > 0 && selectable.every((r) => picked.has(r.month));

  const summary = useMemo(() => {
    const chosen = rows.filter((r) => picked.has(r.month));
    const income = chosen.reduce((s, r) => s + r.income, 0);
    const spending = chosen.reduce((s, r) => s + r.spending, 0);
    return { chosen, income, spending, savings: income - spending };
  }, [rows, picked]);

  const grid = "grid grid-cols-[22px_minmax(0,1fr)_68px_68px_64px] items-center gap-2";

  return (
    <>
      <section className="overflow-hidden rounded-3xl bg-card ring-1 ring-line">
        <div className="flex items-center justify-between px-2 py-1.5">
          <Link href={`/insights?tab=months&year=${year - 1}`} aria-label="Previous year" className="rounded-full p-2 text-muted">
            <ChevronLeft size={20} />
          </Link>
          <span className="text-lg font-extrabold">{year}</span>
          {canGoForward ? (
            <Link href={`/insights?tab=months&year=${year + 1}`} aria-label="Next year" className="rounded-full p-2 text-muted">
              <ChevronRight size={20} />
            </Link>
          ) : (
            <span className="w-9" />
          )}
        </div>

        <div className="flex items-center justify-between px-4 pb-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Tap months to compare</span>
          {selectable.length > 0 && (
            <button
              type="button"
              onClick={() => setPicked(allPicked ? new Set() : new Set(selectable.map((r) => r.month)))}
              className="text-sm font-bold text-violet"
            >
              {allPicked ? "Clear" : "Select all"}
            </button>
          )}
        </div>

        <div className={`${grid} px-3 pb-2 text-[11px] font-bold text-muted`}>
          <span />
          <span>{currency}</span>
          <span className="flex items-center justify-end gap-1">
            <i className="h-2 w-2 rounded-full bg-chart-income" aria-hidden /> Income
          </span>
          <span className="flex items-center justify-end gap-1">
            <i className="h-2 w-2 rounded-full bg-chart-spend" aria-hidden /> Spending
          </span>
          <span className="text-right">Saved</span>
        </div>

        <ul>
          {rows.map((r) => {
            const on = picked.has(r.month);
            return (
              <li key={r.month} className="border-t border-line">
                <button
                  type="button"
                  disabled={r.upcoming}
                  onClick={() => toggle(r.month)}
                  aria-pressed={on}
                  className={`${grid} w-full px-3 py-3 text-left text-sm transition ${on ? "bg-violet-soft/60" : ""} ${r.upcoming ? "opacity-45" : ""}`}
                >
                  <span
                    className={`flex h-[22px] w-[22px] items-center justify-center rounded-[7px] border-2 ${
                      on ? "border-violet bg-violet text-white" : "border-line"
                    }`}
                    aria-hidden
                  >
                    {on && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span className={on ? "font-bold" : "font-semibold"}>
                    {short(r.month)}
                    {r.partial && <span className="block text-[10px] font-semibold text-muted">so far</span>}
                  </span>
                  <span className="text-right tabular-nums">{r.upcoming ? "—" : n(r.income)}</span>
                  <span className="text-right tabular-nums">{r.upcoming ? "—" : n(r.spending)}</span>
                  <span className="text-right font-extrabold tabular-nums">{r.upcoming ? "—" : signed(r.savings)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-3xl bg-ink p-4 text-bg" aria-live="polite">
        {summary.chosen.length ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase tracking-wide opacity-70">
                {summary.chosen.length} month{summary.chosen.length === 1 ? "" : "s"} selected
              </span>
              <span className="text-xs opacity-70">
                {summary.chosen.length === 1
                  ? short(summary.chosen[0].month)
                  : `${short(summary.chosen[0].month)} – ${short(summary.chosen[summary.chosen.length - 1].month)}`}
              </span>
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  ["Income", summary.income],
                  ["Spending", summary.spending],
                  [summary.savings >= 0 ? "Saved" : "Overspent", Math.abs(summary.savings)],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs opacity-70">{label}</dt>
                  <dd className="text-base font-extrabold tabular-nums">{n(value)}</dd>
                </div>
              ))}
            </dl>
            {summary.chosen.length > 1 && (
              <p className="mt-2 text-xs opacity-70">
                Average per month: income {formatMoney(Math.round(summary.income / summary.chosen.length), currency)} · spending{" "}
                {formatMoney(Math.round(summary.spending / summary.chosen.length), currency)}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm opacity-80">Tick one or more months to see their total income, spending and savings.</p>
        )}
      </section>
    </>
  );
}
