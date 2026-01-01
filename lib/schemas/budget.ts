/**
 * Zod schemas for budget validation.
 */
import { z } from 'zod'

// UUID regex pattern
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Custom UUID validator
const uuid = z.string().regex(uuidRegex, 'Must be a valid UUID')

// Month string validator (YYYY-MM)
const monthString = z.string()
    .regex(/^\d{4}-\d{2}$/, 'Invalid month format. Expected YYYY-MM')
    .refine((val) => {
        const [, monthStr] = val.split('-')
        const month = parseInt(monthStr, 10)
        return month >= 1 && month <= 12
    }, 'Month must be between 01 and 12')

/**
 * Schema for setting a budget amount
 */
export const setBudgetSchema = z.object({
    categoryId: uuid,
    month: monthString,
    amount: z.number()
        .finite('Budget amount must be a finite number')
        .nonnegative('Budget amount cannot be negative')
        .max(100_000_000, 'Budget amount exceeds maximum allowed value'),
})

/**
 * Schema for getting budgets for a month
 */
export const getBudgetsSchema = z.object({
    month: monthString,
})

/**
 * Schema for copying budgets
 */
export const copyBudgetSchema = z.object({
    targetMonth: monthString,
})

// Export types
export type SetBudgetInput = z.infer<typeof setBudgetSchema>
export type GetBudgetsInput = z.infer<typeof getBudgetsSchema>
