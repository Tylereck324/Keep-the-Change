# Budget App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a shared household budget web app with PIN authentication, envelope-style category budgeting, and manual transaction entry.

**Architecture:** Next.js 14 App Router with server actions for API logic. Supabase PostgreSQL for persistence with row-level security. PIN-based auth stored as bcrypt hash, session in HTTP-only cookie.

**Tech Stack:** Next.js 14, TypeScript, Supabase, shadcn/ui, Tailwind CSS, bcryptjs

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, etc.

**Step 1: Create Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

When prompted, accept defaults. Expected: Project scaffolded with `/app` directory.

**Step 2: Verify project runs**

Run:
```bash
npm run dev
```

Expected: Server starts at http://localhost:3000, shows Next.js welcome page.

**Step 3: Stop dev server and commit**

Run:
```bash
git add -A && git commit -m "chore: initialize Next.js 14 project"
```

---

## Task 2: Install shadcn/ui

**Files:**
- Create: `components.json`
- Create: `components/ui/` (multiple files)
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

**Step 1: Initialize shadcn/ui**

Run:
```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Expected: `components.json` created, `globals.css` updated with CSS variables.

**Step 2: Add core UI components**

Run:
```bash
npx shadcn@latest add button card input label dialog alert progress badge
```

Expected: Components added to `components/ui/`

**Step 3: Commit**

Run:
```bash
git add -A && git commit -m "chore: add shadcn/ui with core components"
```

---

## Task 3: Set Up Supabase Client

**Files:**
- Create: `lib/supabase.ts`
- Create: `.env.local`
- Create: `lib/types.ts`

**Step 1: Install Supabase client**

Run:
```bash
npm install @supabase/supabase-js
```

**Step 2: Create environment file**

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Note: User must create Supabase project at https://supabase.com and paste real values.

**Step 3: Create Supabase client**

Create `lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

**Step 4: Create database types**

Create `lib/types.ts`:
```typescript
export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          pin_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          pin_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          pin_hash?: string
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          household_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          color: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          color?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          household_id: string
          category_id: string
          amount: number
          description: string | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          category_id: string
          amount: number
          description?: string | null
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          category_id?: string
          amount?: number
          description?: string | null
          date?: string
          created_at?: string
        }
      }
      monthly_budgets: {
        Row: {
          id: string
          household_id: string
          category_id: string
          month: string
          budgeted_amount: number
        }
        Insert: {
          id?: string
          household_id: string
          category_id: string
          month: string
          budgeted_amount: number
        }
        Update: {
          id?: string
          household_id?: string
          category_id?: string
          month?: string
          budgeted_amount?: number
        }
      }
    }
  }
}

export type Household = Database['public']['Tables']['households']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type MonthlyBudget = Database['public']['Tables']['monthly_budgets']['Row']
```

**Step 5: Add .env.local to .gitignore**

Verify `.gitignore` contains:
```
.env.local
```

**Step 6: Commit**

Run:
```bash
git add -A && git commit -m "chore: add Supabase client and database types"
```

---

## Task 4: Create Supabase Database Schema

**Files:**
- Create: `supabase/schema.sql` (reference file, run in Supabase dashboard)

**Step 1: Create schema SQL file**

Create `supabase/schema.sql`:
```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Households table
create table households (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'My Household',
  pin_hash text not null,
  created_at timestamp with time zone default now()
);

-- Categories table
create table categories (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamp with time zone default now()
);

-- Transactions table
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  category_id uuid references categories(id) on delete set null,
  amount decimal(10,2) not null,
  description text,
  date date not null default current_date,
  created_at timestamp with time zone default now()
);

-- Monthly budgets table
create table monthly_budgets (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  month text not null,
  budgeted_amount decimal(10,2) not null default 0,
  unique(household_id, category_id, month)
);

-- Indexes for performance
create index idx_categories_household on categories(household_id);
create index idx_transactions_household on transactions(household_id);
create index idx_transactions_date on transactions(date);
create index idx_monthly_budgets_household_month on monthly_budgets(household_id, month);
```

**Step 2: Run schema in Supabase**

Go to Supabase Dashboard → SQL Editor → Paste and run the schema.

Expected: All 4 tables created successfully.

**Step 3: Commit**

Run:
```bash
git add -A && git commit -m "chore: add database schema SQL"
```

---

## Task 5: PIN Authentication - Setup Flow

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/setup/route.ts`
- Create: `app/api/auth/verify/route.ts`
- Create: `components/pin-modal.tsx`

**Step 1: Install bcryptjs**

Run:
```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

**Step 2: Create auth utilities**

Create `lib/auth.ts`:
```typescript
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { supabase } from './supabase'

const COOKIE_NAME = 'household_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

export async function createSession(householdId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, householdId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getHousehold() {
  const householdId = await getSession()
  if (!householdId) return null

  const { data } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .single()

  return data
}

export async function checkHouseholdExists() {
  const { data } = await supabase
    .from('households')
    .select('id')
    .limit(1)
    .single()

  return !!data
}
```

**Step 3: Create PIN setup API route**

Create `app/api/auth/setup/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPin, createSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

    // Validate PIN
    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be 4-6 digits' },
        { status: 400 }
      )
    }

    // Check if household already exists
    const { data: existing } = await supabase
      .from('households')
      .select('id')
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Household already exists' },
        { status: 400 }
      )
    }

    // Create household with hashed PIN
    const pinHash = await hashPin(pin)
    const { data: household, error } = await supabase
      .from('households')
      .insert({ name: 'My Household', pin_hash: pinHash })
      .select()
      .single()

    if (error || !household) {
      return NextResponse.json(
        { error: 'Failed to create household' },
        { status: 500 }
      )
    }

    // Create session
    await createSession(household.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 4: Create PIN verify API route**

Create `app/api/auth/verify/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyPin, createSession } from '@/lib/auth'

// Rate limiting: track failed attempts in memory (resets on server restart)
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 60 * 1000 // 1 minute

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const now = Date.now()

    // Check rate limiting
    const attempts = failedAttempts.get(ip)
    if (attempts && attempts.count >= MAX_ATTEMPTS) {
      const timeSinceLast = now - attempts.lastAttempt
      if (timeSinceLast < LOCKOUT_DURATION) {
        const waitSeconds = Math.ceil((LOCKOUT_DURATION - timeSinceLast) / 1000)
        return NextResponse.json(
          { error: `Too many attempts. Try again in ${waitSeconds} seconds.` },
          { status: 429 }
        )
      }
      // Reset after lockout period
      failedAttempts.delete(ip)
    }

    const { pin } = await request.json()

    if (!pin) {
      return NextResponse.json(
        { error: 'PIN is required' },
        { status: 400 }
      )
    }

    // Get household
    const { data: household } = await supabase
      .from('households')
      .select('*')
      .limit(1)
      .single()

    if (!household) {
      return NextResponse.json(
        { error: 'No household found' },
        { status: 404 }
      )
    }

    // Verify PIN
    const isValid = await verifyPin(pin, household.pin_hash)

    if (!isValid) {
      // Track failed attempt
      const current = failedAttempts.get(ip) ?? { count: 0, lastAttempt: now }
      failedAttempts.set(ip, { count: current.count + 1, lastAttempt: now })

      return NextResponse.json(
        { error: 'Incorrect PIN' },
        { status: 401 }
      )
    }

    // Clear failed attempts on success
    failedAttempts.delete(ip)

    // Create session
    await createSession(household.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 5: Commit**

Run:
```bash
git add -A && git commit -m "feat: add PIN authentication API routes"
```

---

## Task 6: PIN Modal Component

**Files:**
- Create: `components/pin-modal.tsx`

**Step 1: Create PIN modal component**

Create `components/pin-modal.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PinModalProps {
  mode: 'setup' | 'verify'
  onSuccess: () => void
}

export function PinModal({ mode, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate PIN format
    if (!/^\d{4,6}$/.test(pin)) {
      setError('PIN must be 4-6 digits')
      return
    }

    // For setup, confirm PINs match
    if (mode === 'setup' && pin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    setLoading(true)

    try {
      const endpoint = mode === 'setup' ? '/api/auth/setup' : '/api/auth/verify'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      onSuccess()
    } catch {
      setError('Failed to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {mode === 'setup' ? 'Create Your PIN' : 'Enter PIN'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'setup'
              ? 'Set a 4-6 digit PIN to secure your budget. Share this PIN with your partner.'
              : 'Enter your PIN to access your budget.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Enter 4-6 digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>

          {mode === 'setup' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <Input
                id="confirmPin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Confirm your PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'setup' ? 'Create PIN' : 'Unlock'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Commit**

Run:
```bash
git add -A && git commit -m "feat: add PIN modal component"
```

---

## Task 7: App Layout and Auth Check

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/providers.tsx`
- Create: `components/auth-guard.tsx`
- Modify: `app/page.tsx`

**Step 1: Create auth guard component**

Create `components/auth-guard.tsx`:
```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PinModal } from './pin-modal'

interface AuthGuardProps {
  children: React.ReactNode
  householdExists: boolean
  isAuthenticated: boolean
}

export function AuthGuard({ children, householdExists, isAuthenticated }: AuthGuardProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(!isAuthenticated)

  const handleSuccess = () => {
    setShowModal(false)
    router.refresh()
  }

  if (showModal) {
    return (
      <div className="min-h-screen bg-background">
        <PinModal
          mode={householdExists ? 'verify' : 'setup'}
          onSuccess={handleSuccess}
        />
      </div>
    )
  }

  return <>{children}</>
}
```

**Step 2: Update app layout**

Modify `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Budget App',
  description: 'Household budget tracker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

**Step 3: Update home page with auth check**

Modify `app/page.tsx`:
```typescript
import { getSession, checkHouseholdExists } from '@/lib/auth'
import { AuthGuard } from '@/components/auth-guard'
import { Dashboard } from '@/components/dashboard'

export default async function Home() {
  const [householdExists, session] = await Promise.all([
    checkHouseholdExists(),
    getSession(),
  ])

  const isAuthenticated = !!session

  return (
    <AuthGuard householdExists={householdExists} isAuthenticated={isAuthenticated}>
      <Dashboard />
    </AuthGuard>
  )
}
```

**Step 4: Create placeholder dashboard component**

Create `components/dashboard.tsx`:
```typescript
export function Dashboard() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Budget Dashboard</h1>
      <p className="text-muted-foreground">Welcome! Your budget app is ready.</p>
    </main>
  )
}
```

**Step 5: Test the auth flow**

Run:
```bash
npm run dev
```

Expected:
1. Visit http://localhost:3000
2. See PIN setup modal (first time)
3. Create PIN → redirects to dashboard
4. Clear cookies → see PIN verify modal

**Step 6: Commit**

Run:
```bash
git add -A && git commit -m "feat: add auth guard and app layout"
```

---

## Task 8: Category Management - Data Layer

**Files:**
- Create: `lib/actions/categories.ts`

**Step 1: Create category server actions**

Create `lib/actions/categories.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function getCategories() {
  const householdId = await getSession()
  if (!householdId) return []

  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId)
    .order('name')

  return data ?? []
}

export async function createCategory(name: string, color: string) {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('categories')
    .insert({ household_id: householdId, name, color })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/')
  return data
}

export async function updateCategory(id: string, name: string, color: string) {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('categories')
    .update({ name, color })
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) throw new Error(error.message)

  revalidatePath('/')
}

export async function deleteCategory(id: string) {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) throw new Error(error.message)

  revalidatePath('/')
}
```

**Step 2: Commit**

Run:
```bash
git add -A && git commit -m "feat: add category server actions"
```

---

## Task 9: Category Management - UI

**Files:**
- Create: `app/budget/page.tsx`
- Create: `components/category-form.tsx`
- Create: `components/category-card.tsx`

**Step 1: Create category form component**

Create `components/category-form.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createCategory, updateCategory } from '@/lib/actions/categories'

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b',
]

interface CategoryFormProps {
  category?: { id: string; name: string; color: string }
  trigger: React.ReactNode
  onSuccess?: () => void
}

export function CategoryForm({ category, trigger, onSuccess }: CategoryFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!category

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setLoading(true)

    try {
      if (isEditing) {
        await updateCategory(category.id, name.trim(), color)
      } else {
        await createCategory(name.trim(), color)
      }
      setOpen(false)
      setName('')
      setColor(COLORS[0])
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Groceries"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === c ? 'border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Category'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Create category card component**

Create `components/category-card.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CategoryForm } from './category-form'
import { deleteCategory } from '@/lib/actions/categories'
import { Category, MonthlyBudget } from '@/lib/types'

interface CategoryCardProps {
  category: Category
  budget?: MonthlyBudget
  spent: number
}

export function CategoryCard({ category, budget, spent }: CategoryCardProps) {
  const [deleting, setDeleting] = useState(false)

  const budgeted = budget?.budgeted_amount ?? 0
  const remaining = budgeted - spent
  const percentUsed = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0

  const getProgressColor = () => {
    if (percentUsed >= 100) return 'bg-red-500'
    if (percentUsed >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const handleDelete = async () => {
    if (!confirm('Delete this category? Transactions will be uncategorized.')) return

    setDeleting(true)
    try {
      await deleteCategory(category.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <CardTitle className="text-lg">{category.name}</CardTitle>
          </div>
          <div className="flex gap-1">
            <CategoryForm
              category={category}
              trigger={<Button variant="ghost" size="sm">Edit</Button>}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>${spent.toFixed(2)} spent</span>
            <span>${budgeted.toFixed(2)} budgeted</span>
          </div>
          <Progress value={percentUsed} className={getProgressColor()} />
          <p className={`text-sm ${remaining < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
            ${Math.abs(remaining).toFixed(2)} {remaining < 0 ? 'over budget' : 'remaining'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Create budget page**

Create `app/budget/page.tsx`:
```typescript
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCategories } from '@/lib/actions/categories'
import { CategoryCard } from '@/components/category-card'
import { CategoryForm } from '@/components/category-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function BudgetPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const categories = await getCategories()

  return (
    <main className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Budget Setup</h1>
        </div>
        <CategoryForm
          trigger={<Button>+ New Category</Button>}
        />
      </div>

      {categories.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No categories yet. Create your first one!
        </p>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              spent={0}
            />
          ))}
        </div>
      )}
    </main>
  )
}
```

**Step 4: Test category management**

Run:
```bash
npm run dev
```

Visit http://localhost:3000/budget and test:
- Create new categories
- Edit category name and color
- Delete a category

**Step 5: Commit**

Run:
```bash
git add -A && git commit -m "feat: add category management UI"
```

---

## Task 10: Monthly Budget Management

**Files:**
- Create: `lib/actions/budgets.ts`
- Modify: `app/budget/page.tsx`
- Create: `components/budget-amount-input.tsx`

**Step 1: Create budget server actions**

Create `lib/actions/budgets.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function getMonthlyBudgets(month: string) {
  const householdId = await getSession()
  if (!householdId) return []

  const { data } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('household_id', householdId)
    .eq('month', month)

  return data ?? []
}

export async function setBudgetAmount(categoryId: string, month: string, amount: number) {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('monthly_budgets')
    .upsert(
      {
        household_id: householdId,
        category_id: categoryId,
        month,
        budgeted_amount: amount,
      },
      { onConflict: 'household_id,category_id,month' }
    )

  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/budget')
}

export async function copyBudgetFromPreviousMonth(currentMonth: string) {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Calculate previous month
  const [year, month] = currentMonth.split('-').map(Number)
  const prevDate = new Date(year, month - 2, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  // Get previous month's budgets
  const { data: prevBudgets } = await supabase
    .from('monthly_budgets')
    .select('category_id, budgeted_amount')
    .eq('household_id', householdId)
    .eq('month', prevMonth)

  if (!prevBudgets || prevBudgets.length === 0) {
    throw new Error('No budget found for previous month')
  }

  // Copy to current month
  const newBudgets = prevBudgets.map((b) => ({
    household_id: householdId,
    category_id: b.category_id,
    month: currentMonth,
    budgeted_amount: b.budgeted_amount,
  }))

  const { error } = await supabase
    .from('monthly_budgets')
    .upsert(newBudgets, { onConflict: 'household_id,category_id,month' })

  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/budget')
}
```

**Step 2: Create budget amount input component**

Create `components/budget-amount-input.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { setBudgetAmount } from '@/lib/actions/budgets'

interface BudgetAmountInputProps {
  categoryId: string
  month: string
  initialAmount: number
}

export function BudgetAmountInput({ categoryId, month, initialAmount }: BudgetAmountInputProps) {
  const [amount, setAmount] = useState(initialAmount.toString())
  const [saving, setSaving] = useState(false)

  const handleBlur = async () => {
    const numAmount = parseFloat(amount) || 0
    if (numAmount === initialAmount) return

    setSaving(true)
    try {
      await setBudgetAmount(categoryId, month, numAmount)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
      setAmount(initialAmount.toString())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground">$</span>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onBlur={handleBlur}
        className="w-24 h-8"
        disabled={saving}
      />
    </div>
  )
}
```

**Step 3: Update budget page with monthly budgets**

Replace `app/budget/page.tsx`:
```typescript
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCategories } from '@/lib/actions/categories'
import { getMonthlyBudgets, copyBudgetFromPreviousMonth } from '@/lib/actions/budgets'
import { CategoryForm } from '@/components/category-form'
import { BudgetAmountInput } from '@/components/budget-amount-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function BudgetPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const currentMonth = getCurrentMonth()
  const [categories, budgets] = await Promise.all([
    getCategories(),
    getMonthlyBudgets(currentMonth),
  ])

  const budgetMap = new Map(budgets.map((b) => [b.category_id, b]))
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgeted_amount, 0)

  async function handleCopyFromPrevious() {
    'use server'
    await copyBudgetFromPreviousMonth(currentMonth)
  }

  return (
    <main className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Budget Setup</h1>
          <p className="text-muted-foreground">
            {new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={handleCopyFromPrevious}>
            <Button variant="outline" type="submit">
              Copy Last Month
            </Button>
          </form>
          <CategoryForm trigger={<Button>+ Category</Button>} />
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Total Budgeted</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">${totalBudgeted.toFixed(2)}</p>
        </CardContent>
      </Card>

      {categories.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No categories yet. Create your first one!
        </p>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => {
            const budget = budgetMap.get(category.id)
            return (
              <Card key={category.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <BudgetAmountInput
                    categoryId={category.id}
                    month={currentMonth}
                    initialAmount={budget?.budgeted_amount ?? 0}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}
```

**Step 4: Commit**

Run:
```bash
git add -A && git commit -m "feat: add monthly budget management"
```

---

## Task 11: Transaction Management - Data Layer

**Files:**
- Create: `lib/actions/transactions.ts`

**Step 1: Create transaction server actions**

Create `lib/actions/transactions.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function getTransactions(filters?: {
  categoryId?: string
  startDate?: string
  endDate?: string
}) {
  const householdId = await getSession()
  if (!householdId) return []

  let query = supabase
    .from('transactions')
    .select('*, category:categories(id, name, color)')
    .eq('household_id', householdId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }
  if (filters?.startDate) {
    query = query.gte('date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('date', filters.endDate)
  }

  const { data } = await query

  return data ?? []
}

export async function getTransactionsByMonth(month: string) {
  const householdId = await getSession()
  if (!householdId) return []

  const startDate = `${month}-01`
  const [year, monthNum] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNum, 0).getDate()
  const endDate = `${month}-${lastDay}`

  const { data } = await supabase
    .from('transactions')
    .select('*, category:categories(id, name, color)')
    .eq('household_id', householdId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  return data ?? []
}

export async function createTransaction(data: {
  categoryId: string
  amount: number
  description?: string
  date: string
}) {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate
  if (data.amount <= 0) throw new Error('Amount must be positive')
  if (!data.categoryId) throw new Error('Category is required')
  if (new Date(data.date) > new Date()) throw new Error('Date cannot be in the future')
  if (data.description && data.description.length > 100) {
    throw new Error('Description must be 100 characters or less')
  }

  const { error } = await supabase.from('transactions').insert({
    household_id: householdId,
    category_id: data.categoryId,
    amount: data.amount,
    description: data.description || null,
    date: data.date,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/transactions')
}

export async function updateTransaction(
  id: string,
  data: {
    categoryId: string
    amount: number
    description?: string
    date: string
  }
) {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate
  if (data.amount <= 0) throw new Error('Amount must be positive')
  if (!data.categoryId) throw new Error('Category is required')
  if (new Date(data.date) > new Date()) throw new Error('Date cannot be in the future')

  const { error } = await supabase
    .from('transactions')
    .update({
      category_id: data.categoryId,
      amount: data.amount,
      description: data.description || null,
      date: data.date,
    })
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/transactions')
}

export async function deleteTransaction(id: string) {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/transactions')
}
```

**Step 2: Commit**

Run:
```bash
git add -A && git commit -m "feat: add transaction server actions"
```

---

## Task 12: Transaction Management - UI

**Files:**
- Create: `components/transaction-form.tsx`
- Create: `app/transactions/page.tsx`

**Step 1: Create transaction form component**

Create `components/transaction-form.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createTransaction, updateTransaction } from '@/lib/actions/transactions'
import { createCategory } from '@/lib/actions/categories'
import { Category, Transaction } from '@/lib/types'

interface TransactionFormProps {
  categories: Category[]
  transaction?: Transaction & { category: Category | null }
  trigger: React.ReactNode
  onSuccess?: () => void
}

export function TransactionForm({ categories, transaction, trigger, onSuccess }: TransactionFormProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(transaction?.amount?.toString() ?? '')
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? '')
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [date, setDate] = useState(
    transaction?.date ?? new Date().toISOString().split('T')[0]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const isEditing = !!transaction

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (!categoryId) {
      setError('Please select a category')
      return
    }

    setLoading(true)

    try {
      if (isEditing) {
        await updateTransaction(transaction.id, {
          categoryId,
          amount: numAmount,
          description: description.trim() || undefined,
          date,
        })
      } else {
        await createTransaction({
          categoryId,
          amount: numAmount,
          description: description.trim() || undefined,
          date,
        })
      }
      setOpen(false)
      resetForm()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    setLoading(true)
    try {
      const newCategory = await createCategory(newCategoryName.trim(), '#6366f1')
      setCategoryId(newCategory.id)
      setShowNewCategory(false)
      setNewCategoryName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setAmount('')
    setCategoryId('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
    setError('')
    setShowNewCategory(false)
    setNewCategoryName('')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            {showNewCategory ? (
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                />
                <Button type="button" onClick={handleCreateCategory} disabled={loading}>
                  Add
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowNewCategory(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                  <button
                    type="button"
                    className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded"
                    onClick={() => setShowNewCategory(true)}
                  >
                    + New Category
                  </button>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for?"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Transaction'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Add Select component from shadcn**

Run:
```bash
npx shadcn@latest add select
```

**Step 3: Create transactions page**

Create `app/transactions/page.tsx`:
```typescript
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTransactions } from '@/lib/actions/transactions'
import { getCategories } from '@/lib/actions/categories'
import { TransactionForm } from '@/components/transaction-form'
import { TransactionList } from '@/components/transaction-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function TransactionsPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const [transactions, categories] = await Promise.all([
    getTransactions(),
    getCategories(),
  ])

  const total = transactions.reduce((sum, t) => sum + t.amount, 0)

  return (
    <main className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            Total: ${total.toFixed(2)}
          </p>
        </div>
        <TransactionForm
          categories={categories}
          trigger={<Button>+ Add Transaction</Button>}
        />
      </div>

      <TransactionList transactions={transactions} categories={categories} />
    </main>
  )
}
```

**Step 4: Create transaction list component**

Create `components/transaction-list.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TransactionForm } from './transaction-form'
import { deleteTransaction } from '@/lib/actions/transactions'
import { Category, Transaction } from '@/lib/types'

type TransactionWithCategory = Transaction & { category: Category | null }

interface TransactionListProps {
  transactions: TransactionWithCategory[]
  categories: Category[]
}

export function TransactionList({ transactions, categories }: TransactionListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return

    setDeleting(id)
    try {
      await deleteTransaction(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  if (transactions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No transactions yet. Add your first one!
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <Card key={transaction.id}>
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: transaction.category?.color ?? '#64748b' }}
              />
              <div>
                <p className="font-medium">
                  ${transaction.amount.toFixed(2)}
                  {transaction.description && (
                    <span className="text-muted-foreground font-normal ml-2">
                      {transaction.description}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {transaction.category?.name ?? 'Uncategorized'} •{' '}
                  {new Date(transaction.date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <TransactionForm
                categories={categories}
                transaction={transaction}
                trigger={<Button variant="ghost" size="sm">Edit</Button>}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(transaction.id)}
                disabled={deleting === transaction.id}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

**Step 5: Commit**

Run:
```bash
git add -A && git commit -m "feat: add transaction management UI"
```

---

## Task 13: Dashboard with Category Progress

**Files:**
- Modify: `components/dashboard.tsx`

**Step 1: Update dashboard component**

Replace `components/dashboard.tsx`:
```typescript
import Link from 'next/link'
import { getCategories } from '@/lib/actions/categories'
import { getMonthlyBudgets } from '@/lib/actions/budgets'
import { getTransactionsByMonth } from '@/lib/actions/transactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { TransactionForm } from './transaction-form'

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function Dashboard() {
  const currentMonth = getCurrentMonth()

  const [categories, budgets, transactions] = await Promise.all([
    getCategories(),
    getMonthlyBudgets(currentMonth),
    getTransactionsByMonth(currentMonth),
  ])

  const budgetMap = new Map(budgets.map((b) => [b.category_id, b.budgeted_amount]))

  // Calculate spent per category
  const spentByCategory = new Map<string, number>()
  transactions.forEach((t) => {
    if (t.category_id) {
      spentByCategory.set(
        t.category_id,
        (spentByCategory.get(t.category_id) ?? 0) + t.amount
      )
    }
  })

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgeted_amount, 0)
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0)
  const totalRemaining = totalBudgeted - totalSpent

  const monthName = new Date(currentMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Budget Dashboard</h1>
          <p className="text-muted-foreground">{monthName}</p>
        </div>
        <TransactionForm
          categories={categories}
          trigger={<Button>+ Add Transaction</Button>}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Budgeted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalBudgeted.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalSpent.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalRemaining < 0 ? 'text-red-500' : ''}`}>
              ${totalRemaining.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Categories</h2>
          <Link href="/budget">
            <Button variant="outline" size="sm">Edit Budget</Button>
          </Link>
        </div>

        {categories.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No categories yet.{' '}
              <Link href="/budget" className="underline">
                Set up your budget
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => {
              const budgeted = budgetMap.get(category.id) ?? 0
              const spent = spentByCategory.get(category.id) ?? 0
              const remaining = budgeted - spent
              const percentUsed = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0

              return (
                <Card key={category.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <span className={`text-sm ${remaining < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        ${remaining.toFixed(2)} left
                      </span>
                    </div>
                    <Progress
                      value={percentUsed}
                      className="h-2"
                      style={{
                        ['--progress-color' as string]:
                          percentUsed >= 100 ? '#ef4444' :
                          percentUsed >= 75 ? '#eab308' : '#22c55e'
                      }}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>${spent.toFixed(2)} spent</span>
                      <span>${budgeted.toFixed(2)} budgeted</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="flex gap-2">
        <Link href="/transactions" className="flex-1">
          <Button variant="outline" className="w-full">View All Transactions</Button>
        </Link>
        <Link href="/settings" className="flex-1">
          <Button variant="outline" className="w-full">Settings</Button>
        </Link>
      </div>
    </main>
  )
}
```

**Step 2: Fix Progress component styling**

The Progress component needs custom color support. Update `components/ui/progress.tsx` to include:

```typescript
// Add this style to the indicator div
style={{ backgroundColor: 'var(--progress-color, hsl(var(--primary)))' }}
```

**Step 3: Commit**

Run:
```bash
git add -A && git commit -m "feat: add dashboard with category progress"
```

---

## Task 14: Settings Page

**Files:**
- Create: `app/settings/page.tsx`
- Create: `app/api/auth/change-pin/route.ts`

**Step 1: Create change PIN API route**

Create `app/api/auth/change-pin/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPin, verifyPin, getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const householdId = await getSession()
    if (!householdId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { currentPin, newPin } = await request.json()

    // Validate new PIN
    if (!newPin || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      return NextResponse.json(
        { error: 'New PIN must be 4-6 digits' },
        { status: 400 }
      )
    }

    // Get current household
    const { data: household } = await supabase
      .from('households')
      .select('pin_hash')
      .eq('id', householdId)
      .single()

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 })
    }

    // Verify current PIN
    const isValid = await verifyPin(currentPin, household.pin_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 401 })
    }

    // Update PIN
    const newPinHash = await hashPin(newPin)
    const { error } = await supabase
      .from('households')
      .update({ pin_hash: newPinHash })
      .eq('id', householdId)

    if (error) {
      return NextResponse.json({ error: 'Failed to update PIN' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Create settings page**

Create `app/settings/page.tsx`:
```typescript
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCategories } from '@/lib/actions/categories'
import { CategoryForm } from '@/components/category-form'
import { ChangePinForm } from '@/components/change-pin-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { deleteCategory } from '@/lib/actions/categories'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const categories = await getCategories()

  return (
    <main className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Change PIN */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Change PIN</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePinForm />
        </CardContent>
      </Card>

      {/* Manage Categories */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Categories</CardTitle>
          <CategoryForm trigger={<Button size="sm">+ Add</Button>} />
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-muted-foreground">No categories yet.</p>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span>{category.name}</span>
                  </div>
                  <CategoryForm
                    category={category}
                    trigger={<Button variant="ghost" size="sm">Edit</Button>}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
```

**Step 3: Create change PIN form component**

Create `components/change-pin-form.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function ChangePinForm() {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!/^\d{4,6}$/.test(newPin)) {
      setError('New PIN must be 4-6 digits')
      return
    }

    if (newPin !== confirmPin) {
      setError('New PINs do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to change PIN')
        return
      }

      setSuccess(true)
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
    } catch {
      setError('Failed to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>PIN changed successfully!</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="currentPin">Current PIN</Label>
        <Input
          id="currentPin"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPin">New PIN</Label>
        <Input
          id="newPin"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPin">Confirm New PIN</Label>
        <Input
          id="confirmPin"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Changing...' : 'Change PIN'}
      </Button>
    </form>
  )
}
```

**Step 4: Commit**

Run:
```bash
git add -A && git commit -m "feat: add settings page with PIN change"
```

---

## Task 15: Final Polish & Deployment Prep

**Files:**
- Create: `.env.example`
- Update: `README.md` (if needed)
- Verify all pages work

**Step 1: Create environment example file**

Create `.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Step 2: Full test of application**

Run:
```bash
npm run dev
```

Test checklist:
- [ ] PIN setup flow works
- [ ] PIN verify flow works
- [ ] Create/edit/delete categories
- [ ] Set budget amounts per category
- [ ] Copy budget from previous month
- [ ] Add/edit/delete transactions
- [ ] Dashboard shows correct totals and progress bars
- [ ] Change PIN in settings

**Step 3: Build for production**

Run:
```bash
npm run build
```

Expected: Build completes without errors.

**Step 4: Final commit**

Run:
```bash
git add -A && git commit -m "chore: add environment example and final polish"
```

---

## Deployment

**Step 1: Push to GitHub**

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

**Step 2: Deploy to Vercel**

1. Go to https://vercel.com
2. Import your GitHub repository
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

**Step 3: Test production URL**

Visit your Vercel URL and verify everything works.

---

## Summary

This plan implements the full budget app MVP:

1. **Tasks 1-2**: Project setup with Next.js and shadcn/ui
2. **Tasks 3-4**: Supabase client and database schema
3. **Tasks 5-7**: PIN authentication (setup, verify, auth guard)
4. **Tasks 8-9**: Category management (CRUD)
5. **Task 10**: Monthly budget management
6. **Tasks 11-12**: Transaction management (CRUD)
7. **Task 13**: Dashboard with progress tracking
8. **Task 14**: Settings page
9. **Task 15**: Final polish and deployment
