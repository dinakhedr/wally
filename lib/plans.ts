/**
 * Date maths for bills (recurring) and installments. Dates are YYYY-MM-DD
 * strings throughout; months are compared as "YYYY-MM".
 */
import { parseISODate, toISODate } from "./format";

export type Frequency = "weekly" | "monthly" | "quarterly" | "yearly";

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Every 3 months",
  yearly: "Yearly",
};

const MONTHS: Record<Exclude<Frequency, "weekly">, number> = { monthly: 1, quarterly: 3, yearly: 12 };

export const monthOf = (iso: string) => iso.slice(0, 7);

/** Adds whole months, keeping the day where the month allows it (31 Jan → 28 Feb). */
export function addMonths(iso: string, months: number) {
  const d = parseISODate(iso);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, last));
  return toISODate(target);
}

/** The occurrence after `iso` for a bill of this frequency. */
export function nextOccurrence(iso: string, frequency: Frequency) {
  if (frequency === "weekly") {
    const d = parseISODate(iso);
    d.setDate(d.getDate() + 7);
    return toISODate(d);
  }
  return addMonths(iso, MONTHS[frequency]);
}

/** Every occurrence from `start` up to and including `until`. */
export function occurrences(start: string, frequency: Frequency, until: string, max = 400) {
  const out: string[] = [];
  for (let d = start; d <= until && out.length < max; d = nextOccurrence(d, frequency)) out.push(d);
  return out;
}

/** The next `count` months as YYYY-MM, starting with the month of `from`. */
export function monthsAhead(from: string, count: number) {
  return Array.from({ length: count }, (_, i) => monthOf(addMonths(`${monthOf(from)}-01`, i)));
}

export function monthLabel(month: string, opts: { year?: boolean } = {}) {
  return parseISODate(`${month}-01`).toLocaleDateString("en", { month: "long", ...(opts.year ? { year: "numeric" } : {}) });
}

export function lastDayOfMonth(month: string) {
  return toISODate(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0));
}

// ─── Installments ────────────────────────────────────────────────────────────

export type InstallmentRow = {
  id: string;
  name: string;
  note: string | null;
  total_amount: number;
  monthly_amount: number;
  months_total: number;
  first_due: string;
  payments: { seq: number; due_on: string; amount: number }[];
};

export type InstallmentStatus = InstallmentRow & {
  paidCount: number;
  paidAmount: number;
  remainingAmount: number;
  nextSeq: number | null;
  nextDue: string | null;
  lastDue: string;
  done: boolean;
  /** Month number → due date, for the months not yet paid. */
  unpaid: { seq: number; due: string }[];
};

export function installmentStatus(row: InstallmentRow): InstallmentStatus {
  const paidSeqs = new Set(row.payments.map((p) => p.seq));
  const paidAmount = row.payments.reduce((n, p) => n + p.amount, 0);
  const unpaid: { seq: number; due: string }[] = [];
  for (let seq = 1; seq <= row.months_total; seq++) {
    if (!paidSeqs.has(seq)) unpaid.push({ seq, due: addMonths(row.first_due, seq - 1) });
  }
  const next = unpaid[0] ?? null;
  return {
    ...row,
    paidCount: row.months_total - unpaid.length,
    paidAmount,
    remainingAmount: Math.max(0, row.total_amount - paidAmount),
    nextSeq: next?.seq ?? null,
    nextDue: next?.due ?? null,
    lastDue: addMonths(row.first_due, row.months_total - 1),
    done: unpaid.length === 0,
    unpaid,
  };
}
