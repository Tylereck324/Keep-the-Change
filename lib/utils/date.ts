/**
 * Date utility functions for consistent date handling across the application.
 * Consolidated from budget/page.tsx, reports/page.tsx, and other locations.
 */

/**
 * Gets the current month in YYYY-MM format.
 */
export function getCurrentMonth(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Formats a YYYY-MM month string to a human-readable format (e.g., "January 2024").
 */
export function formatMonth(month: string): string {
    const [year, monthNum] = month.split('-').map(Number)
    const date = new Date(year, monthNum - 1, 1)
    return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    })
}

/**
 * Gets the previous month in YYYY-MM format.
 */
export function getPreviousMonth(month: string): string {
    const [year, monthNum] = month.split('-').map(Number)
    const date = new Date(year, monthNum - 2, 1) // monthNum - 1 for 0-indexed, -1 more for previous
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Gets an array of the last N months in YYYY-MM format, starting from current month.
 * @param n Number of months to return
 * @returns Array of month strings, most recent first
 */
export function getLastNMonths(n: number): string[] {
    const now = new Date()
    const months: string[] = []

    for (let i = 0; i < n; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
    }

    return months
}

/**
 * Gets the start and end dates for a given month.
 * @param month Month in YYYY-MM format
 * @returns Object with start (YYYY-MM-01) and end (YYYY-MM-DD) dates
 */
export function getMonthDateRange(month: string): { start: string; end: string } {
    const [year, monthNum] = month.split('-').map(Number)
    const lastDay = new Date(year, monthNum, 0).getDate()

    return {
        start: `${month}-01`,
        end: `${month}-${String(lastDay).padStart(2, '0')}`,
    }
}
