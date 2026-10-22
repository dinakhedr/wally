import Link from "next/link";
import type { Profile } from "@/lib/types";

export function PageHeader({ title, subtitle, profile }: { title: string; subtitle?: string; profile: Profile }) {
  const initial = (profile.display_name ?? "?").trim().charAt(0).toUpperCase();

  return (
    <header className="flex items-center justify-between gap-4 pt-6 pb-4">
      <div className="min-w-0">
        {subtitle && <p className="text-sm font-medium text-muted">{subtitle}</p>}
        <h1 className="truncate text-2xl font-extrabold tracking-tight">{title}</h1>
      </div>
      <Link href="/settings" aria-label="Settings" className="shrink-0">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" width={40} height={40} referrerPolicy="no-referrer" className="h-10 w-10 rounded-full ring-2 ring-violet-soft" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-soft font-bold text-violet">
            {initial}
          </span>
        )}
      </Link>
    </header>
  );
}
