'use server'

import { getSession } from '@/lib/auth'
import { getTransactions } from './transactions'
import { getCategories } from './categories'
import { getMonthlyBudgets } from './budgets'

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

  // Separate income and expenses (check type OR category name)
  const isIncome = (t: typeof allTransactions[0]) =>
    t.type === 'income' || t.category?.name?.toLowerCase() === 'income'

  const incomeTransactions = allTransactions.filter(isIncome)
  const expenseTransactions = allTransactions.filter(t => !isIncome(t))

  const budgetMap = new Map(budgets.map((b) => [b.category_id, b.budgeted_amount]))
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  // Calculate spending by category (expenses only)
  const categorySpending = new Map<string, number>()
  const categoryTransactionCount = new Map<string, number>()

  expenseTransactions.forEach((t) => {
    if (t.category_id) {
      categorySpending.set(t.category_id, (categorySpending.get(t.category_id) || 0) + t.amount)
      categoryTransactionCount.set(t.category_id, (categoryTransactionCount.get(t.category_id) || 0) + 1)
    }
  })

  // Build category reports
  const categoryReports: CategoryReport[] = categories.map((cat) => {
    const budgeted = budgetMap.get(cat.id) || 0
    const spent = categorySpending.get(cat.id) || 0
    const remaining = budgeted - spent
    const percentUsed = budgeted > 0 ? (spent / budgeted) * 100 : 0

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      categoryColor: cat.color,
      budgeted,
      spent,
      remaining,
      percentUsed,
      transactionCount: categoryTransactionCount.get(cat.id) || 0,
    }
  })

  // Calculate daily spending (expenses only)
  const dailySpending = new Map<string, number>()
  expenseTransactions.forEach((t) => {
    const date = t.date
    dailySpending.set(date, (dailySpending.get(date) || 0) + t.amount)
  })

  const transactionsByDay = Array.from(dailySpending.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Top transactions (expenses only)
  const topTransactions = expenseTransactions
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
    .map((t) => ({
      id: t.id,
      amount: t.amount,
      description: t.description || 'No description',
      date: t.date,
      categoryName: t.category?.name || 'Uncategorized',
    }))

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgeted_amount, 0)
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0)
  const totalSpent = expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
  const totalRemaining = totalBudgeted - totalSpent
  const netCashFlow = totalIncome - totalSpent
  const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0

  return {
    month,
    totalBudgeted,
    totalIncome,
    totalSpent,
    totalRemaining,
    netCashFlow,
    savingsRate,
    categories: categoryReports,
    transactionsByDay,
    topTransactions,
  }
}

export async function getMultiMonthTrend(months: string[]): Promise<TrendData[]> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const data = await Promise.all(
    months.map(async (month) => {
      const [budgets, transactions] = await Promise.all([
        getMonthlyBudgets(month),
        getTransactions({ startDate: `${month}-01`, endDate: `${month}-31` }),
      ])

      const budgeted = budgets.reduce((sum, b) => sum + b.budgeted_amount, 0)
      const spent = transactions.reduce((sum, t) => sum + t.amount, 0)

      return { month, spent, budgeted }
    })
  )

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

  const [budgets, transactions] = await Promise.all([
    getMonthlyBudgets(currentMonth),
    getTransactions({ startDate: `${currentMonth}-01`, endDate: `${currentMonth}-31` }),
  ])

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgeted_amount, 0)
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0)

  // Calculate days in month and days passed
  const [year, month] = currentMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date()
  const currentDay = today.getMonth() === month - 1 && today.getFullYear() === year ? today.getDate() : daysInMonth
  const daysRemaining = daysInMonth - currentDay

  const averageDailySpend = currentDay > 0 ? totalSpent / currentDay : 0
  const projectedSpending = totalSpent + averageDailySpend * daysRemaining
  const projectedOverUnder = totalBudgeted - projectedSpending

  return {
    projectedSpending,
    daysRemaining,
    averageDailySpend,
    projectedOverUnder,
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

  const [categories, monthlyData] = await Promise.all([
    getCategories(),
    Promise.all(
      months.map(async (month) => {
        const [budgets, transactions] = await Promise.all([
          getMonthlyBudgets(month),
          getTransactions({ startDate: `${month}-01`, endDate: `${month}-31` }),
        ])

        const budgeted = budgets.reduce((sum, b) => sum + b.budgeted_amount, 0)
        const spent = transactions.reduce((sum, t) => sum + t.amount, 0)

        return { month, budgeted, spent, transactions }
      })
    ),
  ])

  const totalBudgeted = monthlyData.reduce((sum, m) => sum + m.budgeted, 0)
  const totalSpent = monthlyData.reduce((sum, m) => sum + m.spent, 0)
  const totalSaved = totalBudgeted - totalSpent
  const averageMonthlySpend = totalSpent / 12

  const monthsWithSpending = monthlyData.filter((m) => m.spent > 0)
  const highestSpendMonth =
    monthsWithSpending.length > 0
      ? monthsWithSpending.reduce((max, m) => (m.spent > max.spent ? m : max))
      : { month: months[0], spent: 0 }
  const lowestSpendMonth =
    monthsWithSpending.length > 0
      ? monthsWithSpending.reduce((min, m) => (m.spent < min.spent ? m : min))
      : { month: months[0], spent: 0 }

  // Calculate category totals
  const categoryTotals = new Map<string, number>()
  monthlyData.forEach((m) => {
    m.transactions.forEach((t) => {
      if (t.category_id) {
        categoryTotals.set(t.category_id, (categoryTotals.get(t.category_id) || 0) + t.amount)
      }
    })
  })

  const categoryTotalsArray = categories
    .map((cat) => ({
      name: cat.name,
      color: cat.color,
      total: categoryTotals.get(cat.id) || 0,
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)

  return {
    totalBudgeted,
    totalSpent,
    totalSaved,
    averageMonthlySpend,
    highestSpendMonth: { month: highestSpendMonth.month, amount: highestSpendMonth.spent },
    lowestSpendMonth: { month: lowestSpendMonth.month, amount: lowestSpendMonth.spent },
    categoryTotals: categoryTotalsArray,
  }
}
