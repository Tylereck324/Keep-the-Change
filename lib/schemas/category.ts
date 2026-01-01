/**
 * Zod schemas for category validation.
 */
import { z } from 'zod'

// UUID regex pattern
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Custom UUID validator
const uuid = z.string().regex(uuidRegex, 'Must be a valid UUID')

// Hex color validator
const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #FF5733)')

/**
 * Schema for creating a category
 */
export const createCategorySchema = z.object({
    name: z.string()
        .min(1, 'Category name cannot be empty')
        .max(100, 'Category name must be 100 characters or less')
        .transform((val) => val.trim()),
    color: hexColor,
})

/**
 * Schema for updating a category
 */
export const updateCategorySchema = createCategorySchema.extend({
    id: uuid,
})

/**
 * Schema for deleting a category
 */
export const deleteCategorySchema = z.object({
    id: uuid,
})

// Export types
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
