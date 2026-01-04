# Category Deletion Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make category deletion explicit and safe by counting affected transactions and returning that count to the UI.

**Architecture:** The server action verifies ownership, counts dependent transactions, deletes the category, and returns the affected count. The UI uses the count in the success toast.

**Tech Stack:** Next.js Server Actions, Supabase, TypeScript, Vitest.

### Task 1: Add deleteCategory tests

**Files:**
- Create: `tests/categories-delete.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }))
vi.mock('@/lib/supabase-server', () => ({ supabaseAdmin: { from: mocks.from } }))

import { deleteCategory } from '@/lib/actions/categories'

function createSelectBuilder(result: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  }
}

function createDeleteBuilder(result: unknown) {
  return {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }
}

describe('deleteCategory', () => {
  it('returns affected count when deleting category', async () => {
    mocks.getSession.mockResolvedValue('household-1')
    mocks.from
      .mockImplementationOnce(() => createSelectBuilder({ data: { id: 'cat-1' }, error: null }))
      .mockImplementationOnce(() => createSelectBuilder({ data: [{ count: 3 }], error: null }))
      .mockImplementationOnce(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }))

    await expect(deleteCategory('cat-1')).resolves.toEqual({ affectedTransactions: 3 })
  })

  it('throws when category does not belong to household', async () => {
    mocks.getSession.mockResolvedValue('household-1')
    mocks.from.mockImplementationOnce(() => createSelectBuilder({ data: null, error: null }))

    await expect(deleteCategory('cat-1')).rejects.toThrow(/not found/i)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/categories-delete.test.ts`
Expected: FAIL because deleteCategory does not return a count and does not validate ownership.

### Task 2: Implement deleteCategory improvements

**Files:**
- Modify: `lib/actions/categories.ts`

**Step 1: Implement ownership check + count + return value**

```ts
const category = await supabaseAdmin
  .from('categories')
  .select('id')
  .eq('id', id)
  .eq('household_id', householdId)
  .maybeSingle()

if (!category.data) throw new Error('Category not found')

const { data: countRows } = await supabaseAdmin
  .from('transactions')
  .select('id', { count: 'exact', head: true })
  .eq('household_id', householdId)
  .eq('category_id', id)

const affected = countRows?.length ? countRows.length : 0

// delete category
...
return { affectedTransactions: affected }
```

**Step 2: Run test to verify it passes**

Run: `npm test -- --run tests/categories-delete.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add lib/actions/categories.ts tests/categories-delete.test.ts
git commit -m "feat: return affected count on category delete"
```

### Task 3: Update UI toast

**Files:**
- Modify: `components/category-delete-button.tsx`

**Step 1: Update success message**

```ts
const result = await deleteCategory(categoryId)
const count = result?.affectedTransactions ?? 0
const suffix = count === 1 ? '1 transaction moved' : `${count} transactions moved`
toast.success(`Category "${categoryName}" deleted. ${suffix} to Uncategorized.`)
```

**Step 2: Commit**

```bash
git add components/category-delete-button.tsx
git commit -m "feat: show affected transactions on delete"
```

### Task 4: Final verification

**Step 1: Run targeted tests**

Run:
```bash
npm test -- --run tests/categories-delete.test.ts
```
Expected: PASS

**Step 2: Commit any remaining changes**

```bash
git status -sb
```
