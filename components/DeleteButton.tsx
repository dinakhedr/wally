"use client";

import { Trash2 } from "lucide-react";
import { deleteEntry } from "@/app/actions";

export function DeleteButton({ id, kind }: { id: string; kind: "expense" | "income" }) {
  return (
    <form
      action={deleteEntry}
      onSubmit={(e) => {
        if (!confirm(`Delete this ${kind}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <button aria-label={`Delete ${kind}`} className="-mr-1 rounded-full p-1.5 text-muted/60 transition hover:text-coral">
        <Trash2 size={16} />
      </button>
    </form>
  );
}
