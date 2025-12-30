export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          pin_hash: string
          auto_rollover_budget: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          pin_hash: string
          auto_rollover_budget?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          pin_hash?: string
          auto_rollover_budget?: boolean
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          household_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          color: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          color?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          household_id: string
          category_id: string | null
          amount: number
          description: string | null
          date: string
          type: 'income' | 'expense'
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          category_id?: string | null
          amount: number
          description?: string | null
          date: string
          type?: 'income' | 'expense'
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          category_id?: string | null
          amount?: number
          description?: string | null
          date?: string
          type?: 'income' | 'expense'
          created_at?: string
        }
      }
      monthly_budgets: {
        Row: {
          id: string
          household_id: string
          category_id: string
          month: string
          budgeted_amount: number
        }
        Insert: {
          id?: string
          household_id: string
          category_id: string
          month: string
          budgeted_amount: number
        }
        Update: {
          id?: string
          household_id?: string
          category_id?: string
          month?: string
          budgeted_amount?: number
        }
      }
      category_keywords: {
        Row: {
          id: string
          household_id: string
          category_id: string
          keyword: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          category_id: string
          keyword: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          category_id?: string
          keyword?: string
          created_at?: string
        }
      }
      merchant_patterns: {
        Row: {
          id: string
          household_id: string
          merchant_name: string
          category_id: string
          last_used_at: string
        }
        Insert: {
          id?: string
          household_id: string
          merchant_name: string
          category_id: string
          last_used_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          merchant_name?: string
          category_id?: string
          last_used_at?: string
        }
      }
      auth_attempts: {
        Row: {
          id: string
          ip_address: string
          attempt_count: number
          last_attempt_at: string
          lockout_until: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ip_address: string
          attempt_count?: number
          last_attempt_at?: string
          lockout_until?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ip_address?: string
          attempt_count?: number
          last_attempt_at?: string
          lockout_until?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type Household = Database['public']['Tables']['households']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type MonthlyBudget = Database['public']['Tables']['monthly_budgets']['Row']
export type CategoryKeyword = Database['public']['Tables']['category_keywords']['Row']
export type MerchantPattern = Database['public']['Tables']['merchant_patterns']['Row']

/**
 * Standardized return type for server actions.
 * Provides consistent success/error handling across the application.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

