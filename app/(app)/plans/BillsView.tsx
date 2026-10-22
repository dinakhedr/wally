import Link from "next/link";
import { Pause, Plus } from "lucide-react";
import { Card } from "@/components/Card";
import { CategoryBubble } from "@/components/CategoryBubble";
import { BillLineRow } from "@/components/plans/BillLineRow";
import { MonthList } from "@/components/plans/MonthList";
import type { Bill } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { monthLabel } from "@/lib/plans";
import { billSchedule, linesTotal } from "@/lib/schedule";

export function BillsView({ bills, today, currency }: { bills: Bill[]; today: string; currency: string }) {
  const { byMonth, thisMonth, past, future } = billSchedule(bills, today);
  const current = byMonth.get(thisMonth) ?? [];
  const paused = bills.filter((b) => !b.active);
  const paid = current.reduce((n, l) => n + (l.kind === "paid" ? l.amount : 0), 0);
  const left = current.reduce((n, l) => n + (l.kind === "due" ? l.bill.amount : 0), 0);
  const year = (m: string) => m.slice(0, 4) !== thisMonth.slice(0, 4);

  const rows = [...future, ...past]
    .filter((m) => byMonth.get(m)?.length)
    .map((m) => {
      const lines = byMonth.get(m)!;
      return {
        month: m,
        label: monthLabel(m, { year: year(m) }),
        total: formatMoney(linesTotal(lines), currency),
        count: `${lines.length} bill${lines.length === 1 ? "" : "s"}`,
        href: `/plans/month/${m}`,
        past: m < thisMonth,
      };
    });

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-sky-soft p-5">
        <p className="text-sm font-semibold text-sky">{monthLabel(thisMonth)} bills</p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums">{formatMoney(linesTotal(current), currency)}</p>
        <p className="mt-1 text-sm text-muted">
          Paid {formatMoney(paid, currency)} · Left {formatMoney(left, currency)}
        </p>
      </section>

      <Link href="/plans/bills/new" className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3.5 font-bold text-violet ring-1 ring-line">
        <Plus size={18} /> Add a bill
      </Link>

      {!bills.length && <p className="py-8 text-center text-muted">No bills yet. Add rent, subscriptions or anything that repeats.</p>}

      {current.length > 0 && (
        <Card className="!p-4">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="font-bold">{monthLabel(thisMonth)}</h2>
            <span className="text-sm font-bold tabular-nums text-muted">{formatMoney(linesTotal(current), currency)}</span>
          </div>
          <ul className="mt-1 divide-y divide-line">
            {current.map((l) => (
              <BillLineRow key={`${l.kind}-${l.bill.id}-${l.date}`} line={l} currency={currency} today={today} back="/plans" />
            ))}
          </ul>
        </Card>
      )}

      {rows.length > 0 && <MonthList title="Coming months" rows={rows} />}

      {paused.length > 0 && (
        <Card className="!p-4">
          <h2 className="flex items-center gap-2 px-1 font-bold text-muted">
            <Pause size={16} /> Paused
          </h2>
          <ul className="mt-1 divide-y divide-line">
            {paused.map((b) => (
              <li key={b.id}>
                <Link href={`/plans/bills/${b.id}`} className="flex items-center gap-3 py-3 opacity-70">
                  <CategoryBubble emoji={b.category?.emoji ?? "🔁"} color={b.category?.color ?? "sky"} size="sm" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{b.name}</span>
                  <span className="tabular-nums">{formatMoney(b.amount, currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
