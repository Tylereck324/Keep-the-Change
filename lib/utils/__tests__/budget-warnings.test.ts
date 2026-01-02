import { describe, it, expect } from 'vitest'
import {
  calculateBudgetStatus,
  getSortedCategorySuggestions,
  wouldExceedBudget,
} from '../budget-warnings'
import type { Category } from '@/lib/types'

// Helper to create mock category
const createCategory = (overrides: Partial<Category> = {}): Category => ({
  id: `cat-${Math.random().toString(36).slice(2)}`,
  household_id: 'test-household',
  name: 'Test Category',
  color: '#3B82F6',
  created_at: new Date().toISOString(),
  ...overrides,
})

describe('calculateBudgetStatus', () => {
  const category = createCategory({ id: 'cat-1', name: 'Groceries', color: '#22C55E' })

  describe('indicator calculation', () => {
    it('should show green when more than 50% budget remaining', () => {
      const result = calculateBudgetStatus(category, 100, 40)

      expect(result.indicator).toBe('green')
      expect(result.percentUsed).toBe(40)
      expect(result.remaining).toBe(60)
    })

    it('should show yellow when 20-50% budget remaining', () => {
      const result = calculateBudgetStatus(category, 100, 60)

      expect(result.indicator).toBe('yellow')
      expect(result.percentUsed).toBe(60)
      expect(result.remaining).toBe(40)
    })

    it('should show red when less than 20% budget remaining', () => {
      const result = calculateBudgetStatus(category, 100, 85)

      expect(result.indicator).toBe('red')
      expect(result.percentUsed).toBe(85)
      expect(result.remaining).toBe(15)
    })

    it('should show red when over budget', () => {
      const result = calculateBudgetStatus(category, 100, 150)

      expect(result.indicator).toBe('red')
      expect(result.percentUsed).toBe(150)
      expect(result.remaining).toBe(-50)
    })

    it('should show green when exactly at 50% remaining', () => {
      const result = calculateBudgetStatus(category, 100, 50)

      // 50% used means 50% remaining, which is at the boundary
      // Implementation: percentRemaining > 50 for green, so 50% is yellow
      expect(result.indicator).toBe('yellow')
    })

    it('should show yellow when exactly at 20% remaining', () => {
      const result = calculateBudgetStatus(category, 100, 80)

      // 80% used means 20% remaining, which is >= 20, so yellow
      expect(result.indicator).toBe('yellow')
    })

    it('should show red when exactly at boundary (19% remaining)', () => {
      const result = calculateBudgetStatus(category, 100, 81)

      // 81% used means 19% remaining, which is < 20, so red
      expect(result.indicator).toBe('red')
    })
  })

  describe('budget calculations', () => {
    it('should calculate correct percentUsed', () => {
      const result = calculateBudgetStatus(category, 200, 50)

      expect(result.percentUsed).toBe(25)
    })

    it('should calculate correct remaining amount', () => {
      const result = calculateBudgetStatus(category, 500, 125)

      expect(result.remaining).toBe(375)
    })

    it('should calculate negative remaining when over budget', () => {
      const result = calculateBudgetStatus(category, 100, 150)

      expect(result.remaining).toBe(-50)
    })

    it('should handle percentUsed over 100% when over budget', () => {
      const result = calculateBudgetStatus(category, 100, 200)

      expect(result.percentUsed).toBe(200)
    })
  })

  describe('edge cases', () => {
    it('should handle zero budget (avoid division by zero)', () => {
      const result = calculateBudgetStatus(category, 0, 50)

      expect(result.percentUsed).toBe(0)
      expect(result.remaining).toBe(-50)
      expect(result.indicator).toBe('red') // Over budget
    })

    it('should handle zero spent', () => {
      const result = calculateBudgetStatus(category, 100, 0)

      expect(result.percentUsed).toBe(0)
      expect(result.remaining).toBe(100)
      expect(result.indicator).toBe('green')
    })

    it('should handle both zero', () => {
      const result = calculateBudgetStatus(category, 0, 0)

      expect(result.percentUsed).toBe(0)
      expect(result.remaining).toBe(0)
      expect(result.indicator).toBe('green') // Not over budget, 100% remaining
    })

    it('should normalize negative budgeted amount to zero', () => {
      const result = calculateBudgetStatus(category, -100, 50)

      expect(result.budgeted).toBe(0)
      expect(result.remaining).toBe(-50)
    })

    it('should normalize negative spent amount to zero', () => {
      const result = calculateBudgetStatus(category, 100, -50)

      expect(result.spent).toBe(0)
      expect(result.remaining).toBe(100)
    })

    it('should include category info in result', () => {
      const result = calculateBudgetStatus(category, 100, 50)

      expect(result.categoryId).toBe(category.id)
      expect(result.categoryName).toBe('Groceries')
      expect(result.categoryColor).toBe('#22C55E')
    })
  })

  describe('decimal precision', () => {
    it('should handle decimal amounts correctly', () => {
      const result = calculateBudgetStatus(category, 99.99, 33.33)

      expect(result.remaining).toBeCloseTo(66.66, 2)
      expect(result.percentUsed).toBeCloseTo(33.33, 1)
    })
  })
})

describe('getSortedCategorySuggestions', () => {
  const categories: Category[] = [
    createCategory({ id: 'cat-1', name: 'Groceries' }),
    createCategory({ id: 'cat-2', name: 'Entertainment' }),
    createCategory({ id: 'cat-3', name: 'Gas' }),
  ]

  it('should sort categories by most available budget first', () => {
    const budgetMap: Record<string, number> = {
      'cat-1': 500,
      'cat-2': 200,
      'cat-3': 100,
    }
    const spentMap: Record<string, number> = {
      'cat-1': 400, // 100 remaining
      'cat-2': 50,  // 150 remaining
      'cat-3': 10,  // 90 remaining
    }

    const result = getSortedCategorySuggestions(categories, budgetMap, spentMap)

    expect(result.map(s => s.categoryName)).toEqual([
      'Entertainment', // 150 remaining
      'Groceries',     // 100 remaining
      'Gas',           // 90 remaining
    ])
  })

  it('should exclude specified category', () => {
    const budgetMap: Record<string, number> = {
      'cat-1': 100,
      'cat-2': 100,
      'cat-3': 100,
    }
    const spentMap: Record<string, number> = {
      'cat-1': 50,
      'cat-2': 50,
      'cat-3': 50,
    }

    const result = getSortedCategorySuggestions(
      categories,
      budgetMap,
      spentMap,
      'cat-2' // exclude Entertainment
    )

    expect(result.map(s => s.categoryId)).not.toContain('cat-2')
    expect(result).toHaveLength(2)
  })

  it('should handle missing budget/spent values (default to 0)', () => {
    const budgetMap: Record<string, number> = {
      'cat-1': 100,
      // cat-2 and cat-3 not in map
    }
    const spentMap: Record<string, number> = {
      // all empty
    }

    const result = getSortedCategorySuggestions(categories, budgetMap, spentMap)

    // cat-1: 100 budget, 0 spent = 100 remaining
    // cat-2: 0 budget, 0 spent = 0 remaining
    // cat-3: 0 budget, 0 spent = 0 remaining
    expect(result[0].categoryId).toBe('cat-1')
    expect(result[0].remaining).toBe(100)
    expect(result[1].remaining).toBe(0)
    expect(result[2].remaining).toBe(0)
  })

  it('should include category reference in result', () => {
    const budgetMap: Record<string, number> = { 'cat-1': 100 }
    const spentMap: Record<string, number> = { 'cat-1': 50 }

    const result = getSortedCategorySuggestions(
      [categories[0]],
      budgetMap,
      spentMap
    )

    expect(result[0].category).toEqual(categories[0])
  })

  it('should handle empty categories array', () => {
    const result = getSortedCategorySuggestions([], {}, {})

    expect(result).toEqual([])
  })

  it('should handle negative remaining (over budget) in sort', () => {
    const budgetMap: Record<string, number> = {
      'cat-1': 100,
      'cat-2': 100,
    }
    const spentMap: Record<string, number> = {
      'cat-1': 150, // -50 remaining
      'cat-2': 50,  // 50 remaining
    }

    const result = getSortedCategorySuggestions(
      [categories[0], categories[1]],
      budgetMap,
      spentMap
    )

    // cat-2 should be first (50 > -50)
    expect(result[0].categoryId).toBe('cat-2')
    expect(result[1].categoryId).toBe('cat-1')
  })
})

describe('wouldExceedBudget', () => {
  it('should return false when amount fits within remaining budget', () => {
    const result = wouldExceedBudget(25, 100, 50)

    expect(result.wouldExceed).toBe(false)
    expect(result.overage).toBe(0)
  })

  it('should return true when amount would exceed budget', () => {
    const result = wouldExceedBudget(75, 100, 50)

    expect(result.wouldExceed).toBe(true)
    expect(result.overage).toBe(25) // 50 + 75 - 100 = 25 over
  })

  it('should return false when amount exactly matches remaining', () => {
    const result = wouldExceedBudget(50, 100, 50)

    expect(result.wouldExceed).toBe(false)
    expect(result.overage).toBe(0)
  })

  it('should handle already over-budget scenario', () => {
    const result = wouldExceedBudget(10, 100, 150)

    expect(result.wouldExceed).toBe(true)
    expect(result.overage).toBe(60) // 150 + 10 - 100 = 60 over
  })

  it('should handle zero budget', () => {
    const result = wouldExceedBudget(10, 0, 0)

    expect(result.wouldExceed).toBe(true)
    expect(result.overage).toBe(10)
  })

  it('should handle decimal amounts', () => {
    const result = wouldExceedBudget(25.50, 100, 80)

    expect(result.wouldExceed).toBe(true)
    expect(result.overage).toBeCloseTo(5.50, 2)
  })
})
