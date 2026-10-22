"use client";

import { useState } from "react";
import { formatCompact, formatMoney } from "@/lib/format";
import { shortMonth } from "./scale";

/** Savings per month around a zero line: above = saved, below = overspent. */
export function SavingsBars({ data, currency }: { data: { month: string; savings: number }[]; currency: string }) {
  const [active, setActive] = useState(data.length - 1);
  const W = 320;
  const H = 150;
  const top = 10;
  const bottom = 22;
  const left = 34;
  const plotH = H - top - bottom;
  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.savings)));
  const hasNeg = data.some((d) => d.savings < 0);
  const hasPos = data.some((d) => d.savings > 0);
  const zero = hasNeg && hasPos ? top + plotH / 2 : hasNeg ? top : top + plotH;
  const span = hasNeg && hasPos ? plotH / 2 : plotH;
  const band = (W - left) / data.length;
  const barW = Math.min(24, band - 12);
  const sel = data[active];

  return (
    <div>
      <p className="mb-2 text-sm">
        <span className="font-bold">{shortMonth(sel.month)}</span>{" "}
        <span className="text-muted">{sel.savings >= 0 ? "saved" : "overspent"}</span>{" "}
        <b className="tabular-nums">{formatMoney(Math.round(Math.abs(sel.savings)), currency)}</b>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Savings by month">
        <line x1={left} x2={W} y1={zero} y2={zero} className="stroke-muted" strokeWidth={1} />
        <text x={left - 4} y={zero + 3} textAnchor="end" fontSize={9} className="fill-muted">
          0
        </text>
        {hasPos && (
          <text x={left - 4} y={zero - span + 3} textAnchor="end" fontSize={9} className="fill-muted">
            {formatCompact(maxAbs)}
          </text>
        )}
        {hasNeg && (
          <text x={left - 4} y={zero + span + 3} textAnchor="end" fontSize={9} className="fill-muted">
            −{formatCompact(maxAbs)}
          </text>
        )}
        {data.map((d, i) => {
          const cx = left + band * i + band / 2;
          const h = (Math.abs(d.savings) / maxAbs) * span;
          const up = d.savings >= 0;
          const r = Math.min(4, h);
          const x = cx - barW / 2;
          const path = up
            ? `M${x},${zero} V${zero - h + r} Q${x},${zero - h} ${x + r},${zero - h} H${x + barW - r} Q${x + barW},${zero - h} ${x + barW},${zero - h + r} V${zero} Z`
            : `M${x},${zero} V${zero + h - r} Q${x},${zero + h} ${x + r},${zero + h} H${x + barW - r} Q${x + barW},${zero + h} ${x + barW},${zero + h - r} V${zero} Z`;
          const on = i === active;
          return (
            <g key={d.month} onClick={() => setActive(i)} onMouseEnter={() => setActive(i)} className="cursor-pointer">
              <rect x={cx - band / 2} y={0} width={band} height={H} fill="transparent" />
              {on && <rect x={cx - band / 2 + 2} y={top - 6} width={band - 4} height={plotH + 12} rx={6} className="fill-card-2" />}
              {h >= 0.5 && <path d={path} className={up ? "fill-chart-income" : "fill-chart-spend"} />}
              <text x={cx} y={H - 6} textAnchor="middle" fontSize={10} className={on ? "fill-ink font-bold" : "fill-muted"}>
                {shortMonth(d.month)}
              </text>
              <title>{`${shortMonth(d.month)}: ${up ? "saved" : "overspent"} ${formatMoney(Math.abs(d.savings), currency)}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
