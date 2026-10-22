"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";

export type Slice = { key: string; label: string; emoji: string; amount: number };

const SLOTS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)", "var(--cat-6)"];
const OTHER = "var(--cat-other)";

/**
 * Category share as a donut: the six largest in fixed colour order, the rest
 * folded into "Other". The legend below doubles as the table of values.
 */
export function Donut({ slices, currency, total }: { slices: Slice[]; currency: string; total: number }) {
  const top = slices.slice(0, 6);
  const rest = slices.slice(6);
  const shown = rest.length
    ? [...top, { key: "__other", label: `Other (${rest.length})`, emoji: "•", amount: rest.reduce((n, s) => n + s.amount, 0) }]
    : top;
  const colors = shown.map((s, i) => (s.key === "__other" ? OTHER : SLOTS[i]));
  const [active, setActive] = useState<number | null>(null);

  const R = 70;
  const r = 46;
  const C = 2 * Math.PI * ((R + r) / 2);
  let offset = 0;
  const sum = shown.reduce((n, s) => n + s.amount, 0) || 1;
  const sel = active == null ? null : shown[active];

  return (
    <div>
      <div className="relative mx-auto h-52 w-52">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" role="img" aria-label="Spending by category">
          {shown.map((s, i) => {
            const len = (s.amount / sum) * C;
            const gap = shown.length > 1 ? Math.min(2, len / 2) : 0;
            const el = (
              <circle
                key={s.key}
                cx={80}
                cy={80}
                r={(R + r) / 2}
                fill="none"
                stroke={colors[i]}
                strokeWidth={active === i ? R - r + 6 : R - r}
                strokeDasharray={`${Math.max(0, len - gap)} ${C}`}
                strokeDashoffset={-offset}
                onClick={() => setActive(active === i ? null : i)}
                onMouseEnter={() => setActive(i)}
                className="cursor-pointer transition-[stroke-width]"
              >
                <title>{`${s.label}: ${formatMoney(s.amount, currency)}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="max-w-28 truncate text-xs text-muted">{sel ? sel.label : "Total"}</span>
          <span className="text-sm font-extrabold tabular-nums">{formatMoney(Math.round(sel ? sel.amount : total), currency)}</span>
          {sel && <span className="text-xs text-muted">{Math.round((sel.amount / sum) * 100)}%</span>}
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 text-sm">
        {shown.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => setActive(active === i ? null : i)}
              className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left ${active === i ? "bg-card-2" : ""}`}
            >
              <i className="h-3 w-3 shrink-0 rounded-sm" style={{ background: colors[i] }} aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                {s.emoji} {s.label}
              </span>
              <span className="text-xs text-muted tabular-nums">{Math.round((s.amount / sum) * 100)}%</span>
              <span className="w-28 text-right font-semibold tabular-nums">{formatMoney(Math.round(s.amount), currency)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
