import { distance } from 'fuzzball'
import type { Transaction } from '@/lib/types'

export type DuplicateMatch = {
  importIndex: number // index in import array
  existingTransaction: Transaction
  similarity: number // 0-100
}

/**
 * Calculate similarity between two descriptions using Levenshtein distance
 */
function calculateSimilarity(desc1: string, desc2: string): number {
  return distance(desc1.toLowerCase(), desc2.toLowerCase())
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
 * Find potential duplicates for a batch of transactions
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
 * Filter out transactions marked as duplicates
 */
export function filterDuplicates<T>(
  transactions: T[],
  duplicateIndices: Set<number>
): T[] {
  return transactions.filter((_, index) => !duplicateIndices.has(index))
}
