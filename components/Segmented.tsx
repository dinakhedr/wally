import Link from "next/link";

/** A row of tabs that switch via the URL, so they work without JavaScript. */
export function Segmented({ tabs, active }: { tabs: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav className="flex rounded-full bg-card-2 p-1 text-sm font-bold" aria-label="Sections">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={`flex-1 rounded-full py-2 text-center transition ${t.key === active ? "bg-card text-ink shadow-sm" : "text-muted"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
