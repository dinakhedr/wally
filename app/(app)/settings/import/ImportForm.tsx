"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CircleCheck, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { importSheet } from "@/app/actions";
import { Card } from "@/components/Card";
import {
  applyCategoryChoices,
  buildImport,
  categoryKey,
  looksLikeTracker,
  suggestCategories,
  type CategoryChoice,
  type ImportPayload,
  type ImportSummary,
  type SheetInput,
  type WallyCategory,
} from "@/lib/import";
import { parseISODate } from "@/lib/format";

type Parsed = {
  fileName: string;
  payload: ImportPayload;
  summary: ImportSummary;
  exact: Set<string>;
};

const fmtDate = (iso: string) => parseISODate(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });

export function ImportForm({ today, wally }: { today: string; wally: WallyCategory[] }) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [choices, setChoices] = useState<Record<string, CategoryChoice>>({});
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, number> | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFile(file: File | undefined) {
    setError(null);
    setParsed(null);
    setDone(null);
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      setError("Please choose the .xlsx file you downloaded from Google Sheets.");
      return;
    }
    setReading(true);
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const sheets = (await readXlsxFile(file)) as unknown as SheetInput;
      if (!looksLikeTracker(sheets)) {
        setError("This doesn’t look like the Expenses Tracker sheet. It needs a “Daily Log” or “Income Log” tab.");
        return;
      }
      const { payload, summary } = buildImport(sheets, today);
      const suggested = suggestCategories(payload.categories, wally);
      setChoices(suggested.choices);
      setParsed({ fileName: file.name, payload, summary, exact: suggested.exact });
    } catch (e) {
      console.error(e);
      setError("That file couldn’t be opened. Download it again as Microsoft Excel (.xlsx) and retry.");
    } finally {
      setReading(false);
    }
  }

  function runImport() {
    if (!parsed) return;
    startTransition(async () => {
      const result = await importSheet(applyCategoryChoices(parsed.payload, choices));
      if (result.ok) {
        setDone(result.counts);
        setParsed(null);
      } else {
        setError(result.error);
      }
    });
  }

  if (done) {
    const added = (done.expenses ?? 0) + (done.income ?? 0) + (done.recurring ?? 0) + (done.installments ?? 0);
    return (
      <Card className="text-center">
        <CircleCheck size={48} className="mx-auto text-mint" />
        <h2 className="mt-3 text-xl font-extrabold">Import complete</h2>
        <p className="mt-1 text-muted">
          {added > 0
            ? `Added ${done.expenses} expenses, ${done.income} income, ${done.recurring} bills and ${done.installments} installments.`
            : "Everything in this sheet was already in Wally — nothing new to add."}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link href="/activity" className="rounded-2xl bg-violet py-3.5 font-bold text-white">
            See activity
          </Link>
          <Link href="/" className="rounded-2xl py-3.5 font-bold ring-1 ring-line">
            Home
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-bold">1. Download your sheet</h2>
        <p className="mt-1 text-sm text-muted">
          Open your old tracker in Google Sheets on a computer, then choose{" "}
          <strong className="text-ink">File → Download → Microsoft Excel (.xlsx)</strong>.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold">2. Choose the file</h2>
        <label className="mt-3 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-8 text-center transition hover:border-violet">
          {reading ? (
            <LoaderCircle className="animate-spin text-violet" size={32} />
          ) : parsed ? (
            <FileSpreadsheet className="text-mint" size={32} />
          ) : (
            <Upload className="text-violet" size={32} />
          )}
          <span className="font-semibold">{reading ? "Reading…" : parsed ? parsed.fileName : "Choose .xlsx file"}</span>
          <span className="text-xs text-muted">The file is read on this device.</span>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
      </Card>

      {error && <p className="rounded-2xl bg-coral-soft px-4 py-3 text-sm font-semibold text-coral">{error}</p>}

      {parsed && (
        <>
          <MatchCategories parsed={parsed} wally={wally} choices={choices} setChoices={setChoices} />

          <Card>
            <h2 className="font-bold">4. Check and import</h2>
            {parsed.summary.firstDate && parsed.summary.lastDate && (
              <p className="mt-1 text-sm text-muted">
                {fmtDate(parsed.summary.firstDate)} – {fmtDate(parsed.summary.lastDate)}
              </p>
            )}
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Stat label="Expenses" value={parsed.summary.expenses} tone="bg-coral-soft" />
              <Stat label="Income" value={parsed.summary.income} tone="bg-mint-soft" />
              <Stat label="Bills" value={parsed.summary.recurring} sub={`${parsed.summary.recurringPayments} paid months`} tone="bg-sky-soft" />
              <Stat
                label="Installments"
                value={parsed.summary.installments}
                sub={`${parsed.summary.installmentPayments} paid months`}
                tone="bg-sky-soft"
              />
            </ul>
            {parsed.summary.skipped > 0 && (
              <p className="mt-3 text-xs text-muted">
                {parsed.summary.skipped} row{parsed.summary.skipped === 1 ? "" : "s"} without a date or amount will be skipped.
              </p>
            )}
            <p className="mt-4 text-xs text-muted">Importing the same sheet again won’t create duplicates.</p>

            <button
              onClick={runImport}
              disabled={pending}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet py-4 font-bold text-white shadow-lg shadow-violet/30 disabled:opacity-60"
            >
              {pending && <LoaderCircle className="animate-spin" size={18} />}
              {pending ? "Importing…" : "Import everything"}
            </button>
          </Card>
        </>
      )}
    </div>
  );
}

function MatchCategories({
  parsed,
  wally,
  choices,
  setChoices,
}: {
  parsed: Parsed;
  wally: WallyCategory[];
  choices: Record<string, CategoryChoice>;
  setChoices: React.Dispatch<React.SetStateAction<Record<string, CategoryChoice>>>;
}) {
  const { toAsk, matched } = useMemo(() => {
    const toAsk = parsed.payload.categories.filter((c) => !parsed.exact.has(categoryKey(c.kind, c.name)));
    const matched = parsed.payload.categories.filter((c) => parsed.exact.has(categoryKey(c.kind, c.name)));
    return { toAsk, matched };
  }, [parsed]);

  return (
    <Card>
      <h2 className="font-bold">3. Match your categories</h2>
      <p className="mt-1 text-sm text-muted">
        Choose which Wally category each of your old ones should go into, or add it as a new category.
      </p>

      {(["expense", "income"] as const).map((kind) => {
        const rows = toAsk.filter((c) => c.kind === kind);
        if (!rows.length) return null;
        const options = wally.filter((w) => w.kind === kind);
        return (
          <div key={kind} className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{kind === "expense" ? "Expenses & bills" : "Income"}</h3>
            <ul className="mt-2 divide-y divide-line">
              {rows.map((c) => {
                const key = categoryKey(c.kind, c.name);
                return (
                  <li key={key} className="flex items-center gap-3 py-3">
                    <span className="text-xl" aria-hidden>
                      {c.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{c.name}</span>
                      <span className="block text-xs text-muted">
                        {c.uses} {c.uses === 1 ? "entry" : "entries"}
                      </span>
                    </span>
                    <select
                      aria-label={`Wally category for ${c.name}`}
                      value={choices[key] ?? "new"}
                      onChange={(e) => setChoices((prev) => ({ ...prev, [key]: e.target.value }))}
                      className={`max-w-[11rem] rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet ${
                        (choices[key] ?? "new") === "new" ? "bg-mint-soft text-mint" : "bg-card-2"
                      }`}
                    >
                      <option value="new">＋ Add as new</option>
                      {options.map((w) => (
                        <option key={w.name} value={w.name}>
                          {w.emoji} {w.name}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {matched.length > 0 && (
        <p className="mt-4 rounded-2xl bg-card-2 px-4 py-3 text-sm">
          <span className="font-semibold">Same name in Wally, matched automatically: </span>
          <span className="text-muted">{matched.map((c) => c.name).join(", ")}</span>
        </p>
      )}
    </Card>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone: string }) {
  return (
    <li className={`rounded-2xl p-3 ${tone}`}>
      <p className="text-xl font-extrabold tabular-nums">{value}</p>
      <p className="font-semibold">{label}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </li>
  );
}
