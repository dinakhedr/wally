"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CircleCheck, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { importSheet } from "@/app/actions";
import { Card } from "@/components/Card";
import { buildImport, looksLikeTracker, type ImportPayload, type ImportSummary, type SheetInput } from "@/lib/import";
import { parseISODate } from "@/lib/format";

type Parsed = { fileName: string; payload: ImportPayload; summary: ImportSummary };

const fmtDate = (iso: string) => parseISODate(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });

export function ImportForm({ today }: { today: string }) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideStarters, setHideStarters] = useState(true);
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
      setParsed({ fileName: file.name, payload, summary });
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
      const result = await importSheet(parsed.payload, hideStarters);
      if (result.ok) {
        setDone(result.counts);
        setParsed(null);
      } else {
        setError(result.error);
      }
    });
  }

  if (done) {
    const added = (done.expenses ?? 0) + (done.income ?? 0);
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
          Open your old tracker in Google Sheets on a computer, then choose <strong className="text-ink">File → Download → Microsoft Excel (.xlsx)</strong>.
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
        <Card>
          <h2 className="font-bold">3. Check and import</h2>
          {parsed.summary.firstDate && parsed.summary.lastDate && (
            <p className="mt-1 text-sm text-muted">
              {fmtDate(parsed.summary.firstDate)} – {fmtDate(parsed.summary.lastDate)}
            </p>
          )}
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Expenses" value={parsed.summary.expenses} tone="bg-coral-soft" />
            <Stat label="Income" value={parsed.summary.income} tone="bg-mint-soft" />
            <Stat label="Bills" value={parsed.summary.recurring} sub={`${parsed.summary.recurringPayments} payments`} tone="bg-sky-soft" />
            <Stat
              label="Installments"
              value={parsed.summary.installments}
              sub={`${parsed.summary.installmentPayments} payments`}
              tone="bg-sky-soft"
            />
            <Stat label="Categories" value={parsed.summary.categories} tone="bg-violet-soft" />
          </ul>
          {parsed.summary.skipped > 0 && (
            <p className="mt-3 text-xs text-muted">
              {parsed.summary.skipped} row{parsed.summary.skipped === 1 ? "" : "s"} without a date or amount will be skipped.
            </p>
          )}

          <label className="mt-4 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={hideStarters}
              onChange={(e) => setHideStarters(e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-[var(--violet)]"
            />
            <span>
              <span className="font-semibold">Use my sheet’s categories</span>
              <span className="block text-muted">Hides Wally’s starter categories that you don’t use.</span>
            </span>
          </label>

          <p className="mt-4 text-xs text-muted">Bill and installment payments are added as expenses. Importing the same sheet again won’t create duplicates.</p>

          <button
            onClick={runImport}
            disabled={pending}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet py-4 font-bold text-white shadow-lg shadow-violet/30 disabled:opacity-60"
          >
            {pending && <LoaderCircle className="animate-spin" size={18} />}
            {pending ? "Importing…" : "Import everything"}
          </button>
        </Card>
      )}
    </div>
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
