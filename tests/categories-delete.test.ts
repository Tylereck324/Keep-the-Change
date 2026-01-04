import { describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  revalidatePath: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
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

function createCountBuilder(result: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => void, reject: (reason?: unknown) => void) => {
      Promise.resolve(result).then(resolve, reject)
    },
  }
}

function createDeleteBuilder(result: unknown) {
  return {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => void, reject: (reason?: unknown) => void) => {
      Promise.resolve(result).then(resolve, reject)
    },
  }
}

describe('deleteCategory', () => {
  it('returns affected count when deleting category', async () => {
    mocks.getSession.mockResolvedValue('household-1')
    const deleteBuilder = createDeleteBuilder({ error: null })
    mocks.from
      .mockImplementationOnce(() => createSelectBuilder({ data: { id: 'cat-1' }, error: null }))
      .mockImplementationOnce(() => createCountBuilder({ count: 3, error: null }))
      .mockImplementationOnce(() => deleteBuilder)

    await expect(deleteCategory('cat-1')).resolves.toEqual({ affectedTransactions: 3 })
  })

  it('throws when category does not belong to household', async () => {
    mocks.getSession.mockResolvedValue('household-1')
    const deleteBuilder = createDeleteBuilder({ error: null })
    mocks.from
      .mockImplementationOnce(() => createSelectBuilder({ data: null, error: null }))
      .mockImplementationOnce(() => deleteBuilder)

    await expect(deleteCategory('cat-1')).rejects.toThrow(/not found/i)
  })
})
