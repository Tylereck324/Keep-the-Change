export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          pin_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          pin_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          pin_hash?: string
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
    }
  }
}

export type Household = Database['public']['Tables']['households']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type MonthlyBudget = Database['public']['Tables']['monthly_budgets']['Row']
export type CategoryKeyword = Database['public']['Tables']['category_keywords']['Row']
export type MerchantPattern = Database['public']['Tables']['merchant_patterns']['Row']
