/**
 * Zod schemas for transaction validation.
 * 
 * These schemas provide runtime type checking and validation
 * at API boundaries.
 */
import { z } from 'zod'

// UUID regex pattern
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Custom UUID validator
const uuid = z.string().regex(uuidRegex, 'Must be a valid UUID')

// Date string validator (YYYY-MM-DD)
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD')

// Month string validator (YYYY-MM)
const monthString = z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format. Expected YYYY-MM')

/**
 * Schema for creating a transaction
 */
export const createTransactionSchema = z.object({
    categoryId: uuid.optional(),
    amount: z.number()
        .finite('Amount must be a finite number')
        .positive('Amount must be positive')
        .max(100_000_000, 'Amount exceeds maximum allowed value'),
    description: z.string()
        .max(100, 'Description must be 100 characters or less')
        .optional(),
    date: dateString,
    type: z.enum(['income', 'expense']).default('expense'),
    isRefund: z.boolean().optional(),
    idempotencyKey: z.string().optional(),
}).refine(
    (data) => {
        // Category required for expenses that aren't refunds
        if (data.type === 'expense' && !data.isRefund && !data.categoryId) {
            return false
        }
        return true
    },
    { message: 'Category is required for expenses', path: ['categoryId'] }
)

/**
 * Schema for updating a transaction
 */
export const updateTransactionSchema = createTransactionSchema.extend({
    id: uuid,
})

/**
 * Schema for transaction filters
 */
export const transactionFiltersSchema = z.object({
    categoryId: uuid.optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    type: z.enum(['income', 'expense']).optional(),
}).refine(
    (data) => {
        if (data.startDate && data.endDate && data.startDate > data.endDate) {
            return false
        }
        return true
    },
    { message: 'Start date must be before end date' }
)

/**
 * Schema for month parameter
 */
export const monthParamSchema = z.object({
    month: monthString,
})

// Export types for use in server actions
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>
