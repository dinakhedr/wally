"use client";

import { useState } from "react";
import { formatCompact, formatMoney } from "@/lib/format";
import { niceTicks, shortMonth } from "./scale";

type Datum = { month: string; income: number; spending: number };

/** Income vs spending per month: paired bars, one shared axis. Tap a month for its values. */
export function MonthBars({ data, currency }: { data: Datum[]; currency: string }) {
  const [active, setActive] = useState(data.length - 1);
  const W = 320;
  const H = 150;
  const top = 8;
  const bottom = 22;
  const left = 34;
  const plotH = H - top - bottom;
  const ticks = niceTicks(Math.max(1, ...data.flatMap((d) => [d.income, d.spending])));
  const max = ticks[ticks.length - 1];
  const band = (W - left) / data.length;
  const barW = Math.min(14, (band - 10) / 2);
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const sel = data[active];

  return (
    <div>
      <p className="text-sm font-bold">
        {new Date(Number(sel.month.slice(0, 4)), Number(sel.month.slice(5, 7)) - 1, 1).toLocaleDateString("en", { month: "long", year: "numeric" })}
      </p>
      <div className="mb-2 mt-1 grid grid-cols-2 gap-2 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-chart-income" aria-hidden /> Income
          <b className="text-ink tabular-nums">{formatMoney(Math.round(sel.income), currency)}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-chart-spend" aria-hidden /> Spent
          <b className="text-ink tabular-nums">{formatMoney(Math.round(sel.spending), currency)}</b>
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
          const on = i === active;
          return (
            <g key={d.month} onClick={() => setActive(i)} onMouseEnter={() => setActive(i)} className="cursor-pointer">
              <rect x={cx - band / 2} y={top} width={band} height={plotH + bottom} fill="transparent" />
              {on && <rect x={cx - band / 2 + 2} y={top} width={band - 4} height={plotH} rx={6} className="fill-card-2" />}
              <Bar x={cx - barW - 1} w={barW} y={y(d.income)} base={y(0)} className="fill-chart-income" />
              <Bar x={cx + 1} w={barW} y={y(d.spending)} base={y(0)} className="fill-chart-spend" />
              <text x={cx} y={H - 6} textAnchor="middle" fontSize={10} className={on ? "fill-ink font-bold" : "fill-muted"}>
                {shortMonth(d.month)}
              </text>
              <title>{`${shortMonth(d.month)}: income ${formatMoney(d.income, currency)}, spent ${formatMoney(d.spending, currency)}`}</title>
            </g>
          );
        })}
      </svg>
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
