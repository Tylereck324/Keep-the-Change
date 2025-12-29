# Budget App

A shared household budget web app for two users with PIN-based authentication, envelope-style budgeting, and manual transaction entry.

## Features

- **PIN Authentication**: Simple 4-6 digit PIN for shared household access
- **Category Budgeting**: Create categories with budgeted amounts per month
- **Transaction Management**: Manually add, edit, and delete transactions
- **Dashboard**: View budget progress with color-coded indicators
- **Month Rollover**: Copy budgets from previous month
- **Settings**: Change PIN and manage categories

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Next.js Server Actions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: PIN-based with bcrypt hashing

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd BudgetApp
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to find your credentials
3. Go to SQL Editor and run the schema from `supabase/schema.sql`

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and add your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. First-Time Setup

1. On first visit, you'll be prompted to create a PIN
2. Add some categories in the Budget page
3. Start adding transactions!

## Database Schema

The app uses four main tables:

- **households**: Stores household info and PIN hash
- **categories**: Budget categories with names and colors
- **monthly_budgets**: Budgeted amounts per category per month
- **transactions**: Individual spending transactions

See `supabase/schema.sql` for the complete schema with indexes.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Deploy!

### Build for Production

```bash
npm run build
npm start
```

**Note**: Build requires valid Supabase credentials in `.env.local`.

## Project Structure

```
/app                    # Next.js App Router pages
  /api/auth            # Authentication API routes
  /budget              # Budget management page
  /transactions        # Transaction list page
  /settings            # Settings page
/components            # React components
  /ui                  # shadcn/ui components
/lib
  /actions             # Server actions for data mutations
  /auth.ts             # Authentication utilities
  /supabase.ts         # Supabase client
  /types.ts            # TypeScript types
/supabase
  /schema.sql          # Database schema
```

## License

MIT
