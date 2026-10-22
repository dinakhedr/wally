import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteInstallment } from "@/app/plans-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { BackHeader } from "@/components/forms/BackHeader";
import { getInstallments, getProfile } from "@/lib/data";
import { formatMoney, parseISODate } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import { InstallmentForm } from "./InstallmentForm";

export default async function InstallmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [profile, rows, today] = await Promise.all([
    getProfile(supabase, user.id),
    id === "new" ? Promise.resolve([]) : getInstallments(supabase),
    getToday(),
  ]);
  const plan = id === "new" ? null : (rows.find((r) => r.id === id) ?? null);
  if (id !== "new" && !plan) notFound();
  const history = plan ? [...plan.payments].sort((a, b) => b.seq - a.seq) : [];

  return (
    <>
      <BackHeader href="/plans?tab=installments" title={plan ? plan.name : "New installment"} />
      <InstallmentForm plan={plan} today={today} currency={profile.currency} />

      {plan && (
        <>
          <div className="mt-4">
            <ConfirmButton action={deleteInstallment} id={plan.id} message={`Delete ${plan.name} and its payments?`}>
              <Trash2 size={18} /> Delete installment
            </ConfirmButton>
          </div>
          {history.length > 0 && (
            <section className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-line">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Paid months</h2>
              <ul className="mt-2 divide-y divide-line text-sm">
                {history.map((p) => (
                  <li key={p.seq} className="flex justify-between py-2.5">
                    <span>
                      Month {p.seq} ·{" "}
                      {parseISODate(p.due_on).toLocaleDateString("en", { month: "short", year: "numeric" })}
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
