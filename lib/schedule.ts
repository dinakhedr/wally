/**
 * Bills and installments laid out by month: past months from what was paid,
 * this month (with anything overdue folded in), and the months ahead.
 */
import type { Bill } from "./data";
import { installmentStatus, lastDayOfMonth, monthOf, monthsAhead, occurrences, type InstallmentRow } from "./plans";

// ─── Bills ───────────────────────────────────────────────────────────────────

export type BillLine =
  | { kind: "due"; bill: Bill; date: string; payable: boolean }
  | { kind: "paid"; bill: Bill; date: string; amount: number; skipped: boolean; paymentId: string; undoable: boolean };

export function billSchedule(bills: Bill[], today: string, ahead = 12) {
  const thisMonth = monthOf(today);
  const future = monthsAhead(today, ahead);
  const until = lastDayOfMonth(future[future.length - 1]);
  const byMonth = new Map<string, BillLine[]>();
  const push = (month: string, line: BillLine) => byMonth.set(month, [...(byMonth.get(month) ?? []), line]);

  for (const bill of bills) {
    const latest = [...bill.payments].sort((a, b) => b.due_on.localeCompare(a.due_on))[0];
    for (const p of bill.payments) {
      push(monthOf(p.due_on), {
        kind: "paid",
        bill,
        date: p.due_on,
        amount: p.amount,
        skipped: p.status === "skipped",
        paymentId: p.id,
        undoable: p.id === latest?.id,
      });
    }
    if (!bill.active) continue;
    for (const date of occurrences(bill.next_due, bill.frequency, until)) {
      if (bill.end_date && date > bill.end_date) break;
      // Only the next occurrence can be paid, and only once its date has come.
      push(monthOf(date) < thisMonth ? thisMonth : monthOf(date), {
        kind: "due",
        bill,
        date,
        payable: date === bill.next_due && date <= today,
      });
    }
  }

  // Still-to-pay first (by date), then what's already paid.
  for (const lines of byMonth.values())
    lines.sort((a, b) => (a.kind === b.kind ? a.date.localeCompare(b.date) : a.kind === "due" ? -1 : 1));

  const past = [...byMonth.keys()].filter((m) => m < thisMonth).sort().reverse();
  return { byMonth, thisMonth, past, future: future.slice(1) };
}

export const lineAmount = (l: BillLine) => (l.kind === "paid" ? l.amount : l.bill.amount);
export const linesTotal = (lines: BillLine[]) => lines.reduce((n, l) => n + lineAmount(l), 0);

// ─── Installments ────────────────────────────────────────────────────────────

export type InstallmentLine = {
  plan: ReturnType<typeof installmentStatus>;
  seq: number;
  date: string;
  amount: number;
  paid: boolean;
  /** The next unpaid month whose date has come — the one "Pay" applies to. */
  payable: boolean;
};

export function installmentSchedule(rows: InstallmentRow[], today: string, ahead = 12) {
  const thisMonth = monthOf(today);
  const future = monthsAhead(today, ahead);
  const lastFuture = future[future.length - 1];
  const byMonth = new Map<string, InstallmentLine[]>();
  const push = (month: string, line: InstallmentLine) => byMonth.set(month, [...(byMonth.get(month) ?? []), line]);

  const plans = rows.map(installmentStatus);
  for (const plan of plans) {
    for (const p of plan.payments) push(monthOf(p.due_on), { plan, seq: p.seq, date: p.due_on, amount: p.amount, paid: true, payable: false });
    for (const u of plan.unpaid) {
      const month = monthOf(u.due) < thisMonth ? thisMonth : monthOf(u.due);
      if (month > lastFuture) break;
      push(month, { plan, seq: u.seq, date: u.due, amount: plan.monthly_amount, paid: false, payable: u.seq === plan.nextSeq && u.due <= today });
    }
  }
  for (const lines of byMonth.values())
    lines.sort((a, b) => (a.paid === b.paid ? a.date.localeCompare(b.date) : a.paid ? 1 : -1));

  const past = [...byMonth.keys()].filter((m) => m < thisMonth).sort().reverse();
  return { byMonth, thisMonth, past, future, plans };
}
