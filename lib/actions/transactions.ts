'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import { Transaction } from '@/lib/types'
import {
  validateAmount,
  validateDate,
  validateDescription,
  validateMonth,
} from '@/lib/utils/validators'
import { dollarsToCents } from '@/lib/utils/money'

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

  const transactionType = data.type || 'expense'

  // Validate all inputs - category required for expenses only
  if (transactionType === 'expense' && (!data.categoryId || data.categoryId.trim() === '')) {
    throw new Error('Category is required for expenses')
  }
  validateAmount(data.amount)
  validateDate(data.date)
  validateDescription(data.description)

  const { error } = await supabaseAdmin
    .from('transactions')
    .insert({
      household_id: householdId,
      category_id: data.categoryId || null,
      amount: data.amount,
      amount_cents: dollarsToCents(data.amount),
      description: data.description || null,
      date: data.date,
      type: transactionType,
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
  }
): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate ID
  if (!id || id.trim() === '') {
    throw new Error('Transaction ID is required')
  }

  const transactionType = data.type || 'expense'

  // Validate all inputs - category required for expenses only
  if (transactionType === 'expense' && (!data.categoryId || data.categoryId.trim() === '')) {
    throw new Error('Category is required for expenses')
  }
  validateAmount(data.amount)
  validateDate(data.date)
  validateDescription(data.description)

  const { error } = await supabaseAdmin
    .from('transactions')
    .update({
      category_id: data.categoryId || null,
      amount: data.amount,
      amount_cents: dollarsToCents(data.amount),
      description: data.description || null,
      date: data.date,
      type: transactionType,
    })
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) {
    throw new Error(`Failed to update transaction: ${error.message}`)
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
