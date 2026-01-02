import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AutoRolloverToggle } from '@/components/auto-rollover-toggle'

vi.mock('@/lib/actions/settings', () => ({
  getAutoRolloverSetting: vi.fn().mockResolvedValue(false),
  setAutoRolloverSetting: vi.fn().mockRejectedValue(new Error('fail')),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

describe('AutoRolloverToggle', () => {
  it('shows toast error and reverts when update fails', async () => {
    render(<AutoRolloverToggle />)

    await waitFor(() => {
      expect(screen.queryByRole('switch')).not.toBeNull()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('switch'))
    })

    const { toast } = await import('sonner')
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update setting. Please try again.')
    })
  })
})
