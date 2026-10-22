"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";

export type MonthRow = { month: string; label: string; total: string; count: string; note?: React.ReactNode; href: string; past: boolean };

/** Months as tappable rows. Past months are hidden until asked for. */
export function MonthList({ title, rows }: { title: string; rows: MonthRow[] }) {
  const [showPast, setShowPast] = useState(false);
  const past = rows.filter((r) => r.past);
  const shown = rows.filter((r) => !r.past || showPast);

  return (
    <section className="rounded-3xl bg-card p-4 ring-1 ring-line">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
        {past.length > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted">
            Show past months
            <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} className="peer sr-only" />
            <span className="relative h-5 w-9 rounded-full bg-card-2 ring-1 ring-line transition peer-checked:bg-violet after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
          </label>
        )}
      </div>
      <ul className="mt-2 divide-y divide-line">
        {shown.map((r) => (
          <li key={r.month}>
            <Link href={r.href} className={`flex items-center gap-3 px-1 py-3 ${r.past ? "opacity-70" : ""}`}>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {r.label}
                  {r.past && <span className="ml-2 text-xs font-normal text-muted">past</span>}
                </span>
                <span className="block text-xs text-muted">{r.count}</span>
                {r.note}
              </span>
              <span className="shrink-0 font-bold tabular-nums">{r.total}</span>
              <ChevronRight size={18} className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
