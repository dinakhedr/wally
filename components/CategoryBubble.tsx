import { TINT } from "@/lib/tint";
import type { Tint } from "@/lib/types";

const SIZES = { sm: "h-9 w-9 text-lg", md: "h-11 w-11 text-xl", lg: "h-14 w-14 text-2xl" };

export function CategoryBubble({
  emoji,
  color,
  size = "md",
}: {
  emoji: string;
  color: Tint;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl ${SIZES[size]} ${TINT[color]?.soft ?? TINT.violet.soft}`}
    >
      {emoji}
    </span>
  );
}
