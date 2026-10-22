import Link from "next/link";
import { ChevronRight, FileSpreadsheet, LogOut, Tags } from "lucide-react";
import { signOut, updateSettings } from "@/app/actions";
import { Card, SectionTitle } from "@/components/Card";
import { DangerZone } from "@/components/DangerZone";
import { PageHeader } from "@/components/PageHeader";
import { Toast } from "@/components/Toast";
import { getProfile } from "@/lib/data";
import { CURRENCIES } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);

  return (
    <>
      <PageHeader title="Settings" subtitle={user.email} profile={profile} />

      <form action={updateSettings}>
        <Card>
          <SectionTitle>Money</SectionTitle>
          <label className="mt-2 block">
            <span className="text-sm font-semibold">Currency</span>
            <select
              name="currency"
              defaultValue={profile.currency}
              className="mt-1 w-full rounded-2xl bg-card-2 px-4 py-3 outline-none focus:ring-2 focus:ring-violet"
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-semibold">Monthly budget</span>
            <span className="block text-xs text-muted">Used for “Left to spend” on Home. Leave empty to use your income.</span>
            <input
              name="monthly_budget"
              inputMode="decimal"
              defaultValue={profile.monthly_budget ?? ""}
              placeholder="e.g. 20000"
              className="mt-1 w-full rounded-2xl bg-card-2 px-4 py-3 outline-none focus:ring-2 focus:ring-violet"
            />
          </label>
          <button className="mt-5 w-full rounded-2xl bg-violet py-3.5 font-bold text-white">Save</button>
        </Card>
      </form>

      <Link href="/settings/categories" className="mt-4 flex items-center gap-4 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-line">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-soft text-violet">
          <Tags size={22} />
        </span>
        <span className="flex-1">
          <span className="block font-bold">Categories & budgets</span>
          <span className="block text-sm text-muted">Add, edit, hide and set budgets</span>
        </span>
        <ChevronRight size={20} className="text-muted" />
      </Link>

      <Link href="/settings/import" className="mt-4 flex items-center gap-4 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-line">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint-soft text-mint">
          <FileSpreadsheet size={22} />
        </span>
        <span className="flex-1">
          <span className="block font-bold">Import from Google Sheet</span>
          <span className="block text-sm text-muted">Bring in your old Expenses Tracker</span>
        </span>
        <ChevronRight size={20} className="text-muted" />
      </Link>

      <form action={signOut} className="mt-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-coral ring-1 ring-line">
          <LogOut size={18} /> Sign out
        </button>
      </form>

      <DangerZone />

      {saved && <Toast message="Saved" />}
    </>
  );
}
