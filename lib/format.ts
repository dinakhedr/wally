export function formatMoney(amount: number, currency: string, opts: { signed?: boolean } = {}) {
  const abs = Math.abs(amount);
  const hasCents = Math.round(abs * 100) % 100 !== 0;
  let text: string;
  try {
    text = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(abs);
  } catch {
    text = `${abs.toLocaleString("en", { maximumFractionDigits: 2 })} ${currency}`;
  }
  if (amount < 0) return `−${text}`;
  return opts.signed ? `+${text}` : text;
}

/** Local calendar date as YYYY-MM-DD (not UTC). */
export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function monthBounds(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end), daysInMonth: end.getDate() };
}

export function dayLabel(iso: string, today = new Date()) {
  const t = toISODate(today);
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (iso === t) return "Today";
  if (iso === toISODate(y)) return "Yesterday";
  const date = parseISODate(iso);
  return date.toLocaleDateString("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

export function daysUntil(iso: string, today = new Date()) {
  const a = parseISODate(toISODate(today)).getTime();
  const b = parseISODate(iso).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function dueLabel(iso: string) {
  const n = daysUntil(iso);
  if (n < 0) return `${-n}d overdue`;
  if (n === 0) return "Due today";
  if (n === 1) return "Tomorrow";
  if (n < 7) return `In ${n} days`;
  return parseISODate(iso).toLocaleDateString("en", { day: "numeric", month: "short" });
}

export const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD", "QAR", "CAD", "AUD"];
