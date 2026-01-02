import type { CategoryKeyword, MerchantPattern } from '@/lib/types'

/** How a category was matched to a transaction */
export type MatchType = 'keyword' | 'historical' | 'none'

/**
 * Result of matching a transaction to a category.
 */
export type CategoryMatch = {
  /** Matched category ID, or null if no match */
  categoryId: string | null
  /** How the match was found */
  matchType: MatchType
  /** Confidence level: high (keyword), medium (historical), low (none) */
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Match a transaction description to a category using keywords
 */
function matchByKeyword(
  description: string,
  keywordsByCategory: Record<string, CategoryKeyword[]>
): string | null {
  const normalizedDesc = description.toLowerCase()

  for (const [categoryId, keywords] of Object.entries(keywordsByCategory)) {
    for (const keywordObj of keywords) {
      if (normalizedDesc.includes(keywordObj.keyword)) {
        return categoryId
      }
    }
  }

  return null
}

/**
 * Extract merchant name from transaction description
 * Simple heuristic: first word/phrase before common separators
 */
function extractMerchantName(description: string): string {
  // Remove common payment processors
  const cleaned = description.replace(/^(PAYPAL \*|KLARNA\*|DD \*)/i, '')

  // Take first part before common separators
  const parts = cleaned.split(/[\s-]+/)

  // Return first 1-2 words as merchant name
  return parts.slice(0, 2).join(' ').trim().toLowerCase()
}

/**
 * Match a transaction description to a category using historical patterns
 */
function matchByHistory(
  description: string,
  merchantPatterns: MerchantPattern[]
): string | null {
  const merchantName = extractMerchantName(description)
  if (!merchantName) return null

  // Find exact match first
  const exactMatch = merchantPatterns.find(
    p => p.merchant_name.toLowerCase() === merchantName
  )
  if (exactMatch) return exactMatch.category_id

  // Find partial match (merchant name contains pattern or vice versa)
  const partialMatch = merchantPatterns.find(
    p => merchantName.includes(p.merchant_name.toLowerCase()) ||
         p.merchant_name.toLowerCase().includes(merchantName)
  )

  return partialMatch?.category_id || null
}

/**
 * Match a transaction description to a category.
 *
 * Matching priority:
 * 1. Keyword match (high confidence) - checks if description contains any configured keyword
 * 2. Historical match (medium confidence) - checks merchant patterns from past categorizations
 * 3. No match (low confidence) - returns null categoryId
 *
 * @param description - Transaction description to match
 * @param keywordsByCategory - Map of category IDs to their keywords
 * @param merchantPatterns - Historical merchant-to-category patterns
 * @returns Match result with categoryId, matchType, and confidence
 *
 * @example
 * ```typescript
 * const match = matchCategory('WALMART GROCERY', keywords, patterns)
 * if (match.categoryId) {
 *   console.log(`Matched to ${match.categoryId} via ${match.matchType}`)
 * }
 * ```
 */
export function matchCategory(
  description: string,
  keywordsByCategory: Record<string, CategoryKeyword[]>,
  merchantPatterns: MerchantPattern[]
): CategoryMatch {
  // Try keyword matching first (higher confidence)
  const keywordMatch = matchByKeyword(description, keywordsByCategory)
  if (keywordMatch) {
    return {
      categoryId: keywordMatch,
      matchType: 'keyword',
      confidence: 'high',
    }
  }

  // Try historical matching
  const historyMatch = matchByHistory(description, merchantPatterns)
  if (historyMatch) {
    return {
      categoryId: historyMatch,
      matchType: 'historical',
      confidence: 'medium',
    }
  }

  // No match found
  return {
    categoryId: null,
    matchType: 'none',
    confidence: 'low',
  }
}

/**
 * Batch match multiple transactions to categories.
 *
 * @param transactions - Array of objects with description property
 * @param keywordsByCategory - Map of category IDs to their keywords
 * @param merchantPatterns - Historical merchant-to-category patterns
 * @returns Array of match results in same order as input transactions
 */
export function matchCategories(
  transactions: Array<{ description: string }>,
  keywordsByCategory: Record<string, CategoryKeyword[]>,
  merchantPatterns: MerchantPattern[]
): CategoryMatch[] {
  return transactions.map(t => matchCategory(
    t.description,
    keywordsByCategory,
    merchantPatterns
  ))
}
