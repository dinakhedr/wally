import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackHeader({ href, title }: { href: string; title: string }) {
  return (
    <header className="flex items-center gap-2 pt-6 pb-4">
      <Link href={href} aria-label="Back" className="-ml-2 rounded-full p-2 text-muted">
        <ChevronLeft size={24} />
      </Link>
      <h1 className="truncate text-2xl font-extrabold tracking-tight">{title}</h1>
    </header>
  );
}
