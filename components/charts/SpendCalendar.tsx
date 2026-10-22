"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * One month of daily spending. Darker = more (one hue, five steps). Tap a day
 * for its total.
 */
export function SpendCalendar({
  month,
  days,
  currency,
  weekStartsOn,
  today,
}: {
  month: string;
  days: Record<string, number>;
  currency: string;
  weekStartsOn: number;
  today: string;
}) {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const count = new Date(y, m, 0).getDate();
  const lead = (new Date(y, m - 1, 1).getDay() - weekStartsOn + 7) % 7;
  const values = Object.values(days);
  const max = Math.max(1, ...values);
  const [active, setActive] = useState<string | null>(null);

  // 5 steps of the spend colour mixed into the card surface.
  const step = (v: number) => (v <= 0 ? 0 : Math.min(5, Math.ceil((v / max) * 5)));
  const MIX = [0, 18, 34, 52, 72, 100];

  const date = (d: number) => `${month}-${String(d).padStart(2, "0")}`;
  const sel = active ? { date: active, amount: days[active] ?? 0 } : null;

  return (
    <div>
      <p className="mb-2 h-5 text-sm">
        {sel ? (
          <>
            <span className="font-bold">
              {new Date(y, m - 1, Number(sel.date.slice(8))).toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" })}
            </span>{" "}
            <span className="text-muted">spent</span> <b className="tabular-nums">{formatMoney(sel.amount, currency)}</b>
          </>
        ) : (
          <span className="text-muted">Tap a day to see what you spent.</span>
        )}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i}>{WEEKDAYS[(weekStartsOn + i) % 7]}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`l${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const d = date(i + 1);
          const v = days[d] ?? 0;
          const s = step(v);
          const future = d > today;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setActive(active === d ? null : d)}
              aria-label={`${d}: ${formatMoney(v, currency)}`}
              className={`aspect-square rounded-lg text-[11px] font-semibold tabular-nums ${active === d ? "ring-2 ring-ink" : ""} ${
                future ? "opacity-40" : ""
              }`}
              style={{
                background: s ? `color-mix(in oklab, var(--chart-spend) ${MIX[s]}%, var(--card-2))` : "var(--card-2)",
                color: s >= 4 ? "#fff" : "var(--ink)",
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted" aria-hidden>
        Less
        {MIX.slice(1).map((p) => (
          <i key={p} className="h-2.5 w-2.5 rounded-sm" style={{ background: `color-mix(in oklab, var(--chart-spend) ${p}%, var(--card-2))` }} />
        ))}
        More
      </div>
    </div>
  );
}
