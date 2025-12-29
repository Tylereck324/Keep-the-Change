'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { Transaction } from '@/lib/types'

// Validation helpers
function validateMonth(month: string): void {
  const monthRegex = /^\d{4}-\d{2}$/
  if (!monthRegex.test(month)) {
    throw new Error('Invalid month format. Expected YYYY-MM')
  }
  const [yearStr, monthStr] = month.split('-')
  const year = parseInt(yearStr, 10)
  const parsedMonth = parseInt(monthStr, 10)
  if (isNaN(year) || isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    throw new Error('Invalid month format. Expected YYYY-MM')
  }
}

function validateDate(dateStr: string): void {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD')
  }
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date value')
  }
  if (date > new Date()) {
    throw new Error('Date cannot be in the future')
  }
}

function validateAmount(amount: number): void {
  if (!Number.isFinite(amount)) {
    throw new Error('Amount must be a valid number')
  }
  if (amount <= 0) {
    throw new Error('Amount must be positive')
  }
  if (amount > 100_000_000) {
    throw new Error('Amount exceeds maximum allowed value')
  }
}

function validateDescription(description: string | undefined): void {
  if (description && description.length > 100) {
    throw new Error('Description must be 100 characters or less')
  }
}

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

  let query = supabase
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

  const { data, error } = await supabase
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
  categoryId: string
  amount: number
  description?: string
  date: string
}): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate all inputs
  if (!data.categoryId || data.categoryId.trim() === '') {
    throw new Error('Category is required')
  }
  validateAmount(data.amount)
  validateDate(data.date)
  validateDescription(data.description)

  const { error } = await supabase
    .from('transactions')
    // @ts-expect-error - Supabase client type inference issue
    .insert({
    household_id: householdId,
    category_id: data.categoryId,
    amount: data.amount,
    description: data.description || null,
    date: data.date,
  })

  if (error) {
    throw new Error(`Failed to create transaction: ${error.message}`)
  }

  revalidatePath('/')
  revalidatePath('/transactions')
}

export async function updateTransaction(
  id: string,
  data: {
    categoryId: string
    amount: number
    description?: string
    date: string
  }
): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate ID
  if (!id || id.trim() === '') {
    throw new Error('Transaction ID is required')
  }

  // Validate all inputs
  if (!data.categoryId || data.categoryId.trim() === '') {
    throw new Error('Category is required')
  }
  validateAmount(data.amount)
  validateDate(data.date)
  validateDescription(data.description)

  const { error } = await supabase
    .from('transactions')
    // @ts-expect-error - Supabase client type inference issue
    .update({
      category_id: data.categoryId,
      amount: data.amount,
      description: data.description || null,
      date: data.date,
    })
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) {
    throw new Error(`Failed to update transaction: ${error.message}`)
  }

  revalidatePath('/')
  revalidatePath('/transactions')
}

export async function deleteTransaction(id: string): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate ID
  if (!id || id.trim() === '') {
    throw new Error('Transaction ID is required')
  }

  const { error } = await supabase
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
