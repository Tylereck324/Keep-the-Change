'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import { Transaction } from '@/lib/types'
import { validateDate, validateMonth } from '@/lib/utils/validators'
import { dollarsToCents } from '@/lib/utils/money'
import {
  createTransactionSchema,
  updateTransactionSchema,
  CreateTransactionInput,
  UpdateTransactionInput
} from '@/lib/schemas/transaction'

// Transaction with joined category data
export type TransactionWithCategory = Transaction & {
  category: {
    id: string
    name: string
    color: string
  } | null
}

export async function getTransactions(filters?: {
  categoryId?: string
  startDate?: string
  endDate?: string
  type?: 'income' | 'expense'
  limit?: number
  offset?: number
}): Promise<TransactionWithCategory[]> {
  const householdId = await getSession()
  if (!householdId) return []

  // Validate date filters if provided
  if (filters?.startDate) {
    validateDate(filters.startDate)
  }
  if (filters?.endDate) {
    validateDate(filters.endDate)
  }

  let query = supabaseAdmin
    .from('transactions')
    .select('*, category:categories(id, name, color)')
    .eq('household_id', householdId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }
  if (filters?.startDate) {
    query = query.gte('date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('date', filters.endDate)
  }
  if (filters?.type) {
    query = query.eq('type', filters.type)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  }

  return data ?? []
}

export async function getTransactionsByMonth(month: string): Promise<TransactionWithCategory[]> {
  validateMonth(month)

  const householdId = await getSession()
  if (!householdId) return []

  const startDate = `${month}-01`
  const [year, monthNum] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNum, 0).getDate()
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*, category:categories(id, name, color)')
    .eq('household_id', householdId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch transactions for ${month}: ${error.message}`)
  }

  return data ?? []
}

export async function createTransaction(data: {
  categoryId?: string
  amount: number
  description?: string
  date: string
  type?: 'income' | 'expense'
}): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate using Zod
  const validated = createTransactionSchema.parse(data)

  // Double-submit protection
  if (validated.idempotencyKey) {
    const { data: isNew, error: rpcError } = await supabaseAdmin.rpc('check_idempotency_key', {
      p_key: validated.idempotencyKey,
      p_household_id: householdId
    })

    if (rpcError) {
      throw new Error(`Failed to check idempotency key: ${rpcError.message}`)
    }

    // If key exists (isNew === false), we skip insertion (idempotent success)
    if (isNew === false) {
      return
    }
  }

  const { error } = await supabaseAdmin
    .from('transactions')
    .insert({
      household_id: householdId,
      category_id: validated.categoryId || null,
      amount: validated.amount,
      amount_cents: dollarsToCents(validated.amount),
      description: validated.description || null,
      date: validated.date,
      type: validated.type,
    })

  if (error) {
    throw new Error(`Failed to create transaction: ${error.message}`)
  }

  revalidatePath('/')
  revalidatePath('/transactions')
  revalidatePath('/insights')
}

export async function updateTransaction(
  id: string,
  data: {
    categoryId?: string
    amount: number
    description?: string
    date: string
    type?: 'income' | 'expense'
  },
  expectedUpdatedAt: string
): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate ID
  if (!id || id.trim() === '') {
    throw new Error('Transaction ID is required')
  }

  const validated = updateTransactionSchema.parse({ ...data, id, expectedUpdatedAt })

  const { data: current, error: fetchError } = await supabaseAdmin
    .from('transactions')
    .select('id, updated_at')
    .eq('id', id)
    .eq('household_id', householdId)
    .maybeSingle()

  if (fetchError) {
    throw new Error(`Failed to load transaction: ${fetchError.message}`)
  }

  if (!current) {
    throw new Error('Transaction not found')
  }

  if (current.updated_at !== validated.expectedUpdatedAt) {
    throw new Error('This transaction was modified by someone else. Please refresh and try again.')
  }

  const { data: updated, error } = await supabaseAdmin
    .from('transactions')
    .update({
      category_id: validated.categoryId || null,
      amount: validated.amount,
      amount_cents: dollarsToCents(validated.amount),
      description: validated.description || null,
      date: validated.date,
      type: validated.type,
    })
    .eq('id', id)
    .eq('household_id', householdId)
    .eq('updated_at', validated.expectedUpdatedAt)
    .select('id')

  if (error) {
    throw new Error(`Failed to update transaction: ${error.message}`)
  }

  if (!updated || updated.length === 0) {
    throw new Error('This transaction was modified by someone else. Please refresh and try again.')
  }

  revalidatePath('/')
  revalidatePath('/transactions')
  revalidatePath('/insights')
}

export async function deleteTransaction(id: string): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate ID
  if (!id || id.trim() === '') {
    throw new Error('Transaction ID is required')
  }

  const { error } = await supabaseAdmin
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) {
    throw new Error(`Failed to delete transaction: ${error.message}`)
  }

  revalidatePath('/')
  revalidatePath('/transactions')
}
