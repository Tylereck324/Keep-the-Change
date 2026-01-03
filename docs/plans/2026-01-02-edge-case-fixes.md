# Edge Case Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix duplicate-review remember-choice logic, improve auto-rollover load error UX, ensure CSV import progress cleanup, and make keyword matching case-insensitive.

**Architecture:** Apply targeted fixes in existing components/utilities with TDD. Each behavior change gets a dedicated test to prevent regressions. Minimal refactors only for safe cleanup and state handling.

**Tech Stack:** Next.js (App Router), React, TypeScript, Vitest, @testing-library/react.

### Task 1: Duplicate Review “Remember Choice” applies correctly

**Files:**
- Create: `components/csv-import-steps/__tests__/step3-duplicates.test.tsx`
- Modify: `components/csv-import-steps/step3-duplicates.tsx`

**Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { Step3Duplicates } from '../step3-duplicates'

describe('Step3Duplicates', () => {
  it('applies remember-skip to all remaining duplicates and completes', async () => {
    const transactions = [
      { date: '2024-01-01', amount: 10, description: 'A', categoryId: 'c1', matchType: 'none', rowNumber: 2 },
      { date: '2024-01-02', amount: 20, description: 'B', categoryId: 'c1', matchType: 'none', rowNumber: 3 },
      { date: '2024-01-03', amount: 30, description: 'C', categoryId: 'c1', matchType: 'none', rowNumber: 4 },
    ]
    const existing = [
      { id: 'e1', household_id: 'h', category_id: 'c1', amount: 10, amount_cents: 1000, description: 'A', date: '2024-01-01', created_at: null, type: 'expense' },
      { id: 'e2', household_id: 'h', category_id: 'c1', amount: 20, amount_cents: 2000, description: 'B', date: '2024-01-02', created_at: null, type: 'expense' },
    ]
    const onComplete = vi.fn()

    render(
      <Step3Duplicates
        transactions={transactions}
        existingTransactions={existing}
        onComplete={onComplete}
        onBack={vi.fn()}
      />
    )

    fireEvent.click(screen.getByLabelText('Skip all remaining duplicates'))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    const passed = onComplete.mock.calls[0][0]
    // both duplicates should be skipped, leaving only the non-duplicate
    expect(passed).toHaveLength(1)
    expect(passed[0].description).toBe('C')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run components/csv-import-steps/__tests__/step3-duplicates.test.tsx`
Expected: FAIL because remember-choice currently doesn’t apply.

**Step 3: Write minimal implementation**

Update `components/csv-import-steps/step3-duplicates.tsx` to:
- Change `handleFinish` to accept optional decisions map.
- When `remember` is true, compute a combined decisions object and pass it to `handleFinish(nextDecisions)` instead of relying on async state.

**Step 4: Run test to verify it passes**

Run: `npx vitest run components/csv-import-steps/__tests__/step3-duplicates.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/csv-import-steps/step3-duplicates.tsx components/csv-import-steps/__tests__/step3-duplicates.test.tsx
git commit -m "Fix duplicate review remember choice"
```

### Task 2: Auto-rollover load failure UX

**Files:**
- Modify: `components/__tests__/auto-rollover-toggle.test.tsx`
- Modify: `components/auto-rollover-toggle.tsx`

**Step 1: Write the failing test**

Add tests to `components/__tests__/auto-rollover-toggle.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AutoRolloverToggle } from '@/components/auto-rollover-toggle'

vi.mock('@/lib/actions/settings', () => ({
  getAutoRolloverSetting: vi.fn().mockRejectedValue(new Error('load failed')),
  setAutoRolloverSetting: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

it('shows error, disables switch, and provides retry on load failure', async () => {
  render(<AutoRolloverToggle />)

  const { toast } = await import('sonner')

  await waitFor(() => {
    expect(toast.error).toHaveBeenCalled()
  })

  expect(screen.getByText('Failed to load setting. Please try again.')).not.toBeNull()
  expect(screen.getByRole('switch')).toHaveAttribute('data-disabled')
  expect(screen.getByRole('button', { name: /retry/i })).not.toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/auto-rollover-toggle.test.tsx`
Expected: FAIL (no error UI, switch not disabled).

**Step 3: Write minimal implementation**

Update `components/auto-rollover-toggle.tsx`:
- Add `error` state and `loadSetting` function.
- On error: set error, show toast, set loading false.
- Render inline error + Retry button.
- Disable switch when `loading` or `error`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run components/__tests__/auto-rollover-toggle.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/auto-rollover-toggle.tsx components/__tests__/auto-rollover-toggle.test.tsx
git commit -m "Handle auto-rollover load errors"
```

### Task 3: CSV import progress cleanup + unmount safety

**Files:**
- Create: `components/csv-import-steps/__tests__/step4-confirm.test.tsx`
- Modify: `components/csv-import-steps/step4-confirm.tsx`

**Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { Step4Confirm } from '../step4-confirm'

vi.useFakeTimers()

vi.mock('@/lib/actions/csv-import', () => ({
  bulkImportTransactions: vi.fn().mockResolvedValue({ success: true, imported: 1, failed: 0, errors: [] }),
  learnMerchantPattern: vi.fn().mockResolvedValue(undefined),
}))

it('cleans up timers on unmount during import', async () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  const { unmount } = render(
    <Step4Confirm
      transactions={[{ date: '2024-01-01', amount: 10, description: 'A', categoryId: 'c1', matchType: 'none', rowNumber: 2 }]}
      categories={[{ id: 'c1', name: 'Cat', color: '#000', household_id: 'h', created_at: '' }]}
      onComplete={vi.fn()}
      onBack={vi.fn()}
    />
  )

  fireEvent.click(screen.getByRole('button', { name: /confirm & import/i }))
  unmount()

  // flush timers to catch setState on unmounted
  vi.runAllTimers()

  expect(consoleSpy).not.toHaveBeenCalled()
  consoleSpy.mockRestore()
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run components/csv-import-steps/__tests__/step4-confirm.test.tsx`
Expected: FAIL with state update warning or console error.

**Step 3: Write minimal implementation**

Update `components/csv-import-steps/step4-confirm.tsx`:
- Track `progressIntervalId` and `autoCloseTimeoutId` in refs.
- Add `mountedRef` and `useEffect` cleanup to clear timers and set mounted false.
- Guard `setState` calls when unmounted.

**Step 4: Run test to verify it passes**

Run: `npx vitest run components/csv-import-steps/__tests__/step4-confirm.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/csv-import-steps/step4-confirm.tsx components/csv-import-steps/__tests__/step4-confirm.test.tsx
git commit -m "Clean up CSV import timers"
```

### Task 4: Keyword matching case-insensitive

**Files:**
- Modify: `lib/utils/__tests__/category-matcher.test.ts`
- Modify: `lib/utils/category-matcher.ts`

**Step 1: Write the failing test**

Add test:

```ts
it('matches keyword regardless of keyword case', () => {
  const keywords = { 'cat-groceries': [createKeyword('cat-groceries', 'Walmart')] }
  const result = matchCategory('walmart market', keywords, [])
  expect(result.categoryId).toBe('cat-groceries')
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run lib/utils/__tests__/category-matcher.test.ts`
Expected: FAIL (keyword not lowercased).

**Step 3: Write minimal implementation**

Update `matchByKeyword` in `lib/utils/category-matcher.ts` to compare with `keywordObj.keyword.toLowerCase()`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run lib/utils/__tests__/category-matcher.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/utils/category-matcher.ts lib/utils/__tests__/category-matcher.test.ts
git commit -m "Make keyword matching case-insensitive"
```
