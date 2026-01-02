import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PinModal } from '@/components/pin-modal'

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: false,
  json: vi.fn().mockResolvedValue({ error: 'Invalid PIN' }),
}))

const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('PinModal', () => {
  it('shows error without logging to console', async () => {
    render(<PinModal open mode="verify" onSuccess={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '1234' } })
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }))

    await waitFor(() => {
      expect(screen.queryByText('Invalid PIN')).not.toBeNull()
    })

    expect(consoleSpy).not.toHaveBeenCalled()
  })
})
