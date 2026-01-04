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
