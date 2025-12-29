'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function getMonthlyBudgets(month: string) {
  const householdId = await getSession()
  if (!householdId) return []

  const { data } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('household_id', householdId)
    .eq('month', month)

  return data ?? []
}

export async function setBudgetAmount(categoryId: string, month: string, amount: number) {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('monthly_budgets')
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

export async function copyBudgetFromPreviousMonth(currentMonth: string) {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Calculate previous month
  const [year, month] = currentMonth.split('-').map(Number)
  const prevDate = new Date(year, month - 2, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  // Get previous month's budgets
  const { data: prevBudgets } = await supabase
    .from('monthly_budgets')
    .select('category_id, budgeted_amount')
    .eq('household_id', householdId)
    .eq('month', prevMonth)

  if (!prevBudgets || prevBudgets.length === 0) {
    throw new Error('No budget found for previous month')
  }

  // Copy to current month
  const newBudgets = prevBudgets.map((b) => ({
    household_id: householdId,
    category_id: b.category_id,
    month: currentMonth,
    budgeted_amount: b.budgeted_amount,
  }))

  const { error } = await supabase
    .from('monthly_budgets')
    .upsert(newBudgets, { onConflict: 'household_id,category_id,month' })

  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/budget')
}
