import { CategoryBubble } from "./CategoryBubble";
import type { Tint } from "@/lib/types";

export function ComingSoon({ items }: { items: { emoji: string; color: Tint; title: string; text: string }[] }) {
  return (
    <>
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.title} className="flex gap-4 rounded-3xl bg-card p-4 ring-1 ring-line">
            <CategoryBubble emoji={i.emoji} color={i.color} />
            <div>
              <p className="font-bold">{i.title}</p>
              <p className="text-sm text-muted">{i.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-center text-sm text-muted">Coming in the next update.</p>
    </>
  );
}
