/**
 * Suggests a category name based on merchant/transaction description
 */

// Common merchant keywords to category name mappings
const MERCHANT_KEYWORDS: Record<string, string> = {
  // Gas & Fuel
  'shell': 'Gas',
  'chevron': 'Gas',
  'exxon': 'Gas',
  'mobil': 'Gas',
  'bp': 'Gas',
  'arco': 'Gas',
  'texaco': 'Gas',
  'gasbuddy': 'Gas',
  'fuel': 'Gas',
  '76': 'Gas',

  // Groceries
  'safeway': 'Groceries',
  'walmart': 'Groceries',
  'target': 'Groceries',
  'costco': 'Groceries',
  'whole foods': 'Groceries',
  'trader joe': 'Groceries',
  'kroger': 'Groceries',
  'albertsons': 'Groceries',
  'publix': 'Groceries',
  'aldi': 'Groceries',
  'food lion': 'Groceries',
  'wegmans': 'Groceries',
  'heb': 'Groceries',
  'market': 'Groceries',

  // Dining & Restaurants
  'starbucks': 'Coffee',
  'dunkin': 'Coffee',
  'peet': 'Coffee',
  'mcdonald': 'Dining',
  'burger king': 'Dining',
  'wendy': 'Dining',
  'taco bell': 'Dining',
  'chipotle': 'Dining',
  'subway': 'Dining',
  'panera': 'Dining',
  'domino': 'Dining',
  'pizza hut': 'Dining',
  'restaurant': 'Dining',
  'cafe': 'Dining',
  'bar & grill': 'Dining',
  'bistro': 'Dining',

  // Transportation
  'uber': 'Transportation',
  'lyft': 'Transportation',
  'transit': 'Transportation',
  'parking': 'Parking',

  // Entertainment
  'netflix': 'Entertainment',
  'spotify': 'Entertainment',
  'hulu': 'Entertainment',
  'disney': 'Entertainment',
  'hbo': 'Entertainment',
  'amazon prime': 'Entertainment',
  'youtube': 'Entertainment',
  'cinema': 'Entertainment',
  'theater': 'Entertainment',
  'amc': 'Entertainment',

  // Shopping
  'amazon': 'Shopping',
  'ebay': 'Shopping',
  'etsy': 'Shopping',

  // Health
  'cvs': 'Pharmacy',
  'walgreens': 'Pharmacy',
  'rite aid': 'Pharmacy',
  'pharmacy': 'Pharmacy',
  'gym': 'Fitness',
  'fitness': 'Fitness',

  // Utilities
  'electric': 'Utilities',
  'power': 'Utilities',
  'water': 'Utilities',
  'internet': 'Utilities',
  'phone': 'Utilities',
}

/**
 * Cleans up a merchant name by removing common suffixes and special characters
 */
function cleanMerchantName(description: string): string {
  let cleaned = description
    // Remove common suffixes
    .replace(/\b(LLC|Inc|Corp|Ltd|Co|Company)\b/gi, '')
    // Remove numbers (often store numbers like "Safeway #1234")
    .replace(/#?\d+/g, '')
    // Remove special characters except spaces and hyphens
    .replace(/[^a-zA-Z\s-]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Trim
    .trim()

  // Capitalize first letter of each word
  cleaned = cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  return cleaned
}

/**
 * Suggests a category name based on the transaction description
 *
 * Strategy:
 * 1. Check if description contains any known merchant keywords
 * 2. If match found, return the mapped category name
 * 3. If no match, clean up the merchant name and return it
 */
export function suggestCategoryName(description: string): string {
  const lowerDesc = description.toLowerCase()

  // Check for merchant keyword matches
  for (const [keyword, categoryName] of Object.entries(MERCHANT_KEYWORDS)) {
    if (lowerDesc.includes(keyword)) {
      return categoryName
    }
  }

  // No keyword match - clean up merchant name and suggest that
  const cleaned = cleanMerchantName(description)

  // If cleaned name is too long (>30 chars) or too short (< 3 chars),
  // just return "New Category"
  if (cleaned.length < 3 || cleaned.length > 30) {
    return 'New Category'
  }

  return cleaned
}
