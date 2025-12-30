import type { CategoryKeyword, MerchantPattern } from '@/lib/types'

export type MatchType = 'keyword' | 'historical' | 'none'

export type CategoryMatch = {
  categoryId: string | null
  matchType: MatchType
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
  let cleaned = description.replace(/^(PAYPAL \*|KLARNA\*|DD \*)/i, '')

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
 * Match a transaction to a category using both keyword and historical approaches
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
 * Batch match multiple transactions
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
