import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TransactionList } from '@/components/transaction-list'

vi.mock('@/components/transaction-form', () => ({
  TransactionForm: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}))

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/actions/transactions', () => ({
  deleteTransaction: vi.fn(),
}))

const transactions = Array.from({ length: 5 }, (_, i) => ({
  id: `t${i}`,
  amount: 10,
  amount_cents: 1000,
  date: '2025-01-01',
  description: `Item ${i}`,
  category_id: null,
  category: null,
  household_id: 'h1',
  type: 'expense',
  created_at: '2025-01-01',
}))

const categories = []

describe('TransactionList load more', () => {
  it('shows initial subset and loads more on click', () => {
    render(
      <TransactionList
        transactions={transactions}
        categories={categories}
        initialVisibleCount={2}
        pageSize={2}
      />
    )

    expect(screen.getAllByTestId('transaction-row')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: /load more/i }))
    expect(screen.getAllByTestId('transaction-row')).toHaveLength(4)
  })
})
