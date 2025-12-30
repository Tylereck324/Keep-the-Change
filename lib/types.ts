/**
 * Re-export types from generated database.types.ts
 * and provide convenience type aliases
 */
export type { Database } from './database.types'
import type { Database } from './database.types'

// Convenience type aliases for Row types
export type Household = Database['public']['Tables']['households']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type MonthlyBudget = Database['public']['Tables']['monthly_budgets']['Row']
export type CategoryKeyword = Database['public']['Tables']['category_keywords']['Row']
export type MerchantPattern = Database['public']['Tables']['merchant_patterns']['Row']
export type AuthAttempt = Database['public']['Tables']['auth_attempts']['Row']

/**
 * Standardized return type for server actions.
 * Provides consistent success/error handling across the application.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }
