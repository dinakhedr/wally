export type Tint = "violet" | "coral" | "mint" | "sun" | "sky";
export type Kind = "expense" | "income";

export type Category = {
  id: string;
  kind: Kind;
  name: string;
  emoji: string;
  color: Tint;
  budget: number | null;
  sort_order: number;
  archived: boolean;
  last_used_at: string | null;
};

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  currency: string;
  monthly_budget: number | null;
  week_starts_on: number;
};

/** An expense or income row, normalised for lists. */
export type Entry = {
  id: string;
  kind: Kind;
  amount: number;
  note: string | null;
  date: string; // YYYY-MM-DD
  created_at: string;
  category: Pick<Category, "name" | "emoji" | "color"> | null;
};

export type Recurring = {
  id: string;
  name: string;
  amount: number;
  frequency: "weekly" | "monthly" | "yearly";
  next_due: string;
  category: Pick<Category, "name" | "emoji" | "color"> | null;
};
