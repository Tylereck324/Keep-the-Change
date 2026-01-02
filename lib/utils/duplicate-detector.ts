import { ratio } from 'fuzzball'
import type { Transaction } from '@/lib/types'

/**
 * Information about a detected duplicate transaction.
 */
export type DuplicateMatch = {
  /** Index of the transaction in the import array */
  importIndex: number
  /** The existing transaction that this is a duplicate of */
  existingTransaction: Transaction
  /** Similarity score 0-100 (100 = identical descriptions) */
  similarity: number
}

/**
 * Calculate similarity between two descriptions (0-100 percentage)
 */
function calculateSimilarity(desc1: string, desc2: string): number {
  return ratio(desc1.toLowerCase(), desc2.toLowerCase())
}

/**
 * Check if two transactions are potential duplicates
 * Criteria: same date + same amount + similar description (80% threshold)
 */
function isPotentialDuplicate(
  newTx: { date: string; amount: number; description: string },
  existingTx: Transaction,
  similarityThreshold: number = 80
): { isDuplicate: boolean; similarity: number } {
  // Must have same date
  if (newTx.date !== existingTx.date) {
    return { isDuplicate: false, similarity: 0 }
  }

  // Must have same amount (with small tolerance for floating point)
  const amountDiff = Math.abs(newTx.amount - existingTx.amount)
  if (amountDiff > 0.01) {
    return { isDuplicate: false, similarity: 0 }
  }

  // Check description similarity
  const similarity = calculateSimilarity(
    newTx.description,
    existingTx.description || ''
  )

  const isDuplicate = similarity >= similarityThreshold

  return { isDuplicate, similarity }
}

/**
 * Find potential duplicates in a batch of transactions.
 *
 * A transaction is considered a duplicate if it has:
 * - Same date as an existing transaction
 * - Same amount (within $0.01 tolerance)
 * - Similar description (default 80% similarity threshold)
 *
 * @param newTransactions - Transactions to check for duplicates
 * @param existingTransactions - Existing transactions to compare against
 * @param similarityThreshold - Minimum description similarity (0-100), default 80
 * @returns Array of duplicate matches found
 *
 * @example
 * ```typescript
 * const duplicates = findDuplicates(importedTxns, existingTxns)
 * const duplicateIndices = new Set(duplicates.map(d => d.importIndex))
 * const uniqueTxns = importedTxns.filter((_, i) => !duplicateIndices.has(i))
 * ```
 */
export function findDuplicates(
  newTransactions: Array<{ date: string; amount: number; description: string }>,
  existingTransactions: Transaction[],
  similarityThreshold: number = 80
): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = []

  newTransactions.forEach((newTx, importIndex) => {
    // Find all potential matches for this transaction
    for (const existingTx of existingTransactions) {
      const { isDuplicate, similarity } = isPotentialDuplicate(
        newTx,
        existingTx,
        similarityThreshold
      )

      if (isDuplicate) {
        duplicates.push({
          importIndex,
          existingTransaction: existingTx,
          similarity,
        })
        // Only report first match per import transaction
        break
      }
    }
  })

  return duplicates
}

/**
 * Filter out transactions at specified indices.
 *
 * @param transactions - Array of transactions
 * @param duplicateIndices - Set of indices to exclude
 * @returns Filtered array without duplicates
 */
export function filterDuplicates<T>(
  transactions: T[],
  duplicateIndices: Set<number>
): T[] {
  return transactions.filter((_, index) => !duplicateIndices.has(index))
}
