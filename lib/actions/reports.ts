'use server'

import { getSession } from '@/lib/auth'
import { getTransactions } from './transactions'
import { getCategories } from './categories'
import { getMonthlyBudgets } from './budgets'

import { isIncomeTransaction } from '@/lib/utils/transaction-helpers'
import { dollarsToCents, centsToDollars, addCents } from '@/lib/utils/money'

export interface CategoryReport {
  categoryId: string
  categoryName: string
  categoryColor: string
  budgeted: number
  spent: number
  remaining: number
  percentUsed: number
  transactionCount: number
}

export interface MonthlyReport {
  month: string
  totalBudgeted: number
  totalIncome: number
  totalSpent: number
  totalRemaining: number
  netCashFlow: number
  savingsRate: number
  categories: CategoryReport[]
  transactionsByDay: { date: string; amount: number }[]
  topTransactions: Array<{ id: string; amount: number; description: string; date: string; categoryName: string }>
}

export interface TrendData {
  month: string
  spent: number
  budgeted: number
}

export async function getMonthlyReport(month: string): Promise<MonthlyReport> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const [categories, budgets, allTransactions] = await Promise.all([
    getCategories(),
    getMonthlyBudgets(month),
    getTransactions({ startDate: `${month}-01`, endDate: `${month}-31` }),
  ])

  // Separate income and expenses
  const incomeTransactions = allTransactions.filter(isIncomeTransaction)
  const expenseTransactions = allTransactions.filter(t => !isIncomeTransaction(t))

  const budgetMap = new Map(budgets.map((b) => [
    b.category_id,
    b.budgeted_amount_cents ?? dollarsToCents(b.budgeted_amount)
  ]))
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  // Calculate spending by category (expenses only)
  const categorySpending = new Map<string, number>()
  const categoryTransactionCount = new Map<string, number>()

  expenseTransactions.forEach((t) => {
    if (t.category_id) {
      const amountCents = t.amount_cents ?? dollarsToCents(t.amount)
      categorySpending.set(t.category_id, (categorySpending.get(t.category_id) || 0) + amountCents)
      categoryTransactionCount.set(t.category_id, (categoryTransactionCount.get(t.category_id) || 0) + 1)
    }
  })

  // Build category reports
  const categoryReports: CategoryReport[] = categories.map((cat) => {
    const budgetedCents = budgetMap.get(cat.id) || 0
    const spentCents = categorySpending.get(cat.id) || 0
    const remainingCents = budgetedCents - spentCents
    const percentUsed = budgetedCents > 0 ? (spentCents / budgetedCents) * 100 : 0

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      categoryColor: cat.color,
      budgeted: centsToDollars(budgetedCents),
      spent: centsToDollars(spentCents),
      remaining: centsToDollars(remainingCents),
      percentUsed,
      transactionCount: categoryTransactionCount.get(cat.id) || 0,
    }
  })

  // Calculate daily spending (expenses only) - Using Cents internally
  const dailySpending = new Map<string, number>()
  expenseTransactions.forEach((t) => {
    const date = t.date
    const amountCents = t.amount_cents ?? dollarsToCents(t.amount)
    dailySpending.set(date, (dailySpending.get(date) || 0) + amountCents)
  })

  // Convert daily spending back to dollars for charts
  const transactionsByDay = Array.from(dailySpending.entries())
    .map(([date, amountCents]) => ({ date, amount: centsToDollars(amountCents) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Top transactions (expenses only)
  const topTransactions = expenseTransactions
    .sort((a, b) => (b.amount_cents ?? dollarsToCents(b.amount)) - (a.amount_cents ?? dollarsToCents(a.amount)))
    .slice(0, 10)
    .map((t) => ({
      id: t.id,
      amount: centsToDollars(t.amount_cents ?? dollarsToCents(t.amount)), // Normalize to dollars from cents
      description: t.description || 'No description',
      date: t.date,
      categoryName: t.category?.name || 'Uncategorized',
    }))

  const totalBudgetedCents = budgets.reduce((sum, b) => sum + (b.budgeted_amount_cents ?? dollarsToCents(b.budgeted_amount)), 0)
  const totalIncomeCents = incomeTransactions.reduce((sum, t) => sum + (t.amount_cents ?? dollarsToCents(t.amount)), 0)
  const totalSpentCents = expenseTransactions.reduce((sum, t) => sum + (t.amount_cents ?? dollarsToCents(t.amount)), 0)
  const totalRemainingCents = totalBudgetedCents - totalSpentCents
  const netCashFlowCents = totalIncomeCents - totalSpentCents

  // Ratios match regardless of units
  const savingsRate = totalIncomeCents > 0 ? (netCashFlowCents / totalIncomeCents) * 100 : 0

  return {
    month,
    totalBudgeted: centsToDollars(totalBudgetedCents),
    totalIncome: centsToDollars(totalIncomeCents),
    totalSpent: centsToDollars(totalSpentCents),
    totalRemaining: centsToDollars(totalRemainingCents),
    netCashFlow: centsToDollars(netCashFlowCents),
    savingsRate,
    categories: categoryReports,
    transactionsByDay,
    topTransactions,
  }
}

export async function getMultiMonthTrend(months: string[]): Promise<TrendData[]> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  if (months.length === 0) return []

  // Sort months to get date range
  const sortedMonths = [...months].sort()
  const startMonth = sortedMonths[0]
  const endMonth = sortedMonths[sortedMonths.length - 1]

  // Fetch all data in bulk with single queries
  const [allBudgets, allTransactions] = await Promise.all([
    getMonthlyBudgets(startMonth, endMonth),
    getTransactions({
      startDate: `${startMonth}-01`,
      endDate: `${endMonth}-31`
    }),
  ])

  // Filter out income
  const expenses = allTransactions.filter(t => !isIncomeTransaction(t))

  // Group budgets by month
  const budgetsByMonth = new Map<string, number>()
  allBudgets.forEach((b) => {
    const amt = b.budgeted_amount_cents ?? dollarsToCents(b.budgeted_amount)
    budgetsByMonth.set(b.month, (budgetsByMonth.get(b.month) || 0) + amt)
  })

  // Group expenses by month (extract YYYY-MM from date)
  const expensesByMonth = new Map<string, number>()
  expenses.forEach((t) => {
    const month = t.date.slice(0, 7) // Extract YYYY-MM
    const amt = t.amount_cents ?? dollarsToCents(t.amount)
    expensesByMonth.set(month, (expensesByMonth.get(month) || 0) + amt)
  })

  // Build result for each requested month
  const data = months.map((month) => ({
    month,
    spent: centsToDollars(expensesByMonth.get(month) || 0),
    budgeted: centsToDollars(budgetsByMonth.get(month) || 0),
  }))

  return data.sort((a, b) => a.month.localeCompare(b.month))
}

export async function getForecast(currentMonth: string): Promise<{
  projectedSpending: number
  daysRemaining: number
  averageDailySpend: number
  projectedOverUnder: number
}> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const [budgets, allTransactions] = await Promise.all([
    getMonthlyBudgets(currentMonth),
    getTransactions({ startDate: `${currentMonth}-01`, endDate: `${currentMonth}-31` }),
  ])

  // Filter out income
  const expenses = allTransactions.filter(t => !isIncomeTransaction(t))

  const totalBudgetedCents = budgets.reduce((sum, b) => sum + (b.budgeted_amount_cents ?? dollarsToCents(b.budgeted_amount)), 0)
  const totalSpentCents = expenses.reduce((sum, t) => sum + (t.amount_cents ?? dollarsToCents(t.amount)), 0)

  // Calculate days in month and days passed
  const [year, month] = currentMonth.split('-').map(Number)
  // use 0 for day to get last day of previous month, wait... month is 1-indexed in split?
  // standard js date month is 0-indexed.
  // const [year, month] = '2024-02'.split('-') -> year=2024, month=2
  // new Date(2024, 2, 0) -> last day of month 1 (Feb). Correct.
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date()
  const currentDay = today.getMonth() === month - 1 && today.getFullYear() === year ? today.getDate() : daysInMonth
  const daysRemaining = daysInMonth - currentDay

  const averageDailySpendCents = currentDay > 0 ? totalSpentCents / currentDay : 0
  const projectedSpendingCents = totalSpentCents + averageDailySpendCents * daysRemaining
  const projectedOverUnderCents = totalBudgetedCents - projectedSpendingCents

  return {
    projectedSpending: centsToDollars(projectedSpendingCents),
    daysRemaining,
    averageDailySpend: centsToDollars(averageDailySpendCents),
    projectedOverUnder: centsToDollars(projectedOverUnderCents),
  }
}

export async function getYearSummary(year: number): Promise<{
  totalBudgeted: number
  totalSpent: number
  totalSaved: number
  averageMonthlySpend: number
  highestSpendMonth: { month: string; amount: number }
  lowestSpendMonth: { month: string; amount: number }
  categoryTotals: Array<{ name: string; color: string; total: number }>
}> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const months = Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, '0')}`
  )

  // Fetch all data for the year in bulk (2 queries instead of 24+)
  const [categories, yearBudgets, yearTransactions] = await Promise.all([
    getCategories(),
    getMonthlyBudgets(`${year}-01`, `${year}-12`),
    getTransactions({
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    }),
  ])

  // Filter out income
  const expenses = yearTransactions.filter(t => !isIncomeTransaction(t))

  // Group budgets by month
  const budgetsByMonth = new Map<string, number>()
  yearBudgets.forEach((b) => {
    budgetsByMonth.set(b.month, (budgetsByMonth.get(b.month) || 0) + b.budgeted_amount)
  })

  // Group expenses by month
  const expensesByMonth = new Map<string, number>()
  expenses.forEach((t) => {
    const month = t.date.slice(0, 7) // Extract YYYY-MM
    expensesByMonth.set(month, (expensesByMonth.get(month) || 0) + t.amount)
  })

  // Build monthly data - IN CENTS
  const monthlyDataCents = months.map((month) => ({
    month,
    budgeted: budgetsByMonth.get(month) || 0,
    spent: expensesByMonth.get(month) || 0,
  }))

  const totalBudgetedCents = monthlyDataCents.reduce((sum, m) => sum + m.budgeted, 0)
  const totalSpentCents = monthlyDataCents.reduce((sum, m) => sum + m.spent, 0)
  const totalSavedCents = totalBudgetedCents - totalSpentCents
  const averageMonthlySpendCents = totalSpentCents / 12

  const monthsWithSpending = monthlyDataCents.filter((m) => m.spent > 0)
  const highestSpendMonth =
    monthsWithSpending.length > 0
      ? monthsWithSpending.reduce((max, m) => (m.spent > max.spent ? m : max))
      : { month: months[0], spent: 0 }
  const lowestSpendMonth =
    monthsWithSpending.length > 0
      ? monthsWithSpending.reduce((min, m) => (m.spent < min.spent ? m : min))
      : { month: months[0], spent: 0 }

  // Calculate category totals from all expenses
  const categoryTotals = new Map<string, number>()
  expenses.forEach((t) => {
    if (t.category_id) {
      const amt = t.amount_cents ?? dollarsToCents(t.amount)
      categoryTotals.set(t.category_id, (categoryTotals.get(t.category_id) || 0) + amt)
    }
  })

  const categoryTotalsArray = categories
    .map((cat) => ({
      name: cat.name,
      color: cat.color,
      total: centsToDollars(categoryTotals.get(cat.id) || 0),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)

  return {
    totalBudgeted: centsToDollars(totalBudgetedCents),
    totalSpent: centsToDollars(totalSpentCents),
    totalSaved: centsToDollars(totalSavedCents),
    averageMonthlySpend: centsToDollars(averageMonthlySpendCents),
    highestSpendMonth: { month: highestSpendMonth.month, amount: centsToDollars(highestSpendMonth.spent) },
    lowestSpendMonth: { month: lowestSpendMonth.month, amount: centsToDollars(lowestSpendMonth.spent) },
    categoryTotals: categoryTotalsArray,
  }
}
