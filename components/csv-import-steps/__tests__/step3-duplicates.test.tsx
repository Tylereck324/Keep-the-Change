import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { Step3Duplicates } from '../step3-duplicates'

describe('Step3Duplicates', () => {
  it('applies remember-skip to all remaining duplicates and completes', async () => {
    const transactions = [
      {
        date: '2024-01-01',
        amount: 10,
        description: 'A',
        categoryId: 'c1',
        matchType: 'none',
        rowNumber: 2,
      },
      {
        date: '2024-01-02',
        amount: 20,
        description: 'B',
        categoryId: 'c1',
        matchType: 'none',
        rowNumber: 3,
      },
      {
        date: '2024-01-03',
        amount: 30,
        description: 'C',
        categoryId: 'c1',
        matchType: 'none',
        rowNumber: 4,
      },
    ]
    const existing = [
      {
        id: 'e1',
        household_id: 'h',
        category_id: 'c1',
        amount: 10,
        amount_cents: 1000,
        description: 'A',
        date: '2024-01-01',
        created_at: null,
        type: 'expense',
      },
      {
        id: 'e2',
        household_id: 'h',
        category_id: 'c1',
        amount: 20,
        amount_cents: 2000,
        description: 'B',
        date: '2024-01-02',
        created_at: null,
        type: 'expense',
      },
    ]
    const onComplete = vi.fn()

    render(
      <Step3Duplicates
        transactions={transactions}
        existingTransactions={existing}
        onComplete={onComplete}
        onBack={vi.fn()}
      />
    )

    fireEvent.click(screen.getByLabelText('Skip all remaining duplicates'))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    const passed = onComplete.mock.calls[0][0]
    expect(passed).toHaveLength(1)
    expect(passed[0].description).toBe('C')
  })
})
