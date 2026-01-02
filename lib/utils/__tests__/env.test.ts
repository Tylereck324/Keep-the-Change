import { describe, expect, it } from 'vitest'
import { isBundleAnalyzeEnabled } from '@/lib/utils/env'

describe('isBundleAnalyzeEnabled', () => {
  it('returns true for "1" and "true"', () => {
    expect(isBundleAnalyzeEnabled('1')).toBe(true)
    expect(isBundleAnalyzeEnabled('true')).toBe(true)
  })

  it('returns false for undefined/other values', () => {
    expect(isBundleAnalyzeEnabled(undefined)).toBe(false)
    expect(isBundleAnalyzeEnabled('0')).toBe(false)
  })
})
