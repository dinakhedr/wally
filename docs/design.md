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
  Income filters. Tap an entry to edit it; delete with confirmation.

### Insights ✅
- **Overview**: income, spending, savings vs. last month; 6-month trend;
  spending breakdown; daily pace; tips.
- **Spending**: donut by category; categories vs. last month; budgets;
  spending calendar; biggest expenses.
- **Savings**: automatic (income − spending); savings rate; monthly chart;
  optional **Goals** (e.g. “Emergency fund 40k / 60k”); year-ahead projection.

### Plans ✅
- **Bills**: this month in full (to pay first, then paid, with undo), the next
  11 months collapsed to a total each; mark paid / skip, add, edit, pause, delete.
- **Installments**: every active installment with progress, plus a **Coming
  months** view showing when each one ends and how much money it frees up.

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

### Money format
Amounts always show the currency code: `EGP 1,250`.

### Charts
Plain SVG, no chart library. Spend `#e8604f` / income `#14a37a` and the six
category colours (`--cat-1…6`, “Other” grey) were checked with the dataviz
palette validator for colour-blind separation and contrast in light and dark.
Every chart has a legend or direct labels and tap/hover values.

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
3. ✅ Insights: Overview, Spending, Savings + Goals
4. ✅ Settings: categories and budgets, delete data / account
5. ✅ Import from the Google Sheet
6. ✅ Installable: manifest and home-screen icons (offline shell — later)
