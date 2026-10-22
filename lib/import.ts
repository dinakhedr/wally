/**
 * Turns the old "Expenses Tracker" Google Sheet (downloaded as .xlsx) into the
 * payload that the `import_sheet` database function expects.
 *
 * Tabs: Daily Log, Categories, Recurring, Recurring Log, Installments,
 * Installments Log, Income Log. Columns are found by header name, so order
 * doesn't matter, and every value may arrive as text, number, boolean or Date.
 *
 * Recurring → bills and Installments → installments, each with its paid-months
 * history from the log tabs. Those payments are not turned into expenses.
 */
import type { Kind, Tint } from "./types";

type Cell = string | number | boolean | Date | null | undefined;
export type SheetInput = { sheet: string; data: Cell[][] }[];
type Row = Record<string, Cell>;

export type ImportCategory = {
  kind: Kind;
  name: string;
  emoji: string;
  color: Tint;
  budget: number | null;
  archived: boolean;
  sort: number;
  /** How many expenses, income entries and bills use it (for the matching screen). */
  uses: number;
};
type Entry = { key: string; date: string; category: string | null; amount: number; note: string | null; created_at: string | null };
/** A paid month of a bill or installment. History only — not an expense. */
type Payment = { parent_key: string; date: string; amount: number };

export type ImportPayload = {
  categories: ImportCategory[];
  expenses: Entry[];
  income: Entry[];
  recurring: {
    key: string;
    name: string;
    category: string | null;
    amount: number;
    frequency: "weekly" | "monthly" | "quarterly" | "yearly";
    next_due: string;
    active: boolean;
  }[];
  recurring_payments: Payment[];
  installments: {
    key: string;
    name: string;
    total: number;
    monthly: number;
    months: number;
    first_due: string;
    note: string | null;
  }[];
  installment_payments: (Payment & { seq: number })[];
};

export type ImportSummary = {
  categories: number;
  expenses: number;
  income: number;
  recurring: number;
  recurringPayments: number;
  installments: number;
  installmentPayments: number;
  firstDate: string | null;
  lastDate: string | null;
  skipped: number;
};

const BANKS: Record<string, string> = { NBE: "National Bank of Egypt", CIB: "CIB", BM: "Banque Misr", QNB: "QNB" };

// ─── Cell helpers ────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function text(v: Cell): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function num(v: Cell): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = text(v).replace(/[,\s]/g, "").replace(/[^\d.-]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function bool(v: Cell, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  const s = text(v).toLowerCase();
  if (["true", "yes", "1"].includes(s)) return true;
  if (["false", "no", "0"].includes(s)) return false;
  return fallback;
}

/** A calendar date as YYYY-MM-DD, or null. Excel dates arrive as UTC midnight. */
export function toDate(v: Cell): string | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : ymd(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  if (typeof v === "number" && v > 20000 && v < 80000) {
    // Excel serial day number
    const d = new Date(Math.round((v - 25569) * 86_400_000));
    return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const s = text(v);
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validDate(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // Google Sheets' default M/D/YYYY
  if (m) return validDate(+m[3], +m[1], +m[2]);
  return null;
}

function validDate(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? ymd(y, m, d) : null;
}

function toTimestamp(v: Cell): string | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  const s = text(v);
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

const money = (n: number) => Math.round(n * 100) / 100;

function addMonths(iso: string, months: number, day: number) {
  const [y, m] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return ymd(ny, nm, Math.min(day, last));
}

function monthsBetween(a: string, b: string) {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

/** Nearest Wally tint for one of the sheet's pastel hex colours. */
export function tintFor(hex: string, fallback: Tint): Tint {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return fallback;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 0.06) return fallback; // grey
  let h: number;
  if (max === r) h = ((g - b) / (max - min)) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  h = (h * 60 + 360) % 360;
  if (h < 20 || h >= 320) return "coral";
  if (h < 70) return "sun";
  if (h < 170) return "mint";
  if (h < 225) return "sky";
  return "violet";
}

// ─── Sheet → rows ────────────────────────────────────────────────────────────

function findSheet(sheets: SheetInput, name: string) {
  const want = name.toLowerCase().replace(/\s+/g, "");
  return sheets.find((s) => s.sheet.toLowerCase().replace(/\s+/g, "") === want);
}

function rows(sheets: SheetInput, name: string): Row[] {
  const sheet = findSheet(sheets, name);
  if (!sheet || sheet.data.length < 2) return [];
  const headers = sheet.data[0].map((h) => text(h).toLowerCase().replace(/\s+/g, ""));
  return sheet.data.slice(1).map((cells) => {
    const row: Row = {};
    headers.forEach((h, i) => h && (row[h] = cells[i]));
    return row;
  });
}

const get = (row: Row, ...names: string[]) => {
  for (const n of names) {
    const v = row[n.toLowerCase()];
    if (v != null && text(v) !== "") return v;
  }
  return null;
};

// ─── Main ────────────────────────────────────────────────────────────────────

export function looksLikeTracker(sheets: SheetInput) {
  return Boolean(findSheet(sheets, "Daily Log") || findSheet(sheets, "Income Log"));
}

export function buildImport(sheets: SheetInput, today: string): { payload: ImportPayload; summary: ImportSummary } {
  let skipped = 0;

  // Categories tab: entries reference OriginalValue; Name is the display name.
  const sheetCats = rows(sheets, "Categories")
    .map((r, i) => {
      const name = text(get(r, "Name", "OriginalValue"));
      return {
        original: text(get(r, "OriginalValue")) || name,
        name,
        kind: (text(get(r, "Kind")).toLowerCase() === "income" ? "income" : "expense") as Kind,
        emoji: text(get(r, "Icon")),
        bg: text(get(r, "BG")),
        budget: num(get(r, "Budget")),
        hidden: bool(get(r, "Hidden"), false),
        sort: i + 1,
      };
    })
    .filter((c) => c.name);

  const alias = new Map<string, string>();
  for (const c of sheetCats) {
    alias.set(c.original.toLowerCase(), c.name);
    alias.set(c.name.toLowerCase(), c.name);
  }
  const resolve = (v: Cell) => {
    const s = text(v);
    return s ? (alias.get(s.toLowerCase()) ?? s) : null;
  };

  // Count how often each (kind, name) is used; only used categories are imported.
  const used = { expense: new Map<string, number>(), income: new Map<string, number>() };
  const use = (kind: Kind, name: string | null) => name && used[kind].set(name, (used[kind].get(name) ?? 0) + 1);

  const entry = (r: Row, key: string, dateCols: string[], kind: Kind, note?: string | null): Entry | null => {
    const date = toDate(get(r, ...dateCols));
    const amount = num(get(r, "Amount", "AmountPaid"));
    if (!date || amount == null || amount <= 0) {
      if (Object.values(r).some((v) => text(v) !== "")) skipped++;
      return null;
    }
    const category = resolve(get(r, "Category"));
    use(kind, category);
    return {
      key,
      date,
      category,
      amount: money(amount),
      note: (note !== undefined ? note : text(get(r, "Notes"))) || null,
      created_at: toTimestamp(get(r, "Timestamp")),
    };
  };

  const expenses = rows(sheets, "Daily Log")
    .map((r, i) => entry(r, `daily:${text(get(r, "ID")) || `row${i + 2}`}:${text(get(r, "Timestamp"))}`, ["Date"], "expense"))
    .filter((e): e is Entry => e !== null);

  const income = rows(sheets, "Income Log")
    .map((r, i) => entry(r, `income:${text(get(r, "ID")) || `row${i + 2}`}:${text(get(r, "Timestamp"))}`, ["Date"], "income"))
    .filter((e): e is Entry => e !== null);

  // Recurring bills
  const FREQ: Record<string, ImportPayload["recurring"][number]["frequency"]> = {
    weekly: "weekly",
    monthly: "monthly",
    quarterly: "quarterly",
    annual: "yearly",
    annually: "yearly",
    yearly: "yearly",
  };
  const STEP = { weekly: 0, monthly: 1, quarterly: 3, yearly: 12 } as const;

  const recurring = rows(sheets, "Recurring").flatMap((r) => {
    const id = text(get(r, "ID"));
    const name = text(get(r, "Name"));
    const amount = num(get(r, "Amount"));
    if (!id || !name || amount == null || amount <= 0) {
      if (id || name) skipped++;
      return [];
    }
    const frequency = FREQ[text(get(r, "Frequency")).toLowerCase()] ?? "monthly";
    const year = num(get(r, "StartYear")) ?? Number(today.slice(0, 4));
    const month = num(get(r, "StartMonth")) ?? 1;
    const day = num(get(r, "PaymentDay")) ?? 1;
    const start = validDate(year, month, 1) ?? today.slice(0, 8) + "01";

    let next = addMonths(start, 0, day);
    for (let k = 1; next < today && STEP[frequency] > 0 && k < 1200; k++) next = addMonths(start, k * STEP[frequency], day);

    const category = resolve(get(r, "Category"));
    use("expense", category);
    return [{ key: `rec:${id}`, name, category, amount: money(amount), frequency, next_due: next, active: bool(get(r, "Active"), true) }];
  });

  const recurring_payments = rows(sheets, "Recurring Log").flatMap((r) => {
    const parent = text(get(r, "RecurringID"));
    const date = toDate(get(r, "Date"));
    const amount = num(get(r, "Amount"));
    if (!parent || !date || amount == null || amount < 0) {
      if (Object.values(r).some((v) => text(v) !== "")) skipped++;
      return [];
    }
    return [{ parent_key: `rec:${parent}`, date, amount: money(amount) }];
  });

  // Installments
  const installments = rows(sheets, "Installments").flatMap((r) => {
    const id = text(get(r, "ID"));
    const name = text(get(r, "ItemName", "Name"));
    const total = num(get(r, "TotalAmount"));
    const months = num(get(r, "MonthsCount"));
    const year = num(get(r, "StartYear"));
    const month = num(get(r, "StartMonth"));
    const first = year && month ? validDate(year, month, 1) : null;
    if (!id || !name || !total || !months || months < 1 || !first) {
      if (id || name) skipped++;
      return [];
    }
    const bank = text(get(r, "BankKey"));
    return [
      {
        key: `inst:${id}`,
        name,
        total: money(total),
        monthly: money(num(get(r, "MonthlyAmount")) ?? total / months),
        months: Math.round(months),
        first_due: first,
        note: bank ? (BANKS[bank.toUpperCase()] ?? bank) : null,
      },
    ];
  });
  const installmentById = new Map(installments.map((i) => [i.key, i]));

  const installment_payments = rows(sheets, "Installments Log").flatMap((r) => {
    const plan = installmentById.get(`inst:${text(get(r, "InstallmentID"))}`);
    const date = toDate(get(r, "DatePaid", "Date"));
    const amount = num(get(r, "AmountPaid", "Amount"));
    if (!plan || !date || amount == null || amount < 0) {
      if (Object.values(r).some((v) => text(v) !== "")) skipped++;
      return [];
    }
    const seq = Math.min(plan.months, Math.max(1, monthsBetween(plan.first_due, date) + 1));
    return [{ parent_key: plan.key, date, amount: money(amount), seq }];
  });

  // Categories the data uses, styled from the Categories tab when it lists them.
  const categories: ImportCategory[] = [];
  for (const kind of ["expense", "income"] as const) {
    for (const [name, uses] of used[kind]) {
      const c = sheetCats.find((sc) => sc.name === name);
      categories.push({
        kind,
        name,
        emoji: c?.emoji || (kind === "income" ? "💰" : "📦"),
        color: c ? tintFor(c.bg, kind === "income" ? "mint" : "violet") : kind === "income" ? "mint" : "sky",
        budget: kind === "expense" && c?.budget && c.budget > 0 ? money(c.budget) : null,
        archived: false,
        sort: c?.sort ?? sheetCats.length + categories.length + 1,
        uses,
      });
    }
  }
  categories.sort((a, b) => a.kind.localeCompare(b.kind) || b.uses - a.uses);

  const dates = [...expenses, ...income].map((e) => e.date).sort();

  return {
    payload: { categories, expenses, income, recurring, recurring_payments, installments, installment_payments },
    summary: {
      categories: categories.length,
      expenses: expenses.length,
      income: income.length,
      recurring: recurring.length,
      recurringPayments: recurring_payments.length,
      installments: installments.length,
      installmentPayments: installment_payments.length,
      firstDate: dates[0] ?? null,
      lastDate: dates.at(-1) ?? null,
      skipped,
    },
  };
}

// ─── Matching sheet categories to Wally's ────────────────────────────────────

export type WallyCategory = { kind: Kind; name: string; emoji: string };

/** "new" = add the sheet category to Wally; otherwise the Wally category's name. */
export type CategoryChoice = "new" | string;

const catKey = (kind: Kind, name: string) => `${kind}:${name.toLowerCase()}`;

// Words in a sheet category name that point at one of Wally's starter categories.
const HINTS: Record<string, string[]> = {
  groceries: ["supermarket", "grocery", "groceries", "market", "food"],
  "dining out": ["restaurant", "dining", "takeaway", "delivery", "eating"],
  coffee: ["cafe", "café", "coffee"],
  transport: ["petrol", "fuel", "gas station", "car", "uber", "careem", "taxi", "ride", "transport", "transportation", "parking", "metro"],
  bills: ["utilities", "utility", "electric", "water", "internet", "phone", "mobile", "vodafone", "orange", "etisalat", "bill"],
  home: ["rent", "home", "house", "furniture", "repairs"],
  shopping: ["shopping", "clothes", "electronics", "amazon"],
  health: ["health", "pharmacy", "doctor", "medical", "gym", "clinic"],
  fun: ["fun", "entertainment", "games", "gaming", "movies", "cinema"],
  subscriptions: ["subscription", "digital", "software", "streaming", "music", "podcast", "apps"],
  education: ["education", "course", "books", "school", "tuition"],
  gifts: ["gift", "charity", "donation"],
  travel: ["travel", "flight", "hotel", "trip"],
  "personal care": ["personal", "care", "beauty", "skin", "salon", "barber"],
  salary: ["salary", "wage", "pay", "overtime", "bonus"],
  freelance: ["freelance", "commission", "side"],
  gift: ["gift"],
};

/**
 * What to do with each sheet category: same name (ignoring case) → that Wally
 * category, a likely match → the suggestion, otherwise "new". `exact` marks the
 * ones matched by name, which don't need asking.
 */
export function suggestCategories(categories: ImportCategory[], wally: WallyCategory[]) {
  const choices: Record<string, CategoryChoice> = {};
  const exact = new Set<string>();
  for (const c of categories) {
    const key = catKey(c.kind, c.name);
    const sameKind = wally.filter((w) => w.kind === c.kind);
    const same = sameKind.find((w) => w.name.toLowerCase() === c.name.toLowerCase());
    if (same) {
      choices[key] = same.name;
      exact.add(key);
      continue;
    }
    const words = ` ${c.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")} `;
    const hint = sameKind.find((w) => (HINTS[w.name.toLowerCase()] ?? []).some((h) => words.includes(` ${h} `) || words.includes(` ${h}s `)));
    choices[key] = hint?.name ?? "new";
  }
  return { choices, exact };
}

/** Points every row at the chosen Wally category and keeps only the categories to create. */
export function applyCategoryChoices(payload: ImportPayload, choices: Record<string, CategoryChoice>): ImportPayload {
  const target = (kind: Kind, name: string | null) => {
    if (!name) return null;
    const choice = choices[catKey(kind, name)];
    return !choice || choice === "new" ? name : choice;
  };
  return {
    ...payload,
    categories: payload.categories.filter((c) => (choices[catKey(c.kind, c.name)] ?? "new") === "new"),
    expenses: payload.expenses.map((e) => ({ ...e, category: target("expense", e.category) })),
    income: payload.income.map((e) => ({ ...e, category: target("income", e.category) })),
    recurring: payload.recurring.map((r) => ({ ...r, category: target("expense", r.category) })),
  };
}

export { catKey as categoryKey };
