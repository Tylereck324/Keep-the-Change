import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
    getCurrentMonth,
    formatMonth,
    getPreviousMonth,
    getLastNMonths,
    getMonthDateRange
} from '../date'

describe('Date Utilities', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('getCurrentMonth', () => {
        it('returns current month in YYYY-MM format', () => {
            // Mock date to 2024-02-15
            const date = new Date(2024, 1, 15)
            vi.setSystemTime(date)

            expect(getCurrentMonth()).toBe('2024-02')
        })

        it('handles month boundaries', () => {
            // Mock date to 2024-01-31
            vi.setSystemTime(new Date(2024, 0, 31))
            expect(getCurrentMonth()).toBe('2024-01')
        })
    })

    describe('getPreviousMonth', () => {
        it('returns previous month for regular month', () => {
            expect(getPreviousMonth('2024-02')).toBe('2024-01')
        })

        it('handles year rollover', () => {
            expect(getPreviousMonth('2024-01')).toBe('2023-12')
        })
    })

    describe('formatMonth', () => {
        it('formats month correctly', () => {
            expect(formatMonth('2024-01')).toBe('January 2024')
        })
    })

    describe('getLastNMonths', () => {
        it('returns last N months including current', () => {
            // Mock to 2024-03-15
            vi.setSystemTime(new Date(2024, 2, 15))

            const months = getLastNMonths(3)
            expect(months).toEqual(['2024-03', '2024-02', '2024-01'])
        })
    })

    describe('getMonthDateRange', () => {
        it('returns correct range for 31-day month', () => {
            const range = getMonthDateRange('2024-01')
            expect(range).toEqual({ start: '2024-01-01', end: '2024-01-31' })
        })

        it('returns correct range for leap year', () => {
            const range = getMonthDateRange('2024-02')
            expect(range).toEqual({ start: '2024-02-01', end: '2024-02-29' })
        })

        it('returns correct range for non-leap year', () => {
            const range = getMonthDateRange('2023-02')
            expect(range).toEqual({ start: '2023-02-01', end: '2023-02-28' })
        })
    })
})
