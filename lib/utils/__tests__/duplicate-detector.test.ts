import { describe, it, expect } from 'vitest'
import { findDuplicates, filterDuplicates } from '../duplicate-detector'
import type { Transaction } from '@/lib/types'

// Helper to create mock transaction
const createTransaction = (
  overrides: Partial<Transaction> = {}
): Transaction => ({
  id: `txn-${Math.random().toString(36).slice(2)}`,
  household_id: 'test-household',
  category_id: 'cat-1',
  amount: 50.0,
  date: '2024-01-15',
  description: 'TEST TRANSACTION',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

describe('findDuplicates', () => {
  describe('exact duplicates', () => {
    it('should detect exact duplicate (same date, amount, description)', () => {
      const existing: Transaction[] = [
        createTransaction({
          date: '2024-01-15',
          amount: 50.0,
          description: 'WALMART PURCHASE',
        }),
      ]

      const newTxns = [
        { date: '2024-01-15', amount: 50.0, description: 'WALMART PURCHASE' },
      ]

      const result = findDuplicates(newTxns, existing)

      expect(result).toHaveLength(1)
      expect(result[0].importIndex).toBe(0)
      expect(result[0].similarity).toBe(100)
    })

    it('should detect duplicate with case-insensitive description', () => {
      const existing: Transaction[] = [
        createTransaction({
          date: '2024-01-15',
          amount: 50.0,
          description: 'WALMART PURCHASE',
        }),
      ]

      const newTxns = [
        { date: '2024-01-15', amount: 50.0, description: 'walmart purchase' },
      ]

      const result = findDuplicates(newTxns, existing)

      expect(result).toHaveLength(1)
      expect(result[0].similarity).toBe(100)
    })
  })

  describe('similar duplicates', () => {
    it('should detect near-duplicate with similar description (above threshold)', () => {
      const existing: Transaction[] = [
        createTransaction({
          date: '2024-01-15',
          amount: 50.0,
          description: 'WALMART SUPERCENTER #1234',
        }),
      ]

      const newTxns = [
        {
          date: '2024-01-15',
          amount: 50.0,
          description: 'WALMART SUPERCENTER #1235',
        },
      ]

      const result = findDuplicates(newTxns, existing, 80)

      expect(result).toHaveLength(1)
      expect(result[0].similarity).toBeGreaterThanOrEqual(80)
    })

    it('should not flag as duplicate if similarity below threshold', () => {
      const existing: Transaction[] = [
        createTransaction({
          date: '2024-01-15',
          amount: 50.0,
          description: 'WALMART SUPERCENTER',
        }),
      ]

      const newTxns = [
        {
          date: '2024-01-15',
          amount: 50.0,
          description: 'TARGET STORE PURCHASE',
        },
      ]

      const result = findDuplicates(newTxns, existing, 80)

      expect(result).toHaveLength(0)
    })

    it('should respect custom similarity threshold', () => {
      const existing: Transaction[] = [
        createTransaction({
          date: '2024-01-15',
          amount: 50.0,
          description: 'AMAZON PURCHASE',
        }),
      ]

      const newTxns = [
        { date: '2024-01-15', amount: 50.0, description: 'AMAZON ORDER' },
      ]

      // With high threshold, should not match
      const strictResult = findDuplicates(newTxns, existing, 95)
      expect(strictResult).toHaveLength(0)

      // With lower threshold, should match
      const lenientResult = findDuplicates(newTxns, existing, 50)
      expect(lenientResult).toHaveLength(1)
    })
  })

  describe('non-duplicates', () => {
    it('should not flag as duplicate if dates differ', () => {
      const existing: Transaction[] = [
        createTransaction({
          date: '2024-01-15',
          amount: 50.0,
          description: 'WALMART PURCHASE',
        }),
      ]

      const newTxns = [
        { date: '2024-01-16', amount: 50.0, description: 'WALMART PURCHASE' },
      ]

      const result = findDuplicates(newTxns, existing)

      expect(result).toHaveLength(0)
    })

    it('should not flag as duplicate if amounts differ', () => {
      const existing: Transaction[] = [
        createTransaction({
          date: '2024-01-15',
          amount: 50.0,
          description: 'WALMART PURCHASE',
        }),
      ]

      const newTxns = [
        { date: '2024-01-15', amount: 51.0, description: 'WALMART PURCHASE' },
      ]

      const result = findDuplicates(newTxns, existing)

      expect(result).toHaveLength(0)
    })

    it('should tolerate tiny floating point differences (within 0.01)', () => {
      const existing: Transaction[] = [
        createTransaction({
          date: '2024-01-15',
          amount: 50.0,
          description: 'PURCHASE',
        }),
      ]

      const newTxns = [
        { date: '2024-01-15', amount: 50.009, description: 'PURCHASE' },
      ]

      const result = findDuplicates(newTxns, existing)

      expect(result).toHaveLength(1)
    })

    it('should not tolerate differences larger than 0.01', () => {
      const existing: Transaction[] = [
        createTransaction({
          date: '2024-01-15',
          amount: 50.0,
          description: 'PURCHASE',
        }),
      ]

      const newTxns = [
        { date: '2024-01-15', amount: 50.02, description: 'PURCHASE' },
      ]

      const result = findDuplicates(newTxns, existing)

      expect(result).toHaveLength(0)
    })
  })

  describe('batch processing', () => {
    it('should check all new transactions against all existing', () => {
      const existing: Transaction[] = [
        createTransaction({
          id: 'existing-1',
          date: '2024-01-15',
          amount: 50.0,
          description: 'FIRST PURCHASE',
        }),
        createTransaction({
          id: 'existing-2',
          date: '2024-01-16',
          amount: 75.0,
          description: 'SECOND PURCHASE',
        }),
      ]

      const newTxns = [
        { date: '2024-01-15', amount: 50.0, description: 'FIRST PURCHASE' },
        { date: '2024-01-17', amount: 100.0, description: 'NEW PURCHASE' },
        { date: '2024-01-16', amount: 75.0, description: 'SECOND PURCHASE' },
      ]

      const result = findDuplicates(newTxns, existing)

      expect(result).toHaveLength(2)
      expect(result.map((d) => d.importIndex).sort()).toEqual([0, 2])
    })

    it('should only report first existing match per import transaction', () => {
      const existing: Transaction[] = [
        createTransaction({
          id: 'existing-1',
          date: '2024-01-15',
          amount: 50.0,
          description: 'DUPLICATE',
        }),
        createTransaction({
          id: 'existing-2',
          date: '2024-01-15',
          amount: 50.0,
          description: 'DUPLICATE',
        }),
      ]

      const newTxns = [
        { date: '2024-01-15', amount: 50.0, description: 'DUPLICATE' },
      ]

      const result = findDuplicates(newTxns, existing)

      // Should only report one match even though two exist
      expect(result).toHaveLength(1)
    })

    it('should handle empty existing transactions list', () => {
      const newTxns = [
        { date: '2024-01-15', amount: 50.0, description: 'PURCHASE' },
      ]

      const result = findDuplicates(newTxns, [])

      expect(result).toHaveLength(0)
    })

    it('should handle empty new transactions list', () => {
      const existing: Transaction[] = [
        createTransaction({
          date: '2024-01-15',
          amount: 50.0,
          description: 'PURCHASE',
        }),
      ]

      const result = findDuplicates([], existing)

      expect(result).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('should handle null/undefined description in existing transaction', () => {
      const existing: Transaction[] = [
        createTransaction({
          date: '2024-01-15',
          amount: 50.0,
          description: null as unknown as string,
        }),
      ]

      const newTxns = [
        { date: '2024-01-15', amount: 50.0, description: 'PURCHASE' },
      ]

      // Should not throw, should not match
      const result = findDuplicates(newTxns, existing)
      expect(result).toHaveLength(0)
    })
  })
})

describe('filterDuplicates', () => {
  it('should filter out transactions at duplicate indices', () => {
    const transactions = ['A', 'B', 'C', 'D', 'E']
    const duplicateIndices = new Set([1, 3])

    const result = filterDuplicates(transactions, duplicateIndices)

    expect(result).toEqual(['A', 'C', 'E'])
  })

  it('should return all transactions when no duplicates', () => {
    const transactions = ['A', 'B', 'C']
    const duplicateIndices = new Set<number>()

    const result = filterDuplicates(transactions, duplicateIndices)

    expect(result).toEqual(['A', 'B', 'C'])
  })

  it('should return empty array when all are duplicates', () => {
    const transactions = ['A', 'B', 'C']
    const duplicateIndices = new Set([0, 1, 2])

    const result = filterDuplicates(transactions, duplicateIndices)

    expect(result).toEqual([])
  })

  it('should handle empty transactions array', () => {
    const result = filterDuplicates([], new Set([0, 1]))

    expect(result).toEqual([])
  })

  it('should work with object arrays', () => {
    const transactions = [
      { id: 1, name: 'First' },
      { id: 2, name: 'Second' },
      { id: 3, name: 'Third' },
    ]
    const duplicateIndices = new Set([1])

    const result = filterDuplicates(transactions, duplicateIndices)

    expect(result).toEqual([
      { id: 1, name: 'First' },
      { id: 3, name: 'Third' },
    ])
  })
})
