"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check } from "lucide-react";

export function Toast({ message }: { message: string }) {
  const [show, setShow] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const t = setTimeout(() => {
      setShow(false);
      router.replace(pathname, { scroll: false });
    }, 2200);
    return () => clearTimeout(t);
  }, [router, pathname]);

  if (!show) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-28 z-40 flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-bg shadow-lg">
        <Check size={16} strokeWidth={3} className="text-mint" />
        {message}
      </div>
    </div>
  );
}
