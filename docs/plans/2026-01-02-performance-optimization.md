# Performance Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce initial JS payload and improve perceived load time on heavy routes by deferring chart rendering and trimming initial client work, while keeping behavior identical.

**Architecture:** Add a reusable `LazyMount` client boundary to defer heavy UI, use `next/dynamic` to split Recharts bundles, and add a lightweight chart skeleton to avoid layout shift. Add a small “load more” cap to transactions to limit initial DOM. Enable optional bundle analysis via `ANALYZE=1`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind, Vitest + React Testing Library.

---

### Task 1: Add bundle analyzer toggle helper + tests

**Files:**
- Create: `lib/utils/env.ts`
- Test: `lib/utils/__tests__/env.test.ts`
- Modify: `next.config.ts`
- Modify: `package.json`

**Step 1: Write the failing test**

```ts
// lib/utils/__tests__/env.test.ts
import { describe, expect, it } from 'vitest'
import { isBundleAnalyzeEnabled } from '@/lib/utils/env'

describe('isBundleAnalyzeEnabled', () => {
  it('returns true for "1" and "true"', () => {
    expect(isBundleAnalyzeEnabled('1')).toBe(true)
    expect(isBundleAnalyzeEnabled('true')).toBe(true)
  })

  it('returns false for undefined/other values', () => {
    expect(isBundleAnalyzeEnabled(undefined)).toBe(false)
    expect(isBundleAnalyzeEnabled('0')).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/utils/__tests__/env.test.ts`
Expected: FAIL with “Cannot find module '@/lib/utils/env'”

**Step 3: Write minimal implementation + config change + dependency**

```ts
// lib/utils/env.ts
export function isBundleAnalyzeEnabled(value = process.env.ANALYZE): boolean {
  return value === '1' || value === 'true'
}
```

```ts
// next.config.ts
import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'
import { isBundleAnalyzeEnabled } from './lib/utils/env'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: isBundleAnalyzeEnabled(),
})

const nextConfig: NextConfig = {
  reactCompiler: true,
}

export default withBundleAnalyzer(nextConfig)
```

Install dependency: `npm install -D @next/bundle-analyzer`

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/utils/__tests__/env.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/utils/env.ts lib/utils/__tests__/env.test.ts next.config.ts package.json package-lock.json
git commit -m "chore: add bundle analyzer toggle"
```

---

### Task 2: Add LazyMount client boundary for deferred rendering

**Files:**
- Create: `components/lazy-mount.tsx`
- Test: `components/__tests__/lazy-mount.test.tsx`

**Step 1: Write the failing test**

```tsx
// components/__tests__/lazy-mount.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LazyMount } from '@/components/lazy-mount'

let observerCallback: ((entries: IntersectionObserverEntry[]) => void) | undefined

class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  constructor(cb: (entries: IntersectionObserverEntry[]) => void) {
    observerCallback = cb
  }
}

describe('LazyMount', () => {
  it('renders fallback until intersecting', () => {
    // @ts-expect-error test mock
    global.IntersectionObserver = MockIntersectionObserver

    render(
      <LazyMount fallback={<div>Loading</div>}>
        <div>Content</div>
      </LazyMount>
    )

    expect(screen.queryByText('Loading')).not.toBeNull()
    expect(screen.queryByText('Content')).toBeNull()

    act(() => {
      observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry])
    })

    expect(screen.queryByText('Content')).not.toBeNull()
  })

  it('renders immediately when IntersectionObserver is unavailable', () => {
    // @ts-expect-error test mock
    delete global.IntersectionObserver

    render(
      <LazyMount fallback={<div>Loading</div>}>
        <div>Content</div>
      </LazyMount>
    )

    expect(screen.queryByText('Content')).not.toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- components/__tests__/lazy-mount.test.tsx`
Expected: FAIL with “Cannot find module '@/components/lazy-mount'”

**Step 3: Write minimal implementation**

```tsx
// components/lazy-mount.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

type LazyMountProps = {
  children: React.ReactNode
  fallback?: React.ReactNode
  rootMargin?: string
}

export function LazyMount({ children, fallback = null, rootMargin = '200px' }: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isVisible) return
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [isVisible, rootMargin])

  return <div ref={ref}>{isVisible ? children : fallback}</div>
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- components/__tests__/lazy-mount.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/lazy-mount.tsx components/__tests__/lazy-mount.test.tsx
git commit -m "feat: add lazy mount boundary"
```

---

### Task 3: Add chart skeleton + lazy-load charts in reports/insights

**Files:**
- Create: `components/chart-skeleton.tsx`
- Test: `components/__tests__/chart-skeleton.test.tsx`
- Modify: `app/reports/page.tsx`
- Modify: `app/insights/page.tsx`

**Step 1: Write the failing test**

```tsx
// components/__tests__/chart-skeleton.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ChartSkeleton } from '@/components/chart-skeleton'

describe('ChartSkeleton', () => {
  it('renders a fixed-height placeholder', () => {
    render(<ChartSkeleton height={240} />)
    const el = screen.getByTestId('chart-skeleton')
    expect(el).not.toBeNull()
    expect(el.getAttribute('style') ?? '').toContain('height: 240px')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- components/__tests__/chart-skeleton.test.tsx`
Expected: FAIL with “Cannot find module '@/components/chart-skeleton'”

**Step 3: Write minimal implementation**

```tsx
// components/chart-skeleton.tsx
import clsx from 'clsx'

export function ChartSkeleton({ height, className }: { height: number; className?: string }) {
  return (
    <div
      data-testid="chart-skeleton"
      className={clsx('rounded-lg border bg-muted/30 animate-pulse', className)}
      style={{ height: `${height}px` }}
      aria-busy="true"
    />
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- components/__tests__/chart-skeleton.test.tsx`
Expected: PASS

**Step 5: Refactor reports/insights to lazy-load charts**

```tsx
// app/reports/page.tsx (imports)
import dynamic from 'next/dynamic'
import { LazyMount } from '@/components/lazy-mount'
import { ChartSkeleton } from '@/components/chart-skeleton'

const SpendingTimelineChart = dynamic(
  () => import('@/components/reports/spending-timeline-chart').then(m => m.SpendingTimelineChart),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> }
)
const CategoryBreakdownChart = dynamic(
  () => import('@/components/reports/category-breakdown-chart').then(m => m.CategoryBreakdownChart),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> }
)
const TrendChart = dynamic(
  () => import('@/components/reports/trend-chart').then(m => m.TrendChart),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> }
)
```

```tsx
// app/reports/page.tsx (usage)
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
  <LazyMount fallback={<ChartSkeleton height={300} />}>
    <SpendingTimelineChart data={monthlyReport.transactionsByDay} />
  </LazyMount>
  <LazyMount fallback={<ChartSkeleton height={300} />}>
    <CategoryBreakdownChart data={monthlyReport.categories} />
  </LazyMount>
</div>

<LazyMount fallback={<ChartSkeleton height={300} />}>
  <TrendChart data={trendData} />
</LazyMount>
```

```tsx
// app/insights/page.tsx (imports)
import dynamic from 'next/dynamic'
import { LazyMount } from '@/components/lazy-mount'
import { ChartSkeleton } from '@/components/chart-skeleton'

const MerchantChart = dynamic(
  () => import('@/components/insights/merchant-chart').then(m => m.MerchantChart),
  { ssr: false, loading: () => <ChartSkeleton height={350} /> }
)
```

```tsx
// app/insights/page.tsx (usage)
{merchantInsights.length > 0 && (
  <LazyMount fallback={<ChartSkeleton height={350} />}>
    <MerchantChart data={merchantInsights.slice(0, 10)} />
  </LazyMount>
)}
```

**Step 6: Manual verification**

Run: `npm run dev`
Expected: `/reports` and `/insights` load quickly; charts appear after scroll without layout shift.

**Step 7: Commit**

```bash
git add components/chart-skeleton.tsx components/__tests__/chart-skeleton.test.tsx app/reports/page.tsx app/insights/page.tsx
git commit -m "perf: lazy-load charts with skeletons"
```

---

### Task 4: Add “load more” cap to TransactionList

**Files:**
- Modify: `components/transaction-list.tsx`
- Test: `components/__tests__/transaction-list.test.tsx`

**Step 1: Write the failing test**

```tsx
// components/__tests__/transaction-list.test.tsx
import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TransactionList } from '@/components/transaction-list'

vi.mock('@/components/transaction-form', () => ({
  TransactionForm: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}))

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/actions/transactions', () => ({
  deleteTransaction: vi.fn(),
}))

const transactions = Array.from({ length: 5 }, (_, i) => ({
  id: `t${i}`,
  amount: 10,
  amount_cents: 1000,
  date: '2025-01-01',
  description: `Item ${i}`,
  category_id: null,
  category: null,
  household_id: 'h1',
  type: 'expense',
  created_at: '2025-01-01',
}))

const categories = []

describe('TransactionList load more', () => {
  it('shows initial subset and loads more on click', async () => {
    render(
      <TransactionList
        transactions={transactions}
        categories={categories}
        initialVisibleCount={2}
        pageSize={2}
      />
    )

    expect(screen.getAllByTestId('transaction-row')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: /load more/i }))
    expect(screen.getAllByTestId('transaction-row')).toHaveLength(4)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- components/__tests__/transaction-list.test.tsx`
Expected: FAIL with “Property 'initialVisibleCount' does not exist on type…”

**Step 3: Write minimal implementation**

```tsx
// components/transaction-list.tsx (new props + load more)
interface TransactionListProps {
  transactions: TransactionWithCategory[]
  categories: Category[]
  budgetMap?: Record<string, number>
  spentMap?: Record<string, number>
  initialVisibleCount?: number
  pageSize?: number
}

const DEFAULT_INITIAL_VISIBLE = 50
const DEFAULT_PAGE_SIZE = 50

export function TransactionList({
  transactions,
  categories,
  budgetMap,
  spentMap,
  initialVisibleCount = DEFAULT_INITIAL_VISIBLE,
  pageSize = DEFAULT_PAGE_SIZE,
}: TransactionListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount)

  const visibleTransactions = transactions.slice(0, visibleCount)
  const hasMore = transactions.length > visibleCount

  // ... existing code ...

  return (
    <div className="space-y-2">
      {visibleTransactions.map((transaction) => (
        <Card key={transaction.id} data-testid="transaction-row">
          {/* existing row content */}
        </Card>
      ))}

      {hasMore && (
        <div className="pt-2 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((count) => Math.min(count + pageSize, transactions.length))}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- components/__tests__/transaction-list.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/transaction-list.tsx components/__tests__/transaction-list.test.tsx
git commit -m "perf: add load more to transactions"
```

---

### Task 5: Bundle analysis + build verification (manual)

**Files:**
- None (verification only)

**Step 1: Run analyzer build**

Run: `ANALYZE=1 NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=anon SUPABASE_SERVICE_ROLE_KEY=service SESSION_SECRET=dev npm run build`
Expected: Build succeeds and analyzer output opens (or emits stats) showing reduced JS for `/reports` and `/insights`.

**Step 2: Commit notes**

No commit; record results in PR/summary.

---

## References
- Design: `docs/plans/2026-01-02-performance-optimization-design.md`
