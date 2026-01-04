# Timezone-Aware Month Calculations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Store a household timezone, allow users to set it, and use it for current-month budget calculations.

**Architecture:** Add a `timezone` column to `households`, expose get/set actions, and compute the current month using a shared helper that accepts an IANA timezone. Settings UI detects the browser timezone and allows a manual override.

**Tech Stack:** Next.js App Router, Supabase (Postgres), TypeScript, Vitest, React.

### Task 1: Add timezone column + schema/types

**Files:**
- Create: `supabase/migrations/add_households_timezone.sql`
- Modify: `supabase/schema.sql`
- Modify: `lib/database.types.ts`

**Step 1: Write the failing test**

We will rely on helper tests for correctness. No automated test for migration (document only).

**Step 2: Apply schema changes**

```sql
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
```

Also add `timezone` to the `households` table in `supabase/schema.sql` and `lib/database.types.ts`.

**Step 3: Run test to verify it fails**

No automated test for migration. Skip.

**Step 4: Commit**

```bash
git add supabase/migrations/add_households_timezone.sql supabase/schema.sql lib/database.types.ts
git commit -m "feat: add household timezone column"
```

### Task 2: Add timezone helper with tests

**Files:**
- Create: `lib/utils/date.ts`
- Create: `tests/date-utils.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'
import { getCurrentMonth } from '@/lib/utils/date'

describe('getCurrentMonth', () => {
  it('returns YYYY-MM in the provided timezone', () => {
    vi.setSystemTime(new Date('2026-01-01T00:30:00Z'))
    expect(getCurrentMonth('America/Los_Angeles')).toBe('2025-12')
  })

  it('falls back to UTC for invalid timezone', () => {
    vi.setSystemTime(new Date('2026-01-01T00:30:00Z'))
    expect(getCurrentMonth('Invalid/Zone')).toBe('2026-01')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/date-utils.test.ts`
Expected: FAIL because `getCurrentMonth` does not exist.

**Step 3: Write minimal implementation**

```ts
export function getCurrentMonth(timezone?: string) {
  if (!timezone || timezone === 'UTC') {
    return new Date().toISOString().slice(0, 7)
  }

  try {
    const localized = new Date().toLocaleString('en-US', { timeZone: timezone })
    const date = new Date(localized)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${date.getFullYear()}-${month}`
  } catch {
    return new Date().toISOString().slice(0, 7)
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/date-utils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/utils/date.ts tests/date-utils.test.ts
git commit -m "feat: add timezone-aware month helper"
```

### Task 3: Add get/set timezone actions

**Files:**
- Modify: `lib/actions/settings.ts`
- Create: `tests/settings-actions.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }))
vi.mock('@/lib/supabase-server', () => ({ supabaseAdmin: { from: mocks.from } }))

import { getHouseholdTimezone } from '@/lib/actions/settings'

describe('getHouseholdTimezone', () => {
  it('returns UTC when no session', async () => {
    mocks.getSession.mockResolvedValue(null)
    await expect(getHouseholdTimezone()).resolves.toBe('UTC')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/settings-actions.test.ts`
Expected: FAIL because `getHouseholdTimezone` does not exist.

**Step 3: Implement get/set actions**

```ts
export async function getHouseholdTimezone(): Promise<string> {
  const householdId = await getSession()
  if (!householdId) return 'UTC'

  const { data } = await supabaseAdmin
    .from('households')
    .select('timezone')
    .eq('id', householdId)
    .maybeSingle()

  return data?.timezone ?? 'UTC'
}

export async function setHouseholdTimezone(timezone: string): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { error } = await supabaseAdmin
    .from('households')
    .update({ timezone })
    .eq('id', householdId)

  if (error) {
    throw new Error(`Failed to update timezone: ${error.message}`)
  }

  revalidatePath('/settings')
  revalidatePath('/')
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/settings-actions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/actions/settings.ts tests/settings-actions.test.ts
git commit -m "feat: add household timezone settings"
```

### Task 4: Add timezone selector UI

**Files:**
- Create: `components/timezone-selector.tsx`
- Modify: `app/settings/page.tsx`
- Test: `tests/timezone-selector.test.tsx`

**Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimezoneSelector } from '@/components/timezone-selector'

vi.mock('@/lib/actions/settings', () => ({
  getHouseholdTimezone: vi.fn().mockResolvedValue('UTC'),
  setHouseholdTimezone: vi.fn(),
}))

describe('TimezoneSelector', () => {
  it('renders the timezone label', async () => {
    render(<TimezoneSelector detectedTimezone="America/Los_Angeles" />)
    expect(await screen.findByText(/timezone/i)).not.toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/timezone-selector.test.tsx`
Expected: FAIL because component does not exist.

**Step 3: Write minimal implementation**

- Use `Intl.DateTimeFormat().resolvedOptions().timeZone` for default.
- Render a `Select` with a short list of common IANA timezones.
- Save with `setHouseholdTimezone` and show success/error via toast.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/timezone-selector.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/timezone-selector.tsx app/settings/page.tsx tests/timezone-selector.test.tsx
git commit -m "feat: add timezone selector"
```

### Task 5: Use timezone in budget calculations

**Files:**
- Modify: `lib/actions/budgets.ts`
- Test: `tests/budgets-timezone.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getHouseholdTimezone: vi.fn(),
  getCurrentMonth: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }))
vi.mock('@/lib/actions/settings', () => ({ getHouseholdTimezone: mocks.getHouseholdTimezone }))
vi.mock('@/lib/utils/date', () => ({ getCurrentMonth: mocks.getCurrentMonth }))

import { getBudgetDataForWarnings } from '@/lib/actions/budgets'

describe('getBudgetDataForWarnings', () => {
  it('uses household timezone when computing month', async () => {
    mocks.getSession.mockResolvedValue('household-1')
    mocks.getHouseholdTimezone.mockResolvedValue('America/Los_Angeles')
    mocks.getCurrentMonth.mockReturnValue('2026-01')

    await getBudgetDataForWarnings()

    expect(mocks.getCurrentMonth).toHaveBeenCalledWith('America/Los_Angeles')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/budgets-timezone.test.ts`
Expected: FAIL because helper is not used.

**Step 3: Implement timezone usage**

- Import `getHouseholdTimezone` and `getCurrentMonth`.
- Replace UTC `new Date().toISOString().slice(0, 7)` with `getCurrentMonth(timezone)`.
- Use the same helper in `autoRolloverIfNeeded` when determining the current month (or wherever it is calculated).

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/budgets-timezone.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/actions/budgets.ts tests/budgets-timezone.test.ts
git commit -m "feat: use timezone-aware month in budgets"
```

### Task 6: Final verification

**Step 1: Run targeted tests**

Run:
```bash
npm test -- --run tests/date-utils.test.ts tests/settings-actions.test.ts tests/timezone-selector.test.tsx tests/budgets-timezone.test.ts
```
Expected: PASS

**Step 2: Commit any remaining changes**

```bash
git status -sb
```

## Notes
- Use ASCII only in files.
- Default to UTC when timezone is missing or invalid.
- Keep UI list short and extensible.
