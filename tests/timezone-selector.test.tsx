import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimezoneSelector } from '@/components/timezone-selector'

vi.mock('@/lib/actions/settings', () => ({
  getHouseholdTimezone: vi.fn().mockResolvedValue('UTC'),
  setHouseholdTimezone: vi.fn(),
}))

describe('TimezoneSelector', () => {
  it('renders the timezone label', async () => {
    render(<TimezoneSelector detectedTimezone="America/Los_Angeles" />)

    expect(await screen.findByText(/timezone/i)).not.toBeNull()
  })
})
