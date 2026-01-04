# Refund Support (Negative Amounts) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow refund transactions by supporting negative amounts across validation, UI, and calculations.

**Architecture:** Permit negative amounts in Zod schemas and UI validation, and ensure budget/insight calculations naturally incorporate negative amounts without double‑negation.

**Tech Stack:** Next.js, TypeScript, Zod, Vitest.

### Task 1: Allow negative amounts in schemas

**Files:**
- Modify: `lib/schemas/transaction.ts`
- Test: `tests/transaction-schema.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { createTransactionSchema } from '@/lib/schemas/transaction'

describe('transaction schema refunds', () => {
  it('accepts negative amounts', () => {
    const parsed = createTransactionSchema.parse({
      categoryId: '11111111-1111-4111-8111-111111111111',
      amount: -12.34,
      description: 'Refund',
      date: '2026-01-04',
      type: 'expense',
    })

    expect(parsed.amount).toBe(-12.34)
  })

  it('rejects zero amounts', () => {
    expect(() => createTransactionSchema.parse({
      categoryId: '11111111-1111-4111-8111-111111111111',
      amount: 0,
      description: 'Zero',
      date: '2026-01-04',
      type: 'expense',
    })).toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/transaction-schema.test.ts`
Expected: FAIL because schema enforces positive amounts.

**Step 3: Write minimal implementation**

Update the schema to allow negative, non‑zero amounts and cap absolute value:

```ts
amount: z.number()
  .finite('Amount must be a finite number')
  .refine((value) => value !== 0, 'Amount must be non-zero')
  .refine((value) => Math.abs(value) <= 100_000_000, 'Amount exceeds maximum allowed value'),
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/transaction-schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/schemas/transaction.ts tests/transaction-schema.test.ts
git commit -m "feat: allow negative transaction amounts"
```

### Task 2: Update transaction form validation

**Files:**
- Modify: `components/transaction-form.tsx`
- Test: `tests/transaction-form.test.tsx`

**Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { TransactionForm } from '@/components/transaction-form'

const categories = [{ id: '11111111-1111-4111-8111-111111111111', name: 'Food', color: '#000' }]

it('accepts negative amount input', async () => {
  render(
    <TransactionForm
      categories={categories as any}
      trigger={<button>Open</button>}
    />
  )

  fireEvent.click(screen.getByText('Open'))
  const amountInput = await screen.findByLabelText(/amount/i)
  fireEvent.change(amountInput, { target: { value: '-12.34' } })

  expect((amountInput as HTMLInputElement).value).toBe('-12.34')
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/transaction-form.test.tsx`
Expected: FAIL because validation blocks non‑positive amounts.

**Step 3: Update validation/error messaging**

In `handleSubmit`, change the amount validation from `<= 0` to `=== 0` and update error text to “Amount must be non‑zero”. Also add helper text for refunds (negative amounts).

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/transaction-form.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/transaction-form.tsx tests/transaction-form.test.tsx
git commit -m "feat: allow negative amounts in transaction form"
```

### Task 3: Update calculations to handle negatives

**Files:**
- Modify: `lib/actions/budgets.ts`
- Modify: `components/dashboard.tsx`
- Test: `tests/budget-refund.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getHouseholdTimezone: vi.fn(),
  getCurrentMonth: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }))
vi.mock('@/lib/actions/settings', () => ({ getHouseholdTimezone: mocks.getHouseholdTimezone }))
vi.mock('@/lib/utils/date', () => ({ getCurrentMonth: mocks.getCurrentMonth }))
vi.mock('@/lib/actions/transactions', () => ({
  getTransactionsByMonth: vi.fn().mockResolvedValue([
    { category_id: 'cat-1', amount: -5, amount_cents: -500, type: 'expense' },
  ]),
}))
vi.mock('@/lib/supabase-server', () => ({ supabaseAdmin: { from: mocks.from } }))

import { getBudgetDataForWarnings } from '@/lib/actions/budgets'

describe('refund calculations', () => {
  it('reduces spent totals when amount is negative', async () => {
    mocks.getSession.mockResolvedValue('household-1')
    mocks.getHouseholdTimezone.mockResolvedValue('UTC')
    mocks.getCurrentMonth.mockReturnValue('2026-01')
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }),
    })

    const { spentMap } = await getBudgetDataForWarnings()
    expect(spentMap['cat-1']).toBe(-5)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/budget-refund.test.ts`
Expected: FAIL if refunds are filtered or absolute‑valued.

**Step 3: Update calculations**

Ensure spend aggregation in `getBudgetDataForWarnings` and dashboard totals uses signed amounts (no `Math.abs`).

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/budget-refund.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/actions/budgets.ts components/dashboard.tsx tests/budget-refund.test.ts
git commit -m "feat: handle refunds in budget calculations"
```

### Task 4: Final verification

**Step 1: Run targeted tests**

Run:
```bash
npm test -- --run tests/transaction-schema.test.ts tests/transaction-form.test.tsx tests/budget-refund.test.ts
```
Expected: PASS

**Step 2: Commit any remaining changes**

```bash
git status -sb
```
