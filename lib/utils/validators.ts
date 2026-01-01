/**
 * Shared validation utilities for server actions.
 * Consolidated from transactions.ts, categories.ts, and budgets.ts
 */

// ============================================================================
// Constants
// ============================================================================

export const LIMITS = {
    MAX_AMOUNT: 100_000_000,
    MAX_DESCRIPTION_LENGTH: 100,
    MAX_CATEGORY_NAME_LENGTH: 100,
    MAX_KEYWORD_LENGTH: 100,
    PIN_MIN_LENGTH: 4,
    PIN_MAX_LENGTH: 6,
} as const

// ============================================================================
// Amount Validation
// ============================================================================

/**
 * Validates that an amount is a valid positive number within limits.
 * @throws Error if validation fails
 */
export function validateAmount(amount: number): void {
    if (!Number.isFinite(amount)) {
        throw new Error('Amount must be a valid number')
    }
    if (amount <= 0) {
        throw new Error('Amount must be positive')
    }
    if (amount > LIMITS.MAX_AMOUNT) {
        throw new Error('Amount exceeds maximum allowed value')
    }
}

// ============================================================================
// Date Validation
// ============================================================================

/**
 * Validates that a month string is in YYYY-MM format.
 * @throws Error if validation fails
 */
export function validateMonth(month: string): void {
    const monthRegex = /^\d{4}-\d{2}$/
    if (!monthRegex.test(month)) {
        throw new Error('Invalid month format. Expected YYYY-MM')
    }
    const [yearStr, monthStr] = month.split('-')
    const year = parseInt(yearStr, 10)
    const parsedMonth = parseInt(monthStr, 10)
    if (isNaN(year) || isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        throw new Error('Invalid month format. Expected YYYY-MM')
    }
}

/**
 * Validates that a date string is in YYYY-MM-DD format and not in the future.
 * @throws Error if validation fails
 */
export function validateDate(dateStr: string): void {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateStr)) {
        throw new Error('Invalid date format. Expected YYYY-MM-DD')
    }
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date value')
    }
    // Future date check removed to allow filtering by date ranges (e.g., end of month)
    // and presumably future transactions/budgets.

}

// ============================================================================
// Text Validation
// ============================================================================

/**
 * Validates that a description is within the character limit.
 * @throws Error if validation fails
 */
export function validateDescription(description: string | undefined): void {
    if (description && description.length > LIMITS.MAX_DESCRIPTION_LENGTH) {
        throw new Error(`Description must be ${LIMITS.MAX_DESCRIPTION_LENGTH} characters or less`)
    }
}

/**
 * Validates that a category/item name is valid.
 * @throws Error if validation fails
 */
export function validateName(name: string): void {
    if (!name || name.trim().length === 0) {
        throw new Error('Name cannot be empty')
    }
    if (name.length > LIMITS.MAX_CATEGORY_NAME_LENGTH) {
        throw new Error(`Name must be ${LIMITS.MAX_CATEGORY_NAME_LENGTH} characters or less`)
    }
}

/**
 * Validates that a color is a valid hex color format (#RRGGBB).
 * @throws Error if validation fails
 */
export function validateColor(color: string): void {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
    if (!hexColorRegex.test(color)) {
        throw new Error('Color must be a valid hex color format (e.g., #FF5733)')
    }
}
