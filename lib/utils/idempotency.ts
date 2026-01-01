/**
 * Idempotency utilities to prevent double-submit issues.
 * 
 * Usage:
 * 1. Generate a key on form mount: const key = generateIdempotencyKey()
 * 2. Include in server action: createTransaction({ ...data, idempotencyKey: key })
 * 3. Server checks if key was already used before processing
 */

/**
 * Generate a unique idempotency key.
 * Uses crypto.randomUUID() for uniqueness.
 */
export function generateIdempotencyKey(): string {
    // Use crypto.randomUUID if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }

    // Fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

/**
 * Create an idempotency key scoped to a specific action.
 * Useful when you have multiple forms on a page.
 * 
 * @example createScopedKey('transaction', formData.id)
 */
export function createScopedKey(action: string, ...parts: string[]): string {
    const base = generateIdempotencyKey()
    return `${action}:${parts.join(':')}:${base}`
}
