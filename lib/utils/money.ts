/**
 * Money utility functions for working with cents.
 * 
 * All money values should be stored and calculated as integer cents
 * to avoid floating-point rounding errors.
 */

/**
 * Convert a dollar amount (possibly with decimals) to integer cents.
 * Uses Math.round to handle floating-point imprecision.
 * 
 * @example dollarsToCents(19.99) => 1999
 * @example dollarsToCents(100) => 10000
 */
export function dollarsToCents(dollars: number): number {
    if (!Number.isFinite(dollars)) {
        throw new Error('Invalid dollar amount')
    }
    return Math.round(dollars * 100)
}

/**
 * Convert integer cents to dollar amount.
 * 
 * @example centsToDollars(1999) => 19.99
 * @example centsToDollars(10000) => 100
 */
export function centsToDollars(cents: number): number {
    if (!Number.isFinite(cents)) {
        throw new Error('Invalid cents amount')
    }
    return cents / 100
}

/**
 * Format cents as a dollar string with 2 decimal places.
 * Does NOT include currency symbol.
 * 
 * @example formatCentsAsString(1999) => "19.99"
 * @example formatCentsAsString(10000) => "100.00"
 * @example formatCentsAsString(5) => "0.05"
 */
export function formatCentsAsString(cents: number): string {
    return (cents / 100).toFixed(2)
}

/**
 * Format cents as a display string with dollar sign.
 * 
 * @example formatMoney(1999) => "$19.99"
 * @example formatMoney(-1999) => "-$19.99"
 */
export function formatMoney(cents: number): string {
    const isNegative = cents < 0
    const formatted = formatCentsAsString(Math.abs(cents))
    return isNegative ? `-$${formatted}` : `$${formatted}`
}

/**
 * Parse a user-input string (like "19.99" or "$19.99") to cents.
 * Returns null if parsing fails.
 * 
 * @example parseDollarsToCents("19.99") => 1999
 * @example parseDollarsToCents("$100") => 10000
 * @example parseDollarsToCents("invalid") => null
 */
export function parseDollarsToCents(input: string): number | null {
    // Remove currency symbols and whitespace
    const cleaned = input.replace(/[$,\s]/g, '').trim()

    if (!cleaned) {
        return null
    }

    const parsed = parseFloat(cleaned)

    if (!Number.isFinite(parsed)) {
        return null
    }

    return dollarsToCents(parsed)
}

/**
 * Validate that a cents amount is within acceptable range.
 * Max: $100,000,000 (10 billion cents)
 * Min: 1 cent (no zero/negative for transactions)
 */
export function validateCentsAmount(cents: number): { valid: boolean; error?: string } {
    if (!Number.isFinite(cents)) {
        return { valid: false, error: 'Amount must be a valid number' }
    }

    if (!Number.isInteger(cents)) {
        return { valid: false, error: 'Amount must be in whole cents' }
    }

    if (cents <= 0) {
        return { valid: false, error: 'Amount must be positive' }
    }

    const maxCents = 100_000_000 * 100 // $100M in cents
    if (cents > maxCents) {
        return { valid: false, error: 'Amount exceeds maximum allowed value' }
    }

    return { valid: true }
}

/**
 * Safely add cents amounts (prevents floating-point issues).
 */
export function addCents(...amounts: number[]): number {
    return amounts.reduce((sum, amt) => sum + Math.round(amt), 0)
}
