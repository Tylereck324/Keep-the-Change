/**
 * Validation utilities for common data types.
 */

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validate that a string is a valid UUID v4.
 * Throws an error if invalid.
 * 
 * @param id - The ID to validate
 * @param fieldName - Name of the field for error message
 * @throws Error if ID is not a valid UUID
 */
export function validateUUID(id: string, fieldName: string = 'ID'): void {
    if (!id || typeof id !== 'string') {
        throw new Error(`${fieldName} is required`)
    }

    const trimmed = id.trim()
    if (trimmed === '') {
        throw new Error(`${fieldName} cannot be empty`)
    }

    if (!UUID_REGEX.test(trimmed)) {
        throw new Error(`Invalid ${fieldName}: must be a valid UUID`)
    }
}

/**
 * Check if a string is a valid UUID v4 without throwing.
 * 
 * @param id - The ID to check
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(id: string): boolean {
    if (!id || typeof id !== 'string') {
        return false
    }
    return UUID_REGEX.test(id.trim())
}

/**
 * Validate that a string is not empty or whitespace only.
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error message
 * @param maxLength - Optional maximum length
 * @throws Error if validation fails
 */
export function validateNonEmptyString(
    value: string | undefined | null,
    fieldName: string,
    maxLength?: number
): void {
    if (!value || typeof value !== 'string') {
        throw new Error(`${fieldName} is required`)
    }

    const trimmed = value.trim()
    if (trimmed === '') {
        throw new Error(`${fieldName} cannot be empty`)
    }

    if (maxLength && trimmed.length > maxLength) {
        throw new Error(`${fieldName} must be ${maxLength} characters or less`)
    }
}

/**
 * Validate that a number is positive and within bounds.
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error message
 * @param options - Validation options
 */
export function validatePositiveNumber(
    value: number,
    fieldName: string = 'Amount',
    options: {
        allowZero?: boolean
        max?: number
    } = {}
): void {
    const { allowZero = false, max = 100_000_000 } = options

    if (!Number.isFinite(value)) {
        throw new Error(`${fieldName} must be a valid number`)
    }

    if (allowZero) {
        if (value < 0) {
            throw new Error(`${fieldName} cannot be negative`)
        }
    } else {
        if (value <= 0) {
            throw new Error(`${fieldName} must be positive`)
        }
    }

    if (value > max) {
        throw new Error(`${fieldName} exceeds maximum allowed value`)
    }
}

/**
 * Validate a hex color string.
 * 
 * @param color - The color to validate
 * @throws Error if not a valid hex color
 */
export function validateHexColor(color: string): void {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
    if (!hexColorRegex.test(color)) {
        throw new Error('Color must be a valid hex color format (e.g., #FF5733)')
    }
}
