# Budget App Design

## Overview

A shared household budget web app for two users (couple) using envelope/category-based budgeting with manual transaction entry.

## Key Decisions

- **Users:** Two people sharing one household budget
- **Budgeting approach:** Envelope/category budgeting (allocate money to categories, track spending against each)
- **Transaction entry:** Manual only (no bank sync, no costs)
- **Authentication:** Shared PIN (no accounts, simple access)
- **Hosting:** Vercel (free tier) + Supabase (free tier)
- **Stack:** Next.js 14, TypeScript, Supabase, shadcn/ui, Tailwind CSS

## Data Model

```sql
households
  - id (uuid, primary key)
  - name (text)
  - pin_hash (text)
  - created_at (timestamp)

categories
  - id (uuid, primary key)
  - household_id (uuid, foreign key)
  - name (text)
  - color (text)
  - created_at (timestamp)

transactions
  - id (uuid, primary key)
  - household_id (uuid, foreign key)
  - category_id (uuid, foreign key)
  - amount (decimal)
  - description (text, optional)
  - date (date)
  - created_at (timestamp)

monthly_budgets
  - id (uuid, primary key)
  - household_id (uuid, foreign key)
  - category_id (uuid, foreign key)
  - month (text, YYYY-MM format)
  - budgeted_amount (decimal)
```

## Screens & Features

### Dashboard (Home)
- Current month overview
- Each category shows: budgeted amount, spent amount, remaining
- Progress bars with color coding (green → yellow → red)
- Quick "Add Transaction" button

### Transactions
- List of all transactions, newest first
- Filter by category, date range
- Tap to edit or delete
- Running total at top

### Add Transaction
- Amount input
- Category picker (with "+ New Category" inline option)
- Description (optional)
- Date (defaults to today)
- One tap to save

### Budget Setup
- List of categories with budgeted amounts
- Add/edit/delete categories
- "Copy last month's budget" button
- Total budgeted vs expected income

### Settings
- Change PIN
- Edit categories (name, color, reorder)

## Access & Security

### PIN-based Access
- First visit prompts for 4-6 digit PIN creation
- PIN stored as hash in database
- Cookie keeps user logged in for 30 days
- Rate limiting: 5 wrong attempts → 1 minute wait

### Setup Flow
1. Visit app URL
2. App detects no PIN → prompt to create one
3. Set PIN → onboarding with suggested categories
4. Share URL + PIN with partner

## Error Handling

### Network Issues
- Clear offline message, no offline mode
- Retry button for failed saves

### Data Validation
- Amount: positive number required
- Category: required
- Description: optional, max 100 characters
- Date: cannot be in future

### Edge Cases
- Delete category with transactions → prompt to move or delete transactions
- Negative remaining balance → show in red (no hard block)
- Month rollover → manual setup with "copy from last month" helper
- Forgot PIN → manual database reset (admin only)

## Project Structure

```
/app
  /page.tsx              # Dashboard
  /transactions/page.tsx # Transaction list
  /budget/page.tsx       # Budget setup
  /settings/page.tsx     # Settings
  /api                   # API routes
/components
  /ui                    # shadcn components
  /transaction-form.tsx
  /category-card.tsx
  /pin-modal.tsx
/lib
  /supabase.ts           # Database client
  /utils.ts              # Helpers
```

## Deployment

- GitHub repo → Vercel auto-deploy
- Environment variables: Supabase URL + anon key
- Free tier limits: 500MB database, 50k monthly requests

## MVP Scope

1. PIN setup and authentication
2. Category CRUD with budgeted amounts
3. Transaction CRUD
4. Dashboard with category progress bars
5. Monthly budget management with copy feature
