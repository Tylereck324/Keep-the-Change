import { Category } from '@/lib/types'

export type BudgetStatus = {
  categoryId: string
  categoryName: string
  categoryColor: string
  budgeted: number
  spent: number
  remaining: number
  percentUsed: number
  indicator: 'green' | 'yellow' | 'red'
}

export type CategorySuggestion = BudgetStatus & {
  category: Category
}

/**
 * Calculate budget status for a single category
 */
export function calculateBudgetStatus(
  category: Category,
  budgeted: number,
  spent: number
): BudgetStatus {
  const remaining = budgeted - spent
  const percentUsed = budgeted > 0 ? (spent / budgeted) * 100 : 0

  let indicator: 'green' | 'yellow' | 'red'
  const percentRemaining = 100 - percentUsed

  if (percentRemaining > 50) {
    indicator = 'green'
  } else if (percentRemaining >= 20) {
    indicator = 'yellow'
  } else {
    indicator = 'red'
  }

  return {
    categoryId: category.id,
    categoryName: category.name,
    categoryColor: category.color,
    budgeted,
    spent,
    remaining,
    percentUsed,
    indicator,
  }
}

/**
 * Get sorted category suggestions (most available budget first)
 */
export function getSortedCategorySuggestions(
  categories: Category[],
  budgetMap: Map<string, number>,
  spentMap: Map<string, number>,
  excludeCategoryId?: string
): CategorySuggestion[] {
  return categories
    .filter((cat) => cat.id !== excludeCategoryId)
    .map((cat) => {
      const budgeted = budgetMap.get(cat.id) ?? 0
      const spent = spentMap.get(cat.id) ?? 0
      const status = calculateBudgetStatus(cat, budgeted, spent)

      return {
        ...status,
        category: cat,
      }
    })
    .sort((a, b) => b.remaining - a.remaining) // Sort by most available first
}

/**
 * Check if adding amount to category would exceed budget
 */
export function wouldExceedBudget(
  amount: number,
  budgeted: number,
  spent: number
): { wouldExceed: boolean; overage: number } {
  const newSpent = spent + amount
  const wouldExceed = newSpent > budgeted
  const overage = wouldExceed ? newSpent - budgeted : 0

  return { wouldExceed, overage }
}
