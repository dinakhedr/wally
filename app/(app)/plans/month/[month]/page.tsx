import { notFound } from "next/navigation";
import { BackHeader } from "@/components/forms/BackHeader";
import { BillLineRow } from "@/components/plans/BillLineRow";
import { InstallmentLineRow } from "@/components/plans/InstallmentLineRow";
import { getBills, getInstallments, getProfile } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { monthLabel } from "@/lib/plans";
import { billSchedule, installmentSchedule, linesTotal } from "@/lib/schedule";
import { requireUser } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";

export default async function PlanMonthPage({
  params,
  searchParams,
}: {
  params: Promise<{ month: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ month }, { type }] = await Promise.all([params, searchParams]);
  if (!/^\d{4}-\d{2}$/.test(month)) notFound();
  const installments = type === "installments";
  const { supabase, user } = await requireUser();
  const [profile, today, bills, plans] = await Promise.all([
    getProfile(supabase, user.id),
    getToday(),
    installments ? Promise.resolve([]) : getBills(supabase),
    installments ? getInstallments(supabase) : Promise.resolve([]),
  ]);
  const { currency } = profile;
  const self = `/plans/month/${month}${installments ? "?type=installments" : ""}`;
  const back = installments ? "/plans?tab=installments" : "/plans";
  const title = `${monthLabel(month, { year: true })} ${installments ? "installments" : "bills"}`;

  if (installments) {
    const lines = installmentSchedule(plans, today, 24).byMonth.get(month) ?? [];
    const paid = lines.filter((l) => l.paid).reduce((n, l) => n + l.amount, 0);
    const total = lines.reduce((n, l) => n + l.amount, 0);
    return (
      <>
        <BackHeader href={back} title={title} />
        <Summary total={total} paid={paid} currency={currency} />
        {lines.length ? (
          <ul className="mt-4 divide-y divide-line rounded-3xl bg-card px-4 ring-1 ring-line">
            {lines.map((l) => (
              <InstallmentLineRow key={`${l.plan.id}-${l.seq}`} line={l} currency={currency} today={today} back={self} />
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-center text-muted">Nothing due this month.</p>
        )}
      </>
    );
  }

  const lines = billSchedule(bills, today, 24).byMonth.get(month) ?? [];
  const paid = lines.reduce((n, l) => n + (l.kind === "paid" ? l.amount : 0), 0);
  return (
    <>
      <BackHeader href={back} title={title} />
      <Summary total={linesTotal(lines)} paid={paid} currency={currency} />
      {lines.length ? (
        <ul className="mt-4 divide-y divide-line rounded-3xl bg-card px-4 ring-1 ring-line">
          {lines.map((l) => (
            <BillLineRow key={`${l.kind}-${l.bill.id}-${l.date}`} line={l} currency={currency} today={today} back={self} />
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-center text-muted">No bills this month.</p>
      )}
    </>
  );
}

function Summary({ total, paid, currency }: { total: number; paid: number; currency: string }) {
  return (
    <section className="rounded-3xl bg-sky-soft p-5">
      <p className="text-3xl font-extrabold tabular-nums">{formatMoney(total, currency)}</p>
      <p className="mt-1 text-sm text-muted">
        Paid {formatMoney(paid, currency)} · Left {formatMoney(total - paid, currency)}
      </p>
    </section>
  );
}
