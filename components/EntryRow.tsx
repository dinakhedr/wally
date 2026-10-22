import { CategoryBubble } from "./CategoryBubble";
import { formatMoney } from "@/lib/format";
import type { Entry } from "@/lib/types";

export function EntryRow({ entry, currency, action }: { entry: Entry; currency: string; action?: React.ReactNode }) {
  const income = entry.kind === "income";
  const name = entry.category?.name ?? (income ? "Income" : "Uncategorised");

  return (
    <li className="flex items-center gap-3 py-3">
      <CategoryBubble emoji={entry.category?.emoji ?? (income ? "💰" : "📦")} color={entry.category?.color ?? "violet"} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{entry.note || name}</p>
        {entry.note && <p className="truncate text-sm text-muted">{name}</p>}
      </div>
      <span className={`shrink-0 font-bold tabular-nums ${income ? "text-mint" : ""}`}>
        {income ? formatMoney(entry.amount, currency, { signed: true }) : formatMoney(-entry.amount, currency)}
      </span>
      {action}
    </li>
  );
}
