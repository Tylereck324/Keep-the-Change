'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { Database } from '@/lib/types'

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
 * Bulk import transactions atomically using Postgres RPC.
 * The entire import is wrapped in a database transaction - either all
 * transactions are imported successfully, or none are (full rollback).
 * 
 * Validation is performed client-side first to provide better error messages.
 * If validation passes, transactions are sent to the bulk_import_transactions
 * Postgres function which handles the atomic insert.
 */
export async function bulkImportTransactions(
  transactions: BulkImportTransaction[]
): Promise<BulkImportResult> {
  const householdId = await getSession()
  if (!householdId) {
    throw new Error('Not authenticated')
  }

  const errors: Array<{ index: number; message: string }> = []
  const validTransactions: Array<{
    category_id: string
    amount: number
    description: string
    date: string
    type: string
  }> = []

  // Client-side validation first
  for (let i = 0; i < transactions.length; i++) {
    const txn = transactions[i]

    // Validate required fields
    if (!txn.categoryId || txn.categoryId.trim() === '') {
      errors.push({ index: i, message: 'Category is required' })
      continue
    }
    if (!Number.isFinite(txn.amount) || txn.amount <= 0) {
      errors.push({ index: i, message: 'Invalid amount' })
      continue
    }
    if (txn.amount > 100_000_000) {
      errors.push({ index: i, message: 'Amount exceeds maximum allowed value' })
      continue
    }
    if (!txn.date || !/^\d{4}-\d{2}-\d{2}$/.test(txn.date)) {
      errors.push({ index: i, message: 'Invalid date format' })
      continue
    }
    if (!txn.description || txn.description.trim() === '') {
      errors.push({ index: i, message: 'Description is required' })
      continue
    }
    if (txn.description.length > 100) {
      errors.push({ index: i, message: 'Description must be 100 characters or less' })
      continue
    }

    validTransactions.push({
      category_id: txn.categoryId,
      amount: txn.amount,
      description: txn.description,
      date: txn.date,
      type: 'expense',
    })
  }

  // If there are validation errors, don't proceed with import
  if (errors.length > 0) {
    return {
      success: false,
      imported: 0,
      failed: errors.length,
      errors,
    }
  }

  // If no valid transactions, return early
  if (validTransactions.length === 0) {
    return {
      success: true,
      imported: 0,
      failed: 0,
      errors: [],
    }
  }

  // Call atomic RPC function
  try {
    const { data, error } = await supabaseAdmin.rpc('bulk_import_transactions', {
      p_household_id: householdId,
      p_transactions: validTransactions,
    })

    if (error) {
      // RPC call failed
      return {
        success: false,
        imported: 0,
        failed: validTransactions.length,
        errors: [{ index: 0, message: `Import failed: ${error.message}` }],
      }
    }

    // Parse RPC response
    const result = data as {
      success: boolean
      imported: number
      failed: number
      errors?: Array<{ index: number; message: string }>
      error?: string
    }

    if (!result.success) {
      return {
        success: false,
        imported: 0,
        failed: validTransactions.length,
        errors: result.errors || [{ index: 0, message: result.error || 'Unknown error' }],
      }
    }

    // Revalidate paths after successful import
    revalidatePath('/')
    revalidatePath('/transactions')

    return {
      success: true,
      imported: result.imported,
      failed: 0,
      errors: [],
    }
  } catch (error) {
    return {
      success: false,
      imported: 0,
      failed: validTransactions.length,
      errors: [{ index: 0, message: error instanceof Error ? error.message : 'Unknown error' }],
    }
  }
}

/**
 * Get all merchant patterns for current household
 * Used to populate the category matcher
 */
export async function getMerchantPatterns() {
  const householdId = await getSession()
  if (!householdId) return []

  const { data, error } = await supabaseAdmin
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
  const { error } = await supabaseAdmin
    .from('merchant_patterns')
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
