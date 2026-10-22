"use client";

import { useActionState, useState } from "react";
import { Trash2, UserX } from "lucide-react";
import { deleteMyAccount, resetMyData, type DangerResult } from "@/app/actions";

type Action = (prev: DangerResult, form: FormData) => Promise<DangerResult>;

export function DangerZone() {
  return (
    <section className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-coral/40">
      <h2 className="text-sm font-bold uppercase tracking-wide text-coral">Danger zone</h2>
      <div className="mt-3 space-y-3">
        <Confirm
          icon={<Trash2 size={18} />}
          label="Delete all data"
          description="Removes every expense, income, bill, installment, goal and category. Your account and settings stay, and Wally’s starter categories come back."
          action={resetMyData}
        />
        <Confirm
          icon={<UserX size={18} />}
          label="Delete account"
          description="Permanently deletes your Wally account and everything in it, then signs you out. This can’t be undone."
          action={deleteMyAccount}
        />
      </div>
    </section>
  );
}

function Confirm({ icon, label, description, action }: { icon: React.ReactNode; label: string; description: string; action: Action }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-coral ring-1 ring-coral/40 transition active:scale-[.98]"
      >
        {icon} {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={label}>
          <form action={formAction} className="w-full max-w-sm rounded-3xl bg-card p-5 shadow-xl">
            <h3 className="text-lg font-extrabold">{label}?</h3>
            <p className="mt-2 text-sm text-muted">{description}</p>
            <label className="mt-4 block text-sm font-semibold">
              Type <span className="font-mono text-coral">DELETE</span> to confirm
              <input
                name="confirm"
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="mt-1 w-full rounded-2xl bg-card-2 px-4 py-3 font-mono outline-none focus:ring-2 focus:ring-coral"
              />
            </label>
            {state?.error && <p className="mt-3 text-sm font-semibold text-coral">{state.error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setTyped("");
                }}
                className="rounded-2xl py-3 font-bold ring-1 ring-line"
              >
                Cancel
              </button>
              <button
                disabled={typed !== "DELETE" || pending}
                className="rounded-2xl bg-coral py-3 font-bold text-white disabled:opacity-40"
              >
                {pending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
