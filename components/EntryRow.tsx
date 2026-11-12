import Link from "next/link";
import { CategoryBubble } from "./CategoryBubble";
import { formatMoney } from "@/lib/format";
import type { Entry } from "@/lib/types";

export function EntryRow({
  entry,
  currency,
  action,
  editable,
  dateLabel,
}: {
  entry: Entry;
  currency: string;
  action?: React.ReactNode;
  editable?: boolean;
  /** Shown under the name, e.g. "Yesterday", for lists that mix days. */
  dateLabel?: string;
}) {
  const income = entry.kind === "income";
  const name = entry.category?.name ?? (income ? "Income" : "Uncategorised");
  const body = (
    <>
      <CategoryBubble emoji={entry.category?.emoji ?? (income ? "💰" : "📦")} color={entry.category?.color ?? "violet"} />
      <div className="min-w-0 flex-1">
        {/* Category first, then the note (and day, where shown) beneath it. */}
        <p className="truncate font-semibold">{name}</p>
        {(entry.note || dateLabel) && (
          <p className="truncate text-sm text-muted">{[entry.note, dateLabel].filter(Boolean).join(" · ")}</p>
        )}
      </div>
      <span className={`shrink-0 font-bold tabular-nums ${income ? "text-mint" : ""}`}>
        {income ? formatMoney(entry.amount, currency, { signed: true }) : formatMoney(-entry.amount, currency)}
      </span>
    </>
  );

  return (
    <li className="flex items-center gap-3 py-3">
      {editable ? (
        <Link href={`/activity/${entry.kind}/${entry.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      {action}
    </li>
  );
}
