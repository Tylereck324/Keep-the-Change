import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AutoRolloverToggle } from '@/components/auto-rollover-toggle'
import { getAutoRolloverSetting, setAutoRolloverSetting } from '@/lib/actions/settings'

vi.mock('@/lib/actions/settings', () => ({
  getAutoRolloverSetting: vi.fn(),
  setAutoRolloverSetting: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

describe('AutoRolloverToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows toast error and reverts when update fails', async () => {
    vi.mocked(getAutoRolloverSetting).mockResolvedValue(false)
    vi.mocked(setAutoRolloverSetting).mockRejectedValue(new Error('fail'))

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

  it('shows error, disables switch, and provides retry on load failure', async () => {
    vi.mocked(getAutoRolloverSetting).mockRejectedValueOnce(new Error('load failed'))

    await act(async () => {
      render(<AutoRolloverToggle />)
    })

    const { toast } = await import('sonner')
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load setting. Please try again.')
    })

    expect(screen.getByText('Failed to load setting. Please try again.')).not.toBeNull()
    expect(screen.getByRole('switch').getAttribute('data-disabled')).not.toBeNull()
    expect(screen.getByRole('button', { name: /retry/i })).not.toBeNull()
  })

  it('retries load after failure and enables the switch', async () => {
    vi.mocked(getAutoRolloverSetting)
      .mockRejectedValueOnce(new Error('load failed'))
      .mockResolvedValueOnce(true)

    await act(async () => {
      render(<AutoRolloverToggle />)
    })

    await waitFor(() => {
      expect(screen.getByText('Failed to load setting. Please try again.')).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.queryByText('Failed to load setting. Please try again.')).toBeNull()
    })

    expect(screen.getByRole('switch').getAttribute('data-disabled')).toBeNull()
  })
})
