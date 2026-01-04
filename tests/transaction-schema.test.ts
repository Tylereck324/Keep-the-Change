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
