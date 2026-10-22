import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import { ImportForm } from "./ImportForm";

export default async function ImportPage() {
  await requireUser();
  const today = await getToday();

  return (
    <>
      <header className="flex items-center gap-2 pt-6 pb-4">
        <Link href="/settings" aria-label="Back to settings" className="-ml-2 rounded-full p-2 text-muted">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Import from Google Sheet</h1>
      </header>
      <ImportForm today={today} />
    </>
  );
}
