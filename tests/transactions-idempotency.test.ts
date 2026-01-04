import { describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }))
vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    rpc: mocks.rpc,
    from: mocks.from,
  },
}))

import { createTransaction } from '@/lib/actions/transactions'

describe('createTransaction idempotency', () => {
  it('returns early when idempotency key already used', async () => {
    mocks.getSession.mockResolvedValue('household-1')
    mocks.rpc.mockResolvedValue({ data: false, error: null })

    await expect(createTransaction({
      categoryId: '11111111-1111-4111-8111-111111111111',
      amount: 10,
      description: 'Test',
      date: '2026-01-04',
      type: 'expense',
      idempotencyKey: 'abc',
    })).resolves.toBeUndefined()

    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('throws when idempotency RPC fails', async () => {
    mocks.getSession.mockResolvedValue('household-1')
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } })

    await expect(createTransaction({
      categoryId: '11111111-1111-4111-8111-111111111111',
      amount: 10,
      description: 'Test',
      date: '2026-01-04',
      type: 'expense',
      idempotencyKey: 'abc',
    })).rejects.toThrow('rpc failed')
  })
})
