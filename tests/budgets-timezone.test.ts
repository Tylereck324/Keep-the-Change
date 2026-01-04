import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getHouseholdTimezone: vi.fn(),
  getCurrentMonth: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}))

vi.mock('@/lib/actions/settings', () => ({
  getHouseholdTimezone: mocks.getHouseholdTimezone,
}))

vi.mock('@/lib/utils/date', () => ({
  getCurrentMonth: mocks.getCurrentMonth,
}))

vi.mock('@/lib/actions/transactions', () => ({
  getTransactionsByMonth: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}))

import { getBudgetDataForWarnings } from '@/lib/actions/budgets'

function createQueryBuilder(result: unknown) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => void, reject: (reason?: unknown) => void) => {
      Promise.resolve(result).then(resolve, reject)
    },
  }

  return builder
}

describe('getBudgetDataForWarnings timezone handling', () => {
  beforeEach(() => {
    mocks.getSession.mockReset()
    mocks.getHouseholdTimezone.mockReset()
    mocks.getCurrentMonth.mockReset()
    mocks.from.mockReset()
  })

  it('uses household timezone when computing current month', async () => {
    mocks.getSession.mockResolvedValue('household-1')
    mocks.getHouseholdTimezone.mockResolvedValue('America/Los_Angeles')
    mocks.getCurrentMonth.mockReturnValue('2026-01')
    mocks.from.mockReturnValue(createQueryBuilder({ data: [], error: null }))

    await getBudgetDataForWarnings()

    expect(mocks.getCurrentMonth).toHaveBeenCalledWith('America/Los_Angeles')
  })
})
