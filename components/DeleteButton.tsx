"use client";

import { Trash2 } from "lucide-react";
import { deleteEntry } from "@/app/actions";

export function DeleteButton({ id, kind, label }: { id: string; kind: "expense" | "income"; label?: boolean }) {
  return (
    <form
      action={deleteEntry}
      onSubmit={(e) => {
        if (!confirm(`Delete this ${kind}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      {label && <input type="hidden" name="back" value="/activity" />}
      {label ? (
        <button className="flex items-center gap-2 rounded-2xl px-5 py-3 font-bold text-coral ring-1 ring-coral/40">
          <Trash2 size={18} /> Delete {kind}
        </button>
      ) : (
        <button aria-label={`Delete ${kind}`} className="-mr-1 rounded-full p-1.5 text-muted/60 transition hover:text-coral">
          <Trash2 size={16} />
        </button>
      )}
    </form>
  );
}
