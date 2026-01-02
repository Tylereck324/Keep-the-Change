import { Category } from '@/lib/types'

/**
 * Budget status for a single category.
 */
export type BudgetStatus = {
  categoryId: string
  categoryName: string
  categoryColor: string
  /** Budgeted amount for the month */
  budgeted: number
  /** Amount spent so far */
  spent: number
  /** Remaining budget (can be negative if over) */
  remaining: number
  /** Percentage of budget used (can exceed 100) */
  percentUsed: number
  /** Visual indicator: green (>50% left), yellow (20-50% left), red (<20% or over) */
  indicator: 'green' | 'yellow' | 'red'
}

/**
 * Budget status with full category details, used for suggestions.
 */
export type CategorySuggestion = BudgetStatus & {
  category: Category
}

/**
 * Calculate budget status for a single category.
 *
 * Indicator logic:
 * - Green: >50% of budget remaining
 * - Yellow: 20-50% of budget remaining
 * - Red: <20% remaining OR over budget
 *
 * @param category - The category to calculate status for
 * @param budgeted - Budgeted amount for the period
 * @param spent - Amount spent so far
 * @returns Budget status with calculations and indicator
 */
export function calculateBudgetStatus(
  category: Category,
  budgeted: number,
  spent: number
): BudgetStatus {
  // Handle negative amounts - treat as zero
  const normalizedBudgeted = Math.max(0, budgeted)
  const normalizedSpent = Math.max(0, spent)

  const remaining = normalizedBudgeted - normalizedSpent
  const percentUsed = normalizedBudgeted > 0 ? (normalizedSpent / normalizedBudgeted) * 100 : 0

  let indicator: 'green' | 'yellow' | 'red'

  // Explicit over-budget handling
  if (normalizedSpent > normalizedBudgeted) {
    // Over budget - always red
    indicator = 'red'
  } else {
    // Within budget - check percentage remaining
    const percentRemaining = 100 - percentUsed

    if (percentRemaining > 50) {
      indicator = 'green'
    } else if (percentRemaining >= 20) {
      indicator = 'yellow'
    } else {
      indicator = 'red'
    }
  }

  return {
    categoryId: category.id,
    categoryName: category.name,
    categoryColor: category.color,
    budgeted: normalizedBudgeted,
    spent: normalizedSpent,
    remaining,
    percentUsed,
    indicator,
  }
}

/**
 * Get categories sorted by available budget (most available first).
 *
 * Useful for suggesting which category to use when adding a transaction.
 *
 * @param categories - All categories
 * @param budgetMap - Map of category ID to budgeted amount
 * @param spentMap - Map of category ID to spent amount
 * @param excludeCategoryId - Optional category ID to exclude from results
 * @returns Sorted array of category suggestions
 */
export function getSortedCategorySuggestions(
  categories: Category[],
  budgetMap: Record<string, number>,
  spentMap: Record<string, number>,
  excludeCategoryId?: string
): CategorySuggestion[] {
  return categories
    .filter((cat) => cat.id !== excludeCategoryId)
    .map((cat) => {
      const budgeted = budgetMap[cat.id] ?? 0
      const spent = spentMap[cat.id] ?? 0
      const status = calculateBudgetStatus(cat, budgeted, spent)

      return {
        ...status,
        category: cat,
      }
    })
    .sort((a, b) => b.remaining - a.remaining) // Sort by most available first
}

/**
 * Check if adding an amount to a category would exceed its budget.
 *
 * @param amount - Amount to potentially add
 * @param budgeted - Total budgeted for the category
 * @param spent - Amount already spent
 * @returns Whether budget would be exceeded and by how much
 *
 * @example
 * ```typescript
 * const { wouldExceed, overage } = wouldExceedBudget(50, 100, 75)
 * if (wouldExceed) {
 *   console.warn(`Would go over budget by $${overage}`)
 * }
 * ```
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
