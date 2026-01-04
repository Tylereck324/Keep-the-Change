'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import { getAutoRolloverSetting, getHouseholdTimezone } from '@/lib/actions/settings'
import { MonthlyBudget } from '@/lib/types'
import { validateMonth } from '@/lib/utils/validators'
import { dollarsToCents, centsToDollars } from '@/lib/utils/money'
import { getCurrentMonth } from '@/lib/utils/date'
import {
  setBudgetSchema,
  copyBudgetSchema,
  SetBudgetInput
} from '@/lib/schemas/budget'

export async function getMonthlyBudgets(month: string, endMonth?: string): Promise<MonthlyBudget[]> {
  validateMonth(month)
  if (endMonth) validateMonth(endMonth)

  const householdId = await getSession()
  if (!householdId) return []

  let query = supabaseAdmin
    .from('monthly_budgets')
    .select('*')
    .eq('household_id', householdId)

  // If endMonth provided, fetch range, otherwise fetch single month
  if (endMonth) {
    query = query.gte('month', month).lte('month', endMonth)
  } else {
    query = query.eq('month', month)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch monthly budgets: ${error.message}`)
  }

  return data ?? []
}

export async function setBudgetAmount(categoryId: string, month: string, amount: number): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate using Zod
  const validated = setBudgetSchema.parse({
    categoryId,
    month,
    amount
  })

  const { error } = await supabaseAdmin
    .from('monthly_budgets')
    .upsert(
      {
        household_id: householdId,
        categoryId: undefined, // remove undefined property to be safe or just use correct key
        category_id: validated.categoryId,
        month: validated.month,
        budgeted_amount: validated.amount,
        budgeted_amount_cents: dollarsToCents(validated.amount),
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

  // Validate using Zod
  const validated = copyBudgetSchema.parse({ targetMonth: currentMonth })
  const monthToUse = validated.targetMonth

  // Calculate previous month using proper date arithmetic
  const [yearStr, monthStr] = monthToUse.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)

  // Create date object for current month, then subtract 1 month
  const currentDate = new Date(year, month - 1, 1)
  currentDate.setMonth(currentDate.getMonth() - 1)

  const prevYear = currentDate.getFullYear()
  const prevMonth = currentDate.getMonth() + 1
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`

  // Get previous month's budgets
  const { data: prevBudgets, error: fetchError } = await supabaseAdmin
    .from('monthly_budgets')
    .select('category_id, budgeted_amount, budgeted_amount_cents')
    .eq('household_id', householdId)
    .eq('month', prevMonthStr)

  if (fetchError) {
    throw new Error(`Failed to fetch previous month budgets: ${fetchError.message}`)
  }

  if (!prevBudgets || prevBudgets.length === 0) {
    throw new Error('No budget found for previous month')
  }

  // Copy to current month
  const newBudgets = prevBudgets.map((b: { category_id: string; budgeted_amount: number; budgeted_amount_cents?: number }) => ({
    household_id: householdId,
    category_id: b.category_id,
    month: monthToUse,
    budgeted_amount: b.budgeted_amount,
    budgeted_amount_cents: b.budgeted_amount_cents ?? dollarsToCents(b.budgeted_amount),
  }))

  const { error } = await supabaseAdmin
    .from('monthly_budgets')
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
  const { data: existingBudgets } = await supabaseAdmin
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
  budgetMap: Record<string, number>
  spentMap: Record<string, number>
}> {
  const householdId = await getSession()
  if (!householdId) {
    return { budgetMap: {}, spentMap: {} }
  }

  const timezone = await getHouseholdTimezone()
  const currentMonth = getCurrentMonth(timezone)

  // Get budgets for current month
  const budgets = await getMonthlyBudgets(currentMonth)
  const budgetMapTemp = new Map(budgets.map((b) => [
    b.category_id,
    centsToDollars(b.budgeted_amount_cents ?? dollarsToCents(b.budgeted_amount))
  ]))

  // Get transactions for current month
  const { getTransactionsByMonth } = await import('./transactions')
  const transactions = await getTransactionsByMonth(currentMonth)

  // Calculate spent per category (only for expense transactions with valid category_id)
  // Exclude both income type and income category
  const spentMapTemp = new Map<string, number>()
  transactions
    .filter((t): t is typeof t & { category_id: string } =>
      t.category_id != null &&
      (t as { type?: string }).type !== 'income' &&
      t.category?.name?.toLowerCase() !== 'income'
    )
    .forEach((t) => {
      const amountCents = t.amount_cents ?? dollarsToCents(t.amount)
      const currentCents = spentMapTemp.get(t.category_id) ?? 0
      spentMapTemp.set(t.category_id, currentCents + amountCents)
    })

  // Convert back to dollars
  const spentMapDollars = new Map<string, number>()
  spentMapTemp.forEach((cents, catId) => {
    spentMapDollars.set(catId, centsToDollars(cents))
  })

  // Convert Maps to plain objects for client component serialization
  return {
    budgetMap: Object.fromEntries(budgetMapTemp),
    spentMap: Object.fromEntries(spentMapDollars),
  }
}
