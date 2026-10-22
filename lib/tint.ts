import type { Tint } from "./types";

// Literal class names so Tailwind picks them up.
export const TINT: Record<Tint, { bg: string; soft: string; text: string }> = {
  violet: { bg: "bg-violet", soft: "bg-violet-soft", text: "text-violet" },
  coral: { bg: "bg-coral", soft: "bg-coral-soft", text: "text-coral" },
  mint: { bg: "bg-mint", soft: "bg-mint-soft", text: "text-mint" },
  sun: { bg: "bg-sun", soft: "bg-sun-soft", text: "text-sun" },
  sky: { bg: "bg-sky", soft: "bg-sky-soft", text: "text-sky" },
};
