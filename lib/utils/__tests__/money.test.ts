import { describe, it, expect } from 'vitest'
import {
    dollarsToCents,
    centsToDollars,
    formatMoney,
    parseDollarsToCents,
    validateCentsAmount,
    addCents
} from '../money'

describe('Money Utilities', () => {
    describe('dollarsToCents', () => {
        it('converts dollars to cents correctly', () => {
            expect(dollarsToCents(10)).toBe(1000)
            expect(dollarsToCents(19.99)).toBe(1999)
            expect(dollarsToCents(0.99)).toBe(99)
        })

        it('handles floating point precision', () => {
            expect(dollarsToCents(7.1 * 100)).toBe(71000) // 7.1 * 100 might float drift
        })

        it('throws error for non-finite numbers', () => {
            expect(() => dollarsToCents(Infinity)).toThrow()
            expect(() => dollarsToCents(NaN)).toThrow()
        })
    })

    describe('centsToDollars', () => {
        it('converts cents to dollars correctly', () => {
            expect(centsToDollars(1000)).toBe(10)
            expect(centsToDollars(1999)).toBe(19.99)
            expect(centsToDollars(99)).toBe(0.99)
        })

        it('throws error for non-finite numbers', () => {
            expect(() => centsToDollars(Infinity)).toThrow()
            expect(() => centsToDollars(NaN)).toThrow()
        })
    })

    describe('formatMoney', () => {
        it('formats positive amounts correctly', () => {
            expect(formatMoney(1999)).toBe('$19.99')
            expect(formatMoney(10000)).toBe('$100.00')
            expect(formatMoney(5)).toBe('$0.05')
        })

        it('formats negative amounts correctly', () => {
            expect(formatMoney(-1999)).toBe('-$19.99')
        })
    })

    describe('parseDollarsToCents', () => {
        it('parses valid strings correctly', () => {
            expect(parseDollarsToCents('19.99')).toBe(1999)
            expect(parseDollarsToCents('$19.99')).toBe(1999)
            expect(parseDollarsToCents('1,000.00')).toBe(100000)
        })

        it('returns null for invalid strings', () => {
            expect(parseDollarsToCents('abc')).toBeNull()
            expect(parseDollarsToCents('')).toBeNull()
        })
    })

    describe('validateCentsAmount', () => {
        it('validates correct amounts', () => {
            expect(validateCentsAmount(100)).toEqual({ valid: true })
        })

        it('rejects negative or zero amounts', () => {
            expect(validateCentsAmount(0)).toEqual({ valid: false, error: 'Amount must be positive' })
            expect(validateCentsAmount(-100)).toEqual({ valid: false, error: 'Amount must be positive' })
        })

        it('rejects non-integer cents', () => {
            expect(validateCentsAmount(100.5)).toEqual({ valid: false, error: 'Amount must be in whole cents' })
        })

        it('rejects overly large amounts', () => {
            expect(validateCentsAmount(10_000_000_000 * 100 + 1)).toEqual({ valid: false, error: 'Amount exceeds maximum allowed value' })
        })
    })

    describe('addCents', () => {
        it('adds cents correctly', () => {
            expect(addCents(100, 200)).toBe(300)
        })

        it('handles rounding if inputs are not quite integers (defensive)', () => {
            expect(addCents(100.1, 200.2)).toBe(300)
        })
    })
})
