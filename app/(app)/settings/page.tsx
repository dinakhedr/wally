import { LogOut } from "lucide-react";
import { signOut, updateSettings } from "@/app/actions";
import { Card, SectionTitle } from "@/components/Card";
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

      <Card className="mt-4">
        <SectionTitle>Coming soon</SectionTitle>
        <p className="text-sm text-muted">Edit categories and per-category budgets, and import from your old Google Sheet.</p>
      </Card>

      <form action={signOut} className="mt-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-coral ring-1 ring-line">
          <LogOut size={18} /> Sign out
        </button>
      </form>

      {saved && <Toast message="Saved" />}
    </>
  );
}
