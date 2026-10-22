# Wally — design spec

> Knows where your money goes.

Replaces the old Google Sheets “Expenses Tracker”. Built to be shared with
friends: everyone signs in with Google and sees only their own money.

## Brand

- **Name:** Wally · **Tagline:** “Knows where your money goes”
- **Icon:** a wallet with a gold coin dropping in (`app/icon.svg`)
- **Style:** modern, colourful, friendly; full dark-mode support
- **Colours** (defined in `app/globals.css`, each with a `-soft` tint):

| Token  | Light     | Used for                      |
| ------ | --------- | ----------------------------- |
| violet | `#6d4aff` | brand, primary actions        |
| coral  | `#ff6b5e` | expenses                      |
| mint   | `#16b886` | income, savings               |
| sun    | `#f5a524` | budgets, warnings             |
| sky    | `#2f9bf0` | recurring bills, installments |

## Navigation

Bottom bar: **Home · Activity · ( + ) · Insights · Plans**. The big **+** opens
Add. Settings opens from the profile picture in every page header.

## Screens

### Home ✅
- **Left to spend** this month = monthly budget − spent. Budget falls back to
  the sum of category budgets, then to this month’s income. Shows a progress
  bar and a per-day allowance for the rest of the month.
- **Quick add**: the 4 most recently used categories.
- **Coming up**: bills due in the next 14 days.
- **Today**: today’s expenses and income.

### Add ✅
- Expense / Income toggle, big amount field.
- Category grid, 4 per row: top 7 most recently used + **More**, which opens a
  full-screen, searchable list of every category.
- Date chips: Today · Yesterday · Pick date. Optional note.

### Activity ✅
- One list for expenses and income, grouped by day with day totals.
- Month switcher with Spent / Earned totals, search, and All / Expenses /
  Income filters. Delete with confirmation.

### Insights (next)
- **Overview**: income, spending, savings vs. last month; 6-month trend;
  spending breakdown; daily pace; tips.
- **Spending**: donut by category; categories vs. last month; budgets;
  spending calendar; biggest expenses.
- **Savings**: automatic (income − spending); savings rate; monthly chart;
  optional **Goals** (e.g. “Emergency fund 40k / 60k”); year-ahead projection.

### Plans (next)
- **Bills**: recurring payments laid out month by month for the next 12 months.
- **Installments**: every active installment with progress, plus a **Coming
  months** view showing when each one ends and how much money it frees up.

### Settings
- Currency and monthly budget ✅
- Import from the old Google Sheet ✅ — upload the sheet as .xlsx. Daily Log →
  expenses, Income Log → income, Recurring → bills, Installments →
  installments; the log tabs become each bill's / installment's paid months
  (not expenses). Sheet categories are added next to Wally's, merging same
  names. Re-importing never duplicates rows.
- Categories (add / edit / archive, per-category budgets), preferences — next.

## Data

`supabase/schema.sql` — profiles, categories, expenses, income, recurring,
recurring_payments, installments, installment_payments, goals. Every table has
Row Level Security (`user_id = auth.uid()`), and child rows reference parents
through `(id, user_id)` so they can’t point at another user’s data. A sign-up
trigger creates the profile and 19 starter categories.

## Roadmap

1. ✅ Scaffold, schema, Google sign-in, Home / Add / Activity
2. Plans: bills and installments (CRUD, mark paid → creates the expense)
3. Insights: Overview, Spending, Savings + Goals
4. Settings: categories and budgets
5. ✅ Import from the Google Sheet
6. ✅ Installable: manifest and home-screen icons (offline shell — later)
