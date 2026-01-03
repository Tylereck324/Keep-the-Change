import { describe, it, expect } from 'vitest'
import { matchCategory, matchCategories } from '../category-matcher'
import type { CategoryKeyword, MerchantPattern } from '@/lib/types'

// Helper to create mock keyword
const createKeyword = (categoryId: string, keyword: string): CategoryKeyword => ({
  id: `kw-${keyword}`,
  category_id: categoryId,
  keyword,
  household_id: 'test-household',
  created_at: new Date().toISOString(),
})

// Helper to create mock merchant pattern
const createPattern = (categoryId: string, merchantName: string): MerchantPattern => ({
  id: `pat-${merchantName}`,
  category_id: categoryId,
  merchant_name: merchantName,
  household_id: 'test-household',
  match_count: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

describe('matchCategory', () => {
  describe('keyword matching', () => {
    it('should match by exact keyword (case insensitive)', () => {
      const keywords: Record<string, CategoryKeyword[]> = {
        'cat-groceries': [createKeyword('cat-groceries', 'walmart')],
      }

      const result = matchCategory('WALMART SUPERCENTER', keywords, [])

      expect(result.categoryId).toBe('cat-groceries')
      expect(result.matchType).toBe('keyword')
      expect(result.confidence).toBe('high')
    })

    it('should match keyword regardless of keyword case', () => {
      const keywords: Record<string, CategoryKeyword[]> = {
        'cat-groceries': [createKeyword('cat-groceries', 'Walmart')],
      }

      const result = matchCategory('walmart market', keywords, [])

      expect(result.categoryId).toBe('cat-groceries')
      expect(result.matchType).toBe('keyword')
    })

    it('should match keyword as substring', () => {
      const keywords: Record<string, CategoryKeyword[]> = {
        'cat-gas': [createKeyword('cat-gas', 'shell')],
      }

      const result = matchCategory('SHELL GAS STATION #1234', keywords, [])

      expect(result.categoryId).toBe('cat-gas')
      expect(result.matchType).toBe('keyword')
    })

    it('should match first keyword found when multiple categories match', () => {
      const keywords: Record<string, CategoryKeyword[]> = {
        'cat-first': [createKeyword('cat-first', 'store')],
        'cat-second': [createKeyword('cat-second', 'grocery')],
      }

      const result = matchCategory('GROCERY STORE', keywords, [])

      // Should match 'store' from first category due to iteration order
      expect(result.categoryId).toBe('cat-first')
    })

    it('should match any keyword from a category', () => {
      const keywords: Record<string, CategoryKeyword[]> = {
        'cat-food': [
          createKeyword('cat-food', 'restaurant'),
          createKeyword('cat-food', 'diner'),
          createKeyword('cat-food', 'cafe'),
        ],
      }

      const result1 = matchCategory('LOCAL DINER', keywords, [])
      const result2 = matchCategory('COFFEE CAFE', keywords, [])

      expect(result1.categoryId).toBe('cat-food')
      expect(result2.categoryId).toBe('cat-food')
    })

    it('should not match if keyword not found', () => {
      const keywords: Record<string, CategoryKeyword[]> = {
        'cat-groceries': [createKeyword('cat-groceries', 'walmart')],
      }

      const result = matchCategory('AMAZON PURCHASE', keywords, [])

      expect(result.categoryId).toBeNull()
      expect(result.matchType).toBe('none')
    })
  })

  describe('historical pattern matching', () => {
    it('should match by exact merchant name', () => {
      const patterns: MerchantPattern[] = [
        createPattern('cat-coffee', 'starbucks'),
      ]

      const result = matchCategory('STARBUCKS #12345', {}, patterns)

      expect(result.categoryId).toBe('cat-coffee')
      expect(result.matchType).toBe('historical')
      expect(result.confidence).toBe('medium')
    })

    it('should match partial merchant name (pattern contains merchant)', () => {
      const patterns: MerchantPattern[] = [
        createPattern('cat-shopping', 'target'),
      ]

      // "TARGET STORE #123" extracts to "target store", which contains "target"
      const result = matchCategory('TARGET STORE #123', {}, patterns)

      expect(result.categoryId).toBe('cat-shopping')
    })

    it('should match partial merchant name (merchant contains pattern)', () => {
      const patterns: MerchantPattern[] = [
        createPattern('cat-gas', 'exxon'),
      ]

      const result = matchCategory('EXXONMOBIL GAS', {}, patterns)

      expect(result.categoryId).toBe('cat-gas')
    })

    it('should strip payment processor prefixes before matching', () => {
      const patterns: MerchantPattern[] = [
        createPattern('cat-online', 'amazon'),
      ]

      const result = matchCategory('PAYPAL *AMAZON', {}, patterns)

      expect(result.categoryId).toBe('cat-online')
    })

    it('should strip KLARNA prefix', () => {
      const patterns: MerchantPattern[] = [
        createPattern('cat-shopping', 'store'),
      ]

      const result = matchCategory('KLARNA*STORE PURCHASE', {}, patterns)

      expect(result.categoryId).toBe('cat-shopping')
    })
  })

  describe('priority: keyword over historical', () => {
    it('should prefer keyword match over historical match', () => {
      const keywords: Record<string, CategoryKeyword[]> = {
        'cat-keyword': [createKeyword('cat-keyword', 'walmart')],
      }
      const patterns: MerchantPattern[] = [
        createPattern('cat-pattern', 'walmart'),
      ]

      const result = matchCategory('WALMART SUPERCENTER', keywords, patterns)

      expect(result.categoryId).toBe('cat-keyword')
      expect(result.matchType).toBe('keyword')
      expect(result.confidence).toBe('high')
    })
  })

  describe('no match', () => {
    it('should return null categoryId when no match found', () => {
      const result = matchCategory('UNKNOWN MERCHANT', {}, [])

      expect(result.categoryId).toBeNull()
      expect(result.matchType).toBe('none')
      expect(result.confidence).toBe('low')
    })

    it('should return no match for empty description', () => {
      const keywords: Record<string, CategoryKeyword[]> = {
        'cat-test': [createKeyword('cat-test', 'test')],
      }

      const result = matchCategory('', keywords, [])

      expect(result.categoryId).toBeNull()
    })
  })
})

describe('matchCategories', () => {
  it('should batch match multiple transactions', () => {
    const keywords: Record<string, CategoryKeyword[]> = {
      'cat-groceries': [createKeyword('cat-groceries', 'walmart')],
      'cat-gas': [createKeyword('cat-gas', 'shell')],
    }

    const transactions = [
      { description: 'WALMART GROCERY' },
      { description: 'SHELL GAS STATION' },
      { description: 'UNKNOWN PURCHASE' },
    ]

    const results = matchCategories(transactions, keywords, [])

    expect(results).toHaveLength(3)
    expect(results[0].categoryId).toBe('cat-groceries')
    expect(results[1].categoryId).toBe('cat-gas')
    expect(results[2].categoryId).toBeNull()
  })

  it('should handle empty transaction list', () => {
    const results = matchCategories([], {}, [])

    expect(results).toHaveLength(0)
  })
})
