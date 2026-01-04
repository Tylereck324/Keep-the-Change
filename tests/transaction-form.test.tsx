import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { TransactionForm } from '@/components/transaction-form'

const categories = [{ id: '11111111-1111-4111-8111-111111111111', name: 'Food', color: '#000' }]

const actionMocks = vi.hoisted(() => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
}))

vi.mock('@/lib/actions/transactions', () => ({
  createTransaction: actionMocks.createTransaction,
  updateTransaction: actionMocks.updateTransaction,
}))

vi.mock('@/lib/actions/categories', () => ({
  createCategory: vi.fn(),
}))

beforeEach(() => {
  actionMocks.createTransaction.mockReset()
  actionMocks.updateTransaction.mockReset()
})

describe('TransactionForm refunds', () => {
  it('accepts negative amount input', async () => {
    render(
      <TransactionForm
        categories={categories as any}
        trigger={<button>Open</button>}
      />
    )

    fireEvent.click(screen.getByText('Open'))
    const amountInput = await screen.findByLabelText(/amount/i)
    fireEvent.change(amountInput, { target: { value: '-12.34' } })

    expect((amountInput as HTMLInputElement).value).toBe('-12.34')
  })
})
