import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  revalidatePath: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}))

import { updateTransaction } from '@/lib/actions/transactions'

const baseUpdate = {
  categoryId: '11111111-1111-4111-8111-111111111111',
  amount: 12.34,
  description: 'Lunch',
  date: '2026-01-04',
  type: 'expense' as const,
}

function createSelectBuilder(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(data),
  }
}

function createUpdateBuilder(data: unknown, error: unknown = null) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({ data, error }),
  }
}

describe('updateTransaction optimistic locking', () => {
  beforeEach(() => {
    mocks.getSession.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.from.mockReset()
  })

  it('throws when expectedUpdatedAt does not match', async () => {
    mocks.getSession.mockResolvedValue('household-1')

    const selectBuilder = createSelectBuilder({
      data: { id: '11111111-1111-4111-8111-111111111111', updated_at: '2026-01-04T00:00:00.000Z' },
      error: null,
    })

    mocks.from.mockImplementationOnce(() => selectBuilder)

    await expect(
      updateTransaction(
        '11111111-1111-4111-8111-111111111111',
        baseUpdate,
        '2026-01-03T00:00:00.000Z'
      )
    ).rejects.toThrow(/modified by someone else/i)
  })

  it('throws when update affects no rows', async () => {
    mocks.getSession.mockResolvedValue('household-1')

    const selectBuilder = createSelectBuilder({
      data: { id: '11111111-1111-4111-8111-111111111111', updated_at: '2026-01-04T00:00:00.000Z' },
      error: null,
    })
    const updateBuilder = createUpdateBuilder([])

    mocks.from
      .mockImplementationOnce(() => selectBuilder)
      .mockImplementationOnce(() => updateBuilder)

    await expect(
      updateTransaction(
        '11111111-1111-4111-8111-111111111111',
        baseUpdate,
        '2026-01-04T00:00:00.000Z'
      )
    ).rejects.toThrow(/modified by someone else/i)
  })

  it('updates when expectedUpdatedAt matches', async () => {
    mocks.getSession.mockResolvedValue('household-1')

    const selectBuilder = createSelectBuilder({
      data: { id: '11111111-1111-4111-8111-111111111111', updated_at: '2026-01-04T00:00:00.000Z' },
      error: null,
    })
    const updateBuilder = createUpdateBuilder([{ id: '11111111-1111-4111-8111-111111111111' }])

    mocks.from
      .mockImplementationOnce(() => selectBuilder)
      .mockImplementationOnce(() => updateBuilder)

    await expect(
      updateTransaction(
        '11111111-1111-4111-8111-111111111111',
        baseUpdate,
        '2026-01-04T00:00:00.000Z'
      )
    ).resolves.toBeUndefined()
  })
})
