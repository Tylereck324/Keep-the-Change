'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import type { Database } from '@/lib/types'

type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type MerchantPatternInsert = Database['public']['Tables']['merchant_patterns']['Insert']

export type BulkImportTransaction = {
  categoryId: string
  amount: number
  description: string
  date: string
}

export type BulkImportResult = {
  success: boolean
  imported: number
  failed: number
  errors: Array<{ index: number; message: string }>
}

/**
 * Bulk import transactions with batch processing
 * Processes transactions in batches of 100 to avoid timeouts
 */
export async function bulkImportTransactions(
  transactions: BulkImportTransaction[]
): Promise<BulkImportResult> {
  const householdId = await getSession()
  if (!householdId) {
    throw new Error('Not authenticated')
  }

  const BATCH_SIZE = 100
  const errors: Array<{ index: number; message: string }> = []
  let imported = 0

  // Process transactions in batches
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE)

    // Convert to database format
    const insertData: TransactionInsert[] = []

    for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
      const txn = batch[batchIndex]
      const globalIndex = i + batchIndex

      // Validate required fields
      if (!txn.categoryId || txn.categoryId.trim() === '') {
        errors.push({ index: globalIndex, message: 'Category is required' })
        continue
      }
      if (!Number.isFinite(txn.amount) || txn.amount <= 0) {
        errors.push({ index: globalIndex, message: 'Invalid amount' })
        continue
      }
      if (txn.amount > 100_000_000) {
        errors.push({ index: globalIndex, message: 'Amount exceeds maximum allowed value' })
        continue
      }
      if (!txn.date || !/^\d{4}-\d{2}-\d{2}$/.test(txn.date)) {
        errors.push({ index: globalIndex, message: 'Invalid date format' })
        continue
      }
      if (!txn.description || txn.description.trim() === '') {
        errors.push({ index: globalIndex, message: 'Description is required' })
        continue
      }
      if (txn.description.length > 100) {
        errors.push({ index: globalIndex, message: 'Description must be 100 characters or less' })
        continue
      }

      insertData.push({
        household_id: householdId,
        category_id: txn.categoryId,
        amount: txn.amount,
        description: txn.description,
        date: txn.date,
      })
    }

    // Skip if all transactions in batch failed validation
    if (insertData.length === 0) {
      continue
    }

    // Insert batch
    try {
      const { error } = await supabase
        .from('transactions')
        // @ts-expect-error - Supabase client type inference issue
        .insert(insertData)

      if (error) {
        // If batch insert fails, mark all transactions in this batch as failed
        for (let j = 0; j < insertData.length; j++) {
          const globalIndex = i + j
          errors.push({
            index: globalIndex,
            message: `Batch insert failed: ${error.message}`,
          })
        }
      } else {
        imported += insertData.length
      }
    } catch (error) {
      // If batch insert fails, mark all transactions in this batch as failed
      for (let j = 0; j < insertData.length; j++) {
        const globalIndex = i + j
        errors.push({
          index: globalIndex,
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  }

  // Revalidate paths after import
  revalidatePath('/')
  revalidatePath('/transactions')

  const failed = errors.length
  const success = imported > 0 && failed === 0

  return {
    success,
    imported,
    failed,
    errors,
  }
}

/**
 * Get all merchant patterns for current household
 * Used to populate the category matcher
 */
export async function getMerchantPatterns() {
  const householdId = await getSession()
  if (!householdId) return []

  const { data, error } = await supabase
    .from('merchant_patterns')
    .select('*')
    .eq('household_id', householdId)
    .order('last_used_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch merchant patterns: ${error.message}`)
  }

  return data ?? []
}

/**
 * Learn a new merchant pattern from user's manual category selection
 * Uses upsert to update last_used_at if pattern already exists
 */
export async function learnMerchantPattern(
  merchantName: string,
  categoryId: string
): Promise<void> {
  const householdId = await getSession()
  if (!householdId) {
    throw new Error('Not authenticated')
  }

  // Validate inputs
  if (!merchantName || merchantName.trim() === '') {
    throw new Error('Merchant name is required')
  }
  if (!categoryId || categoryId.trim() === '') {
    throw new Error('Category is required')
  }

  // Normalize merchant name (lowercase for consistency)
  const normalizedMerchantName = merchantName.trim().toLowerCase()

  const patternData: MerchantPatternInsert = {
    household_id: householdId,
    merchant_name: normalizedMerchantName,
    category_id: categoryId,
    last_used_at: new Date().toISOString(),
  }

  // Upsert: insert new pattern or update last_used_at if exists
  const { error } = await supabase
    .from('merchant_patterns')
    // @ts-expect-error - Supabase client type inference issue
    .upsert(patternData, {
      onConflict: 'household_id,merchant_name,category_id',
      ignoreDuplicates: false,
    })

  if (error) {
    throw new Error(`Failed to learn merchant pattern: ${error.message}`)
  }

  // Revalidate paths so future imports can use this pattern
  revalidatePath('/')
  revalidatePath('/transactions')
}
