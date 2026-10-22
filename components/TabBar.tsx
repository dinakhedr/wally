"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, ChartPie, House, List, Plus } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", Icon: House },
  { href: "/activity", label: "Activity", Icon: List },
  { href: "/insights", label: "Insights", Icon: ChartPie },
  { href: "/plans", label: "Plans", Icon: CalendarClock },
];

export function TabBar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const tab = ({ href, label, Icon }: (typeof TABS)[number]) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold transition ${
          active ? "text-violet" : "text-muted"
        }`}
      >
        <Icon size={22} strokeWidth={active ? 2.4 : 2} />
        {label}
      </Link>
    );
  };

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-end px-2">
        {TABS.slice(0, 2).map(tab)}
        <div className="flex flex-1 justify-center">
          <Link
            href="/add"
            aria-label="Add"
            className="-mt-6 mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-violet text-white shadow-lg shadow-violet/40 transition active:scale-95"
          >
            <Plus size={28} strokeWidth={2.6} />
          </Link>
        </div>
        {TABS.slice(2).map(tab)}
      </div>
    </nav>
  );
}
