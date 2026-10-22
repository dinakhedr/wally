import { notFound } from "next/navigation";
import { Pause, Play, Trash2 } from "lucide-react";
import { deleteBill, setBillActive } from "@/app/plans-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { BackHeader } from "@/components/forms/BackHeader";
import { getBills, getCategories, getProfile } from "@/lib/data";
import { formatMoney, parseISODate } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import { BillForm } from "./BillForm";

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [profile, categories, bills, today] = await Promise.all([
    getProfile(supabase, user.id),
    getCategories(supabase, "expense"),
    id === "new" ? Promise.resolve([]) : getBills(supabase),
    getToday(),
  ]);
  const bill = id === "new" ? null : (bills.find((b) => b.id === id) ?? null);
  if (id !== "new" && !bill) notFound();
  const history = bill ? [...bill.payments].sort((a, b) => b.due_on.localeCompare(a.due_on)) : [];

  return (
    <>
      <BackHeader href="/plans" title={bill ? bill.name : "New bill"} />
      <BillForm bill={bill} categories={categories} today={today} />

      {bill && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <form action={setBillActive}>
              <input type="hidden" name="id" value={bill.id} />
              <input type="hidden" name="active" value={String(!bill.active)} />
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold ring-1 ring-line">
                {bill.active ? <Pause size={18} /> : <Play size={18} />} {bill.active ? "Pause" : "Resume"}
              </button>
            </form>
            <ConfirmButton action={deleteBill} id={bill.id} message={`Delete ${bill.name} and its payment history?`}>
              <Trash2 size={18} /> Delete
            </ConfirmButton>
          </div>

          {history.length > 0 && (
            <section className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-line">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Payment history</h2>
              <ul className="mt-2 divide-y divide-line text-sm">
                {history.map((p) => (
                  <li key={p.id} className="flex justify-between py-2.5">
                    <span>
                      {parseISODate(p.due_on).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}
                      {p.status === "skipped" && <span className="text-muted"> · skipped</span>}
                    </span>
                    <span className="font-semibold tabular-nums">{formatMoney(p.amount, profile.currency)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
