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
Layout “Home · 4” on the design canvas:
- **Ring card**: % of budget used as a ring, **left to spend** (or over by),
  per-day allowance and days left. Budget falls back to the sum of category
  budgets, then to this month’s income. No budget → a “Set a monthly budget” card.
- **Spent card**: spent this month of the budget, one bar split into
  Expenses / Bills / Installments with an amount under each.
- **Quick add**: the 6 most recent categories as a two-column list (full names).
- **Coming up**: bills due in the next 14 days.
- **Recent**: the 5 most recently added expenses and income (any date), each with its day; tap to edit.

### Add ✅
Layout A (see `docs/mockups/add-layouts.html`), full screen, no scrolling:
- Expense / Income toggle.
- **Category first**: the 6 most recent as a two-column list with full names
  (“Recent · 3” on the design canvas) + **All ›** (full-screen, searchable
  list). A category picked from All takes the last spot.
- Amount with Wally's own number pad (no phone keyboard), max 2 decimals.
- Date pill (opens the date picker; past or future dates) + “Yesterday?”
  shortcut; note pill opens a note field only when tapped.

### Activity ✅
- One list for expenses and income, grouped by day with day totals.
- Month switcher with Spent / Earned totals, search, and All / Expenses /
  Income filters. Tap an entry to edit it; delete with confirmation.

### Insights ✅
Tabs: **Overview · Spending · Months** (“Insights revamp” row on the design canvas).
- **Overview**: income / spending / saved vs. last month; **trend chart** with a
  “6 months | This year” switch (6 months default; This year = January to now,
  with the year's income / spent / saved) — tap a month for a pop-up with its
  income, spending (expenses / bills / installments), saved and a link to its
  Spending page; where it went; savings for the last 6 months; the year ahead;
  daily pace; **goals**; tips.
- **Spending**: any month, past or future; first row **Total income** and
  **Total savings**, then total spending and its split; donut by category;
  categories vs. last month; budgets; spending calendar; biggest expenses.
- **Months** (table, “Months B”): a year (‹ year ›) as a table — Income,
  Spending, Saved per month; tick months (or Select all) to see their combined
  totals and monthly average. Upcoming months are greyed out.

### Plans ✅
- **Bills**: this month in full (to pay first, then paid, with undo); a month
  list including this month (total + count, tap to open that month's bills)
  with past months — oldest first — behind a "Show past months" toggle.
  **Pay** appears only once a bill's date has come; paid rows carry a green
  **Paid** pill. Add, edit, pause, delete.
- **Installments**: “Left to pay” across active plans, each plan with progress
  and Pay (only once due); a month list like Bills noting “🎉 X ends”.

### Settings
- Currency and monthly budget ✅
- Import from the old Google Sheet ✅ — upload the sheet as .xlsx.
  - Daily Log → expenses, Income Log → income
  - Recurring → **bills** and Installments → **installments**, each with its
    paid months from the log tabs (history only, not expenses)
  - Categories: same name as a Wally category (ignoring case) → merged
    automatically; otherwise the user picks a Wally category (pre-selected
    suggestion, e.g. Cafe → Cafe & Restaurants, Supermarket → Groceries) or
    "Add as new". Existing Wally categories are never modified.
  - Re-importing never duplicates rows.
- Categories & budgets ✅ — add, edit (emoji, colour, budget), hide, delete
- Danger zone ✅ — delete all data, delete account (type DELETE to confirm)

### Totals
**Total spending = expenses + bill payments + installment payments** for the
period. They stay separate in the data; Home's “Left to spend” and Activity's
“Spent” add them up (with a breakdown), and Insights will do the same.

### Appearance
Settings → Appearance: System (default), Light or Dark. Saved per device in a
`theme` cookie and applied server-side (`<html data-theme>`), so there's no
flash; the status-bar colour follows it.

### Speed
Session checks use `getClaims()` (local JWT verification) instead of a Supabase
Auth round trip, and every tab shows an instant loading skeleton. Server code
runs in Vercel's London region (`vercel.json` → `lhr1`), next to the Supabase
database (eu-west-2, London).

### Money format
Amounts always show the currency code: `EGP 1,250`.

### Charts
Plain SVG, no chart library. Spend `#e8604f` / income `#14a37a` and the six
category colours (`--cat-1…6`, “Other” grey) were checked with the dataviz
palette validator for colour-blind separation and contrast in light and dark.
Every chart has a legend or direct labels and tap/hover values.

## Mockups
Design canvas: https://claude.ai/artifact/FzwM4v3dnqk6h4UJMUfjPk (private to the owner).

## Data

`supabase/schema.sql` — profiles, categories, expenses, income, recurring,
recurring_payments, installments, installment_payments, goals. Every table has
Row Level Security (`user_id = auth.uid()`), and child rows reference parents
through `(id, user_id)` so they can’t point at another user’s data. A sign-up
trigger creates the profile and the starter categories
(`public.starter_categories()`):

- **Expenses:** 🛒 Groceries · 🍽️ Cafe & Restaurants · 🚗 Transport · ⛽ Petrol ·
  🔧 Car Maintenance · 🚕 Ride Hailing · 💡 Bills · 📶 Internet · ⚡ Utilities ·
  🏠 Home · 🔑 Rent · 🛍️ Shopping · 💊 Health · 🏋️ Gym · 💅 Personal care · 🎬 Fun ·
  📺 Subscriptions · 📚 Education · 🎁 Gifts · 🏥 Charity · ✈️ Travel · 🐾 Pets ·
  🚬 Smoking · 🤝 Lent Money · 💸 Debt Repayment
- **Income:** 💼 Salary · 💻 Freelance · 🎉 Bonus · ⏰ Overtime · 📊 Commission ·
  🏦 Bank Interest · 📋 Certificate Interest · 📈 Dividends · 🏠 Rental Income ·
  🎁 Gift · 🔄 Refund · 💰 Money Returned · 📥 Borrowed Money

## Roadmap

1. ✅ Scaffold, schema, Google sign-in, Home / Add / Activity
2. ✅ Plans: bills and installments
3. ✅ Insights: Overview (incl. savings + goals), Spending, Months
4. ✅ Settings: categories and budgets, delete data / account
5. ✅ Import from the Google Sheet
6. ✅ Installable: manifest and home-screen icons (offline shell — later)
