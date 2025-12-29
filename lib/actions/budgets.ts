'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { MonthlyBudget } from '@/lib/types'

export async function getMonthlyBudgets(month: string): Promise<MonthlyBudget[]> {
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

  // Validate month format (YYYY-MM)
  const monthRegex = /^\d{4}-\d{2}$/
  if (!monthRegex.test(currentMonth)) {
    throw new Error('Invalid month format. Expected YYYY-MM')
  }

  // Calculate previous month using proper date arithmetic
  const [yearStr, monthStr] = currentMonth.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)

  // Validate parsed values
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    throw new Error('Invalid month format. Expected YYYY-MM')
  }

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
