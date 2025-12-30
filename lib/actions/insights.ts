'use server'

import { getSession } from '@/lib/auth'
import { getTransactions, TransactionWithCategory } from './transactions'

export interface MerchantInsight {
  merchant: string
  displayName: string
  totalSpent: number
  transactionCount: number
  averageAmount: number
  primaryCategory: {
    id: string
    name: string
    color: string
  } | null
  lastTransactionDate: string
}

export interface RecurringCharge {
  merchant: string
  displayName: string
  amount: number
  frequency: 'weekly' | 'monthly' | 'quarterly'
  estimatedMonthlyCost: number
  lastChargeDate: string
  transactionCount: number
  category: {
    id: string
    name: string
    color: string
  } | null
  isActive: boolean
}

// Helper to normalize merchant names for grouping
function normalizeMerchant(description: string | null): string {
  if (!description) return 'unknown'
  return description.trim().toLowerCase()
}

// Get the most common capitalization variant
function getMostCommonVariant(variants: string[]): string {
  const counts = new Map<string, number>()
  variants.forEach(v => {
    counts.set(v, (counts.get(v) || 0) + 1)
  })

  let maxCount = 0
  let mostCommon = variants[0] || 'Unknown'
  counts.forEach((count, variant) => {
    if (count > maxCount) {
      maxCount = count
      mostCommon = variant
    }
  })
  return mostCommon
}

// Get last N months as date range
function getLastNMonthsRange(n: number): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]

  const startMonth = new Date(now.getFullYear(), now.getMonth() - n + 1, 1)
  const startDate = startMonth.toISOString().split('T')[0]

  return { startDate, endDate }
}

export async function getMerchantInsights(): Promise<MerchantInsight[]> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Get last 6 months of expense transactions only (exclude income type and income category)
  const { startDate, endDate } = getLastNMonthsRange(6)
  const allTransactions = await getTransactions({ startDate, endDate })
  const isIncome = (t: typeof allTransactions[0]) =>
    t.type === 'income' || t.category?.name?.toLowerCase() === 'income'
  const transactions = allTransactions.filter(t => !isIncome(t))

  // Group by normalized merchant name
  const merchantGroups = new Map<string, TransactionWithCategory[]>()

  transactions.forEach(t => {
    const normalized = normalizeMerchant(t.description)
    const group = merchantGroups.get(normalized) || []
    group.push(t)
    merchantGroups.set(normalized, group)
  })

  // Build merchant insights
  const insights: MerchantInsight[] = []

  merchantGroups.forEach((transactions, normalized) => {
    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0)
    const transactionCount = transactions.length
    const averageAmount = totalSpent / transactionCount

    // Get display name (most common capitalization)
    const variants = transactions
      .map(t => t.description)
      .filter((d): d is string => d !== null)
    const displayName = variants.length > 0
      ? getMostCommonVariant(variants)
      : normalized

    // Find primary category (most frequently used)
    const categoryCounts = new Map<string, { count: number; category: TransactionWithCategory['category'] }>()
    transactions.forEach(t => {
      if (t.category) {
        const existing = categoryCounts.get(t.category.id)
        if (existing) {
          existing.count++
        } else {
          categoryCounts.set(t.category.id, { count: 1, category: t.category })
        }
      }
    })

    let primaryCategory: MerchantInsight['primaryCategory'] = null
    let maxCategoryCount = 0
    categoryCounts.forEach(({ count, category }) => {
      if (count > maxCategoryCount) {
        maxCategoryCount = count
        primaryCategory = category
      }
    })

    // Get last transaction date
    const sortedByDate = [...transactions].sort((a, b) =>
      b.date.localeCompare(a.date)
    )
    const lastTransactionDate = sortedByDate[0]?.date || ''

    insights.push({
      merchant: normalized,
      displayName,
      totalSpent,
      transactionCount,
      averageAmount,
      primaryCategory,
      lastTransactionDate,
    })
  })

  // Sort by total spent descending
  return insights.sort((a, b) => b.totalSpent - a.totalSpent)
}

export async function getRecurringCharges(): Promise<RecurringCharge[]> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Get last 6 months of expense transactions only (exclude income type and income category)
  const { startDate, endDate } = getLastNMonthsRange(6)
  const allTransactions = await getTransactions({ startDate, endDate })
  const isIncome = (t: typeof allTransactions[0]) =>
    t.type === 'income' || t.category?.name?.toLowerCase() === 'income'
  const transactions = allTransactions.filter(t => !isIncome(t))

  // Group by normalized merchant name
  const merchantGroups = new Map<string, TransactionWithCategory[]>()

  transactions.forEach(t => {
    const normalized = normalizeMerchant(t.description)
    const group = merchantGroups.get(normalized) || []
    group.push(t)
    merchantGroups.set(normalized, group)
  })

  const recurring: RecurringCharge[] = []
  const now = new Date()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  merchantGroups.forEach((transactions, normalized) => {
    // Need at least 2 transactions to detect a pattern
    if (transactions.length < 2) return

    // Get display name
    const variants = transactions
      .map(t => t.description)
      .filter((d): d is string => d !== null)
    const displayName = variants.length > 0
      ? getMostCommonVariant(variants)
      : normalized

    // Group transactions by similar amounts (within ±10%)
    const amountGroups: TransactionWithCategory[][] = []

    transactions.forEach(t => {
      let foundGroup = false
      for (const group of amountGroups) {
        const groupAmount = group[0].amount
        const tolerance = groupAmount * 0.1
        if (Math.abs(t.amount - groupAmount) <= tolerance) {
          group.push(t)
          foundGroup = true
          break
        }
      }
      if (!foundGroup) {
        amountGroups.push([t])
      }
    })

    // Check each amount group for recurring pattern
    for (const group of amountGroups) {
      if (group.length < 2) continue

      // Sort by date
      const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date))

      // Calculate intervals between transactions
      const intervals: number[] = []
      for (let i = 1; i < sorted.length; i++) {
        const prevDate = new Date(sorted[i - 1].date)
        const currDate = new Date(sorted[i].date)
        const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        intervals.push(daysDiff)
      }

      if (intervals.length === 0) continue

      // Calculate average interval
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length

      // Determine frequency based on average interval
      let frequency: RecurringCharge['frequency'] | null = null
      if (avgInterval >= 5 && avgInterval <= 9) {
        frequency = 'weekly'
      } else if (avgInterval >= 25 && avgInterval <= 35) {
        frequency = 'monthly'
      } else if (avgInterval >= 80 && avgInterval <= 100) {
        frequency = 'quarterly'
      }

      if (!frequency) continue

      // Check if there's been a recent charge (within last 60 days)
      const lastCharge = sorted[sorted.length - 1]
      const lastChargeDate = new Date(lastCharge.date)
      const isActive = lastChargeDate >= sixtyDaysAgo

      // Calculate average amount in this group
      const avgAmount = group.reduce((sum, t) => sum + t.amount, 0) / group.length

      // Calculate estimated monthly cost
      let estimatedMonthlyCost: number
      switch (frequency) {
        case 'weekly':
          estimatedMonthlyCost = avgAmount * 4.33
          break
        case 'monthly':
          estimatedMonthlyCost = avgAmount
          break
        case 'quarterly':
          estimatedMonthlyCost = avgAmount / 3
          break
      }

      // Get primary category
      const categoryCounts = new Map<string, { count: number; category: TransactionWithCategory['category'] }>()
      group.forEach(t => {
        if (t.category) {
          const existing = categoryCounts.get(t.category.id)
          if (existing) {
            existing.count++
          } else {
            categoryCounts.set(t.category.id, { count: 1, category: t.category })
          }
        }
      })

      let category: RecurringCharge['category'] = null
      let maxCount = 0
      categoryCounts.forEach(({ count, category: cat }) => {
        if (count > maxCount) {
          maxCount = count
          category = cat
        }
      })

      recurring.push({
        merchant: normalized,
        displayName,
        amount: Math.round(avgAmount * 100) / 100,
        frequency,
        estimatedMonthlyCost: Math.round(estimatedMonthlyCost * 100) / 100,
        lastChargeDate: lastCharge.date,
        transactionCount: group.length,
        category,
        isActive,
      })
    }
  })

  // Sort by estimated monthly cost descending, active first
  return recurring.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    return b.estimatedMonthlyCost - a.estimatedMonthlyCost
  })
}
