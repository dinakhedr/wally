"use client";

/** A submit button that asks before running a destructive server action. */
export function ConfirmButton({
  action,
  id,
  message,
  children,
}: {
  action: (form: FormData) => Promise<void>;
  id: string;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-coral ring-1 ring-coral/40">
        {children}
      </button>
    </form>
  );
}
