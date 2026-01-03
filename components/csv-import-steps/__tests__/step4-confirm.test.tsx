import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { Step4Confirm } from '../step4-confirm'

vi.mock('@/lib/actions/csv-import', () => ({
  bulkImportTransactions: vi.fn(),
  learnMerchantPattern: vi.fn(),
}))

describe('Step4Confirm', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('cleans up timers on unmount during import', async () => {
    const { bulkImportTransactions } = await import('@/lib/actions/csv-import')
    vi.mocked(bulkImportTransactions).mockReturnValue(new Promise(() => {}))

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    const { unmount } = render(
      <Step4Confirm
        transactions={[
          {
            date: '2024-01-01',
            amount: 10,
            description: 'A',
            categoryId: 'c1',
            matchType: 'keyword',
            rowNumber: 2,
          },
        ]}
        categories={[
          { id: 'c1', name: 'Cat', color: '#000', household_id: 'h', created_at: '' },
        ]}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /confirm & import/i }))
    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
    expect(clearTimeoutSpy).toHaveBeenCalled()
  })
})
