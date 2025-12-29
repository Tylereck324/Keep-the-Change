'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { getAutoRolloverSetting } from '@/lib/actions/settings'
import { MonthlyBudget } from '@/lib/types'

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

export async function getMonthlyBudgets(month: string): Promise<MonthlyBudget[]> {
  validateMonth(month)
  const householdId = await getSession()
  if (!householdId) return []

  const { data, error } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('household_id', householdId)
    .eq('month', month)

  if (error) {
    throw new Error(`Failed to fetch monthly budgets: ${error.message}`)
  }

  return data ?? []
}

export async function setBudgetAmount(categoryId: string, month: string, amount: number): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  validateMonth(month)

  // Validate amount is non-negative
  if (amount < 0) {
    throw new Error('Budget amount cannot be negative')
  }

  // Validate amount has reasonable maximum (100 million)
  if (amount > 100_000_000) {
    throw new Error('Budget amount exceeds maximum allowed value')
  }

  // Validate amount is a valid number
  if (!Number.isFinite(amount)) {
    throw new Error('Budget amount must be a valid number')
  }

  const { error } = await supabase
    .from('monthly_budgets')
    // @ts-expect-error - Supabase client type inference issue
    .upsert(
      {
        household_id: householdId,
        category_id: categoryId,
        month,
        budgeted_amount: amount,
      },
      { onConflict: 'household_id,category_id,month' }
    )

  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/budget')
}

export async function copyBudgetFromPreviousMonth(currentMonth: string): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  validateMonth(currentMonth)

  // Calculate previous month using proper date arithmetic
  const [yearStr, monthStr] = currentMonth.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)

  // Create date object for current month, then subtract 1 month
  const currentDate = new Date(year, month - 1, 1)
  currentDate.setMonth(currentDate.getMonth() - 1)

  const prevYear = currentDate.getFullYear()
  const prevMonth = currentDate.getMonth() + 1
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`

  // Get previous month's budgets
  const { data: prevBudgets, error: fetchError } = await supabase
    .from('monthly_budgets')
    .select('category_id, budgeted_amount')
    .eq('household_id', householdId)
    .eq('month', prevMonthStr)

  if (fetchError) {
    throw new Error(`Failed to fetch previous month budgets: ${fetchError.message}`)
  }

  if (!prevBudgets || prevBudgets.length === 0) {
    throw new Error('No budget found for previous month')
  }

  // Copy to current month
  const newBudgets = prevBudgets.map((b: { category_id: string; budgeted_amount: number }) => ({
    household_id: householdId,
    category_id: b.category_id,
    month: currentMonth,
    budgeted_amount: b.budgeted_amount,
  }))

  const { error } = await supabase
    .from('monthly_budgets')
    // @ts-expect-error - Supabase client type inference issue
    .upsert(newBudgets, { onConflict: 'household_id,category_id,month' })

  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/budget')
}

export async function autoRolloverIfNeeded(month: string): Promise<void> {
  const householdId = await getSession()
  if (!householdId) return

  validateMonth(month)

  // Check if auto-rollover is enabled
  const autoRolloverEnabled = await getAutoRolloverSetting()
  if (!autoRolloverEnabled) return

  // Check if current month already has budgets
  const { data: existingBudgets } = await supabase
    .from('monthly_budgets')
    .select('id')
    .eq('household_id', householdId)
    .eq('month', month)
    .limit(1)

  // If budgets already exist for this month, don't auto-rollover
  if (existingBudgets && existingBudgets.length > 0) return

  // Try to copy from previous month (silently fail if no previous month exists)
  try {
    await copyBudgetFromPreviousMonth(month)
  } catch (error) {
    // Silently ignore errors (e.g., no previous month budget exists)
    // This is expected for the first month of budgeting
  }
}

export async function getBudgetDataForWarnings(): Promise<{
  budgetMap: Map<string, number>
  spentMap: Map<string, number>
}> {
  const householdId = await getSession()
  if (!householdId) {
    return { budgetMap: new Map(), spentMap: new Map() }
  }

  // Note: Uses UTC timezone for current month calculation. This may be inaccurate
  // for users near day boundaries in timezones significantly offset from UTC.
  // Consider using a user-specific timezone setting for production use.
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

  // Get budgets for current month
  const budgets = await getMonthlyBudgets(currentMonth)
  const budgetMap = new Map(budgets.map((b) => [b.category_id, b.budgeted_amount]))

  // Get transactions for current month
  const { getTransactionsByMonth } = await import('./transactions')
  const transactions = await getTransactionsByMonth(currentMonth)

  // Calculate spent per category (only for transactions with valid category_id)
  const spentMap = new Map<string, number>()
  transactions
    .filter((t) => t.category_id != null) // Skip transactions without category_id
    .forEach((t) => {
      const current = spentMap.get(t.category_id) ?? 0
      spentMap.set(t.category_id, current + t.amount)
    })

  return { budgetMap, spentMap }
}
