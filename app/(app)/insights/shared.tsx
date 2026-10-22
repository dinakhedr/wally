import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { change } from "@/lib/insights";
import { formatMoney } from "@/lib/format";
import type { Entry } from "@/lib/types";
import type { BillPayment, InstallmentPayment } from "@/lib/insights";

export type Shared = {
  months: string[];
  entries: Entry[];
  billPayments: BillPayment[];
  installmentPayments: InstallmentPayment[];
  currency: string;
  today: string;
};

/** A headline number with its change vs last month. */
export function StatTile({
  label,
  value,
  previous,
  currency,
  tone,
}: {
  label: string;
  value: number;
  previous: number | undefined;
  currency: string;
  tone: string;
}) {
  const pct = previous == null ? null : change(value, previous);
  const up = pct != null && pct > 0;
  return (
    <div className={`rounded-3xl p-4 ${tone}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 truncate text-lg font-extrabold tabular-nums">{formatMoney(value, currency)}</p>
      <p className="mt-0.5 flex items-center gap-0.5 text-xs text-muted">
        {pct == null ? (
          "No data last month"
        ) : (
          <>
            {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span className="font-semibold text-ink">{Math.abs(Math.round(pct))}%</span>&nbsp;
            vs last month
          </>
        )}
      </p>
    </div>
  );
}

/** Expenses / bills / installments as one segmented bar with values. */
export function SpendSplit({
  expenses,
  bills,
  installments,
  currency,
}: {
  expenses: number;
  bills: number;
  installments: number;
  currency: string;
}) {
  const parts = [
    { label: "Expenses", value: expenses, color: "var(--cat-1)" },
    { label: "Bills", value: bills, color: "var(--cat-2)" },
    { label: "Installments", value: installments, color: "var(--cat-3)" },
  ];
  const total = expenses + bills + installments;
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-card-2" role="img" aria-label="Spending split">
        {total > 0 &&
          parts
            .filter((p) => p.value > 0)
            .map((p) => <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <i className="h-3 w-3 rounded-sm" style={{ background: p.color }} aria-hidden />
            <span className="flex-1">{p.label}</span>
            <span className="text-xs text-muted tabular-nums">{total ? Math.round((p.value / total) * 100) : 0}%</span>
            <span className="w-28 text-right font-semibold tabular-nums">{formatMoney(p.value, currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
