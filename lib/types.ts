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
          category_id: string
          amount: number
          description: string | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          category_id: string
          amount: number
          description?: string | null
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          category_id?: string
          amount?: number
          description?: string | null
          date?: string
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
    }
  }
}

export type Household = Database['public']['Tables']['households']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type MonthlyBudget = Database['public']['Tables']['monthly_budgets']['Row']
