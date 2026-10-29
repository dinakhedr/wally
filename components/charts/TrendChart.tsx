"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { formatCompact, formatMoney } from "@/lib/format";
import type { MonthTotals } from "@/lib/insights";
import { niceTicks, shortMonth } from "./scale";

const longMonth = (month: string) =>
  new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString("en", { month: "long", year: "numeric" });

/**
 * Income vs spending per month, one shared axis. Switch between the last 6
 * months and this year (January to now); tap a month for its totals.
 */
export function TrendChart({ six, year, currency }: { six: MonthTotals[]; year: MonthTotals[]; currency: string }) {
  const [range, setRange] = useState<"six" | "year">("six");
  const [open, setOpen] = useState<MonthTotals | null>(null);
  const data = range === "six" ? six : year;

  const W = 320;
  const H = 160;
  const top = 8;
  const bottom = 22;
  const left = 34;
  const plotH = H - top - bottom;
  const ticks = niceTicks(Math.max(1, ...data.flatMap((d) => [d.income, d.spending])));
  const max = ticks[ticks.length - 1];
  const band = (W - left) / data.length;
  const barW = Math.max(4, Math.min(14, (band - 8) / 2));
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const sum = (k: "income" | "spending" | "savings") => year.reduce((n, m) => n + m[k], 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{range === "six" ? "Trend" : `Trend · ${year[0]?.month.slice(0, 4)}`}</h2>
        <div className="flex rounded-full bg-card-2 p-0.5 text-xs font-bold" role="radiogroup" aria-label="Range">
          {(
            [
              ["six", "6 months"],
              ["year", "This year"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={range === value}
              onClick={() => setRange(value)}
              className={`rounded-full px-3 py-1.5 transition ${range === value ? "bg-card text-ink shadow-sm" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-1 mt-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm bg-chart-income" aria-hidden /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm bg-chart-spend" aria-hidden /> Spending
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Income and spending by month">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
            <text x={left - 4} y={y(t) + 3} textAnchor="end" className="fill-muted" fontSize={9}>
              {formatCompact(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = left + band * i + band / 2;
          const label = data.length > 7 ? shortMonth(d.month).charAt(0) : shortMonth(d.month);
          return (
            <g key={d.month} onClick={() => setOpen(d)} className="cursor-pointer" role="button" aria-label={`${longMonth(d.month)} details`}>
              <rect x={cx - band / 2} y={top} width={band} height={plotH + bottom} fill="transparent" />
              <Bar x={cx - barW - 1} w={barW} y={y(d.income)} base={y(0)} className="fill-chart-income" />
              <Bar x={cx + 1} w={barW} y={y(d.spending)} base={y(0)} className="fill-chart-spend" />
              <text x={cx} y={H - 6} textAnchor="middle" fontSize={10} className={i === data.length - 1 ? "fill-ink font-bold" : "fill-muted"}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {range === "year" ? (
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
          {(
            [
              ["Income", sum("income")],
              ["Spent", sum("spending")],
              ["Saved", sum("savings")],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</dt>
              <dd className="text-base font-extrabold tabular-nums">{Math.round(value).toLocaleString("en")}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="mt-2 text-center text-xs text-muted">Tap a month for its totals</p>

      {open && <MonthSheet month={open} currency={currency} onClose={() => setOpen(null)} />}
    </div>
  );
}

function MonthSheet({ month, currency, onClose }: { month: MonthTotals; currency: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fmt = (n: number) => formatMoney(Math.round(n), currency);
  const rate = month.income > 0 ? Math.round((month.savings / month.income) * 100) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${longMonth(month.month)} totals`}
        onClick={(e) => e.stopPropagation()}
        className="pb-safe w-full max-w-md rounded-t-[28px] bg-card px-5 pt-3"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{longMonth(month.month)}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full bg-card-2 p-2 text-muted">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-mint-soft p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Income</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums">{fmt(month.income)}</p>
          </div>
          <div className="rounded-2xl bg-coral-soft p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Spending</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums">{fmt(month.spending)}</p>
          </div>
        </div>
        <dl className="mt-3 space-y-1 pl-1 text-sm text-muted">
          {(
            [
              ["Expenses", month.expenses],
              ["Bills", month.bills],
              ["Installments", month.installments],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <dt>{label}</dt>
              <dd className="tabular-nums">{fmt(value)}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <span className="font-bold">{month.savings >= 0 ? "Saved" : "Overspent"}</span>
          <span className="text-lg font-extrabold tabular-nums">
            {fmt(Math.abs(month.savings))}
            {rate != null && month.savings >= 0 && <span className="ml-1 text-sm font-semibold text-muted">· {rate}%</span>}
          </span>
        </div>
        <Link
          href={`/insights?tab=spending&month=${month.month}`}
          className="mb-6 mt-4 block rounded-2xl bg-violet-soft py-3.5 text-center font-bold text-violet"
        >
          See {shortMonth(month.month)} spending ›
        </Link>
      </section>
    </div>
  );
}

/** A bar with a 4px rounded top, square at the baseline. */
function Bar({ x, w, y, base, className }: { x: number; w: number; y: number; base: number; className: string }) {
  const h = Math.max(0, base - y);
  if (h < 0.5) return null;
  const r = Math.min(4, w / 2, h);
  return (
    <path
      d={`M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`}
      className={className}
    />
  );
}
