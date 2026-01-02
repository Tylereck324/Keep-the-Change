# Restore Previous Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Re-apply the previously listed improvements (env example, dev tooling, tests, bug fixes, and JSDoc) so they are present in `main` again.

**Architecture:** Restore missing files and tooling, add comprehensive unit tests for utils, and re-apply targeted bug fixes in UI/components and duplicate detection logic. Use TDD for code changes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Tailwind, Husky + lint-staged.

---

### Task 1: Add `.env.example` and allow it through `.gitignore`

**Files:**
- Create: `.env.example`
- Modify: `.gitignore`

**Step 1: Write the failing test**

_No automated test for env example; this is a documentation/config artifact._

**Step 2: Create `.env.example`**

```env
# Public Supabase config
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only Supabase key (required for rate limiting)
SUPABASE_SERVICE_ROLE_KEY=

# Session/JWT signing secret (min 32 chars)
SESSION_SECRET=
```

**Step 3: Update `.gitignore` to allow `.env.example`**

Add exception near the env block:

```gitignore
# env files (can opt-in for committing if needed)
.env*
!.env.example
```

**Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "docs: add env example"
```

---

### Task 2: Restore Husky + lint-staged pre-commit hooks

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `.husky/pre-commit`

**Step 1: Write the failing test**

_No automated test; this is tooling/config._

**Step 2: Add Husky + lint-staged dev deps and config**

Update `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest",
  "prepare": "husky"
},
"devDependencies": {
  ...,
  "husky": "^9.1.7",
  "lint-staged": "^16.2.7"
},
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix"]
}
```

Install deps:

```bash
npm install -D husky@^9.1.7 lint-staged@^16.2.7
```

**Step 3: Add pre-commit hook**

Create `.husky/pre-commit`:

```bash
npx lint-staged
```

**Step 4: Commit**

```bash
git add package.json package-lock.json .husky/pre-commit
git commit -m "chore: add husky and lint-staged"
```

---

### Task 3: Restore `CONTRIBUTING.md`

**Files:**
- Create: `CONTRIBUTING.md`

**Step 1: Write the failing test**

_No automated test; documentation artifact._

**Step 2: Restore the file from prior checkpoint**

```bash
git show 013f2be:CONTRIBUTING.md > CONTRIBUTING.md
```

**Step 3: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add contributing guide"
```

---

### Task 4: Add CSV parser test suite (32 tests)

**Files:**
- Create: `lib/utils/__tests__/csv-parser.test.ts`
- Modify (if needed): `lib/utils/csv-parser.ts`

**Step 1: Write the failing test**

Restore tests from checkpoint:

```bash
git show 013f2be:lib/utils/__tests__/csv-parser.test.ts > lib/utils/__tests__/csv-parser.test.ts
```

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/utils/__tests__/csv-parser.test.ts`
Expected: FAIL (file exists, some tests fail or file missing behavior)

**Step 3: Implement minimal fixes (if needed)**

If tests fail, align `lib/utils/csv-parser.ts` to checkpoint version:

```bash
git show 013f2be:lib/utils/csv-parser.ts > lib/utils/csv-parser.ts
```

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/utils/__tests__/csv-parser.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/utils/__tests__/csv-parser.test.ts lib/utils/csv-parser.ts
git commit -m "test: add csv parser coverage"
```

---

### Task 5: Add category matcher test suite (15 tests)

**Files:**
- Create: `lib/utils/__tests__/category-matcher.test.ts`
- Modify (if needed): `lib/utils/category-matcher.ts`

**Step 1: Write the failing test**

```bash
git show 013f2be:lib/utils/__tests__/category-matcher.test.ts > lib/utils/__tests__/category-matcher.test.ts
```

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/utils/__tests__/category-matcher.test.ts`
Expected: FAIL

**Step 3: Implement minimal fixes (if needed)**

```bash
git show 013f2be:lib/utils/category-matcher.ts > lib/utils/category-matcher.ts
```

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/utils/__tests__/category-matcher.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/utils/__tests__/category-matcher.test.ts lib/utils/category-matcher.ts
git commit -m "test: add category matcher coverage"
```

---

### Task 6: Add duplicate detector test suite + fix ratio logic (19 tests)

**Files:**
- Create: `lib/utils/__tests__/duplicate-detector.test.ts`
- Modify: `lib/utils/duplicate-detector.ts`

**Step 1: Write the failing test**

```bash
git show 013f2be:lib/utils/__tests__/duplicate-detector.test.ts > lib/utils/__tests__/duplicate-detector.test.ts
```

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/utils/__tests__/duplicate-detector.test.ts`
Expected: FAIL (current implementation uses Levenshtein distance)

**Step 3: Implement minimal fix**

Restore updated detector (ratio + JSDoc):

```bash
git show 013f2be:lib/utils/duplicate-detector.ts > lib/utils/duplicate-detector.ts
```

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/utils/__tests__/duplicate-detector.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/utils/__tests__/duplicate-detector.test.ts lib/utils/duplicate-detector.ts
git commit -m "fix: use ratio for duplicate detection"
```

---

### Task 7: Add budget warnings test suite (30 tests)

**Files:**
- Create: `lib/utils/__tests__/budget-warnings.test.ts`
- Modify (if needed): `lib/utils/budget-warnings.ts`

**Step 1: Write the failing test**

```bash
git show 013f2be:lib/utils/__tests__/budget-warnings.test.ts > lib/utils/__tests__/budget-warnings.test.ts
```

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/utils/__tests__/budget-warnings.test.ts`
Expected: FAIL

**Step 3: Implement minimal fixes (if needed)**

```bash
git show 013f2be:lib/utils/budget-warnings.ts > lib/utils/budget-warnings.ts
```

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/utils/__tests__/budget-warnings.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/utils/__tests__/budget-warnings.test.ts lib/utils/budget-warnings.ts
git commit -m "test: add budget warning coverage"
```

---

### Task 8: Auto-rollover toggle error handling (toast)

**Files:**
- Modify: `components/auto-rollover-toggle.tsx`
- Test: `components/__tests__/auto-rollover-toggle.test.tsx`

**Step 1: Write the failing test**

```tsx
// components/__tests__/auto-rollover-toggle.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AutoRolloverToggle } from '@/components/auto-rollover-toggle'

vi.mock('@/lib/actions/settings', () => ({
  getAutoRolloverSetting: vi.fn().mockResolvedValue(false),
  setAutoRolloverSetting: vi.fn().mockRejectedValue(new Error('fail')),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

describe('AutoRolloverToggle', () => {
  it('shows toast error and reverts when update fails', async () => {
    render(<AutoRolloverToggle />)

    await waitFor(() => {
      expect(screen.getByRole('switch')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('switch'))

    const { toast } = await import('sonner')
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update setting. Please try again.')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- components/__tests__/auto-rollover-toggle.test.tsx`
Expected: FAIL (toast not used in current component)

**Step 3: Implement minimal fix**

```bash
git show 013f2be:components/auto-rollover-toggle.tsx > components/auto-rollover-toggle.tsx
```

**Step 4: Run test to verify it passes**

Run: `npm test -- components/__tests__/auto-rollover-toggle.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/auto-rollover-toggle.tsx components/__tests__/auto-rollover-toggle.test.tsx
git commit -m "fix: toast on auto-rollover failure"
```

---

### Task 9: Pin modal error handling cleanup

**Files:**
- Modify: `components/pin-modal.tsx`
- Test: `components/__tests__/pin-modal.test.tsx`

**Step 1: Write the failing test**

```tsx
// components/__tests__/pin-modal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PinModal } from '@/components/pin-modal'

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: false,
  json: vi.fn().mockResolvedValue({ error: 'Invalid PIN' }),
}))

const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('PinModal', () => {
  it('shows error without logging to console', async () => {
    render(<PinModal open mode="verify" onSuccess={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '1234' } })
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid PIN')).toBeInTheDocument()
    })

    expect(consoleSpy).not.toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- components/__tests__/pin-modal.test.tsx`
Expected: FAIL (console.error currently fires)

**Step 3: Implement minimal fix**

```bash
git show 013f2be:components/pin-modal.tsx > components/pin-modal.tsx
```

**Step 4: Run test to verify it passes**

Run: `npm test -- components/__tests__/pin-modal.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/pin-modal.tsx components/__tests__/pin-modal.test.tsx
git commit -m "fix: remove pin modal console error"
```

---

### Task 10: Re-apply JSDoc for exported utils

**Files:**
- Modify: `lib/utils/csv-parser.ts`
- Modify: `lib/utils/category-matcher.ts`
- Modify: `lib/utils/duplicate-detector.ts`
- Modify: `lib/utils/budget-warnings.ts`

**Step 1: Write the failing test**

_No automated test; documentation-only changes._

**Step 2: Restore JSDoc-rich versions**

```bash
git show 013f2be:lib/utils/csv-parser.ts > lib/utils/csv-parser.ts
git show 013f2be:lib/utils/category-matcher.ts > lib/utils/category-matcher.ts
git show 013f2be:lib/utils/duplicate-detector.ts > lib/utils/duplicate-detector.ts
git show 013f2be:lib/utils/budget-warnings.ts > lib/utils/budget-warnings.ts
```

**Step 3: Commit**

```bash
git add lib/utils/csv-parser.ts lib/utils/category-matcher.ts lib/utils/duplicate-detector.ts lib/utils/budget-warnings.ts
git commit -m "docs: add jsdoc to utils"
```

---

### Task 11: ESLint verification + cleanup

**Files:**
- Modify: as needed per lint output

**Step 1: Run lint**

Run: `npm run lint`
Expected: if errors, list files/lines; fix those only (unused imports, unescaped entities, hook deps).

**Step 2: Apply fixes**

Make minimal changes required to clear lint errors.

**Step 3: Re-run lint**

Run: `npm run lint`
Expected: PASS

**Step 4: Commit**

```bash
git add <touched files>
git commit -m "chore: fix lint violations"
```

---

### Task 12: Full test run

**Step 1: Run test suite**

Run: `npm test`
Expected: PASS

---

## References
- Prior checkpoint for restoration: `013f2be`
