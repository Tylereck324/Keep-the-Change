/**
 * Transaction helper utilities for common transaction operations.
 * Consolidated from dashboard.tsx, reports.ts, insights.ts.
 */

import { TransactionWithCategory } from '@/lib/actions/transactions'

/**
 * Determines if a transaction is an income transaction.
 * A transaction is considered income if:
 * - Its type field is explicitly 'income', OR
 * - Its category name (case-insensitive) is 'income'
 * 
 * @param transaction Transaction with optional category data
 * @returns true if the transaction represents income
 */
export function isIncomeTransaction(
    transaction: TransactionWithCategory | { type?: string; category?: { name?: string } | null }
): boolean {
    const type = (transaction as { type?: string }).type
    const categoryName = transaction.category?.name?.toLowerCase()

    return type === 'income' || categoryName === 'income'
}
