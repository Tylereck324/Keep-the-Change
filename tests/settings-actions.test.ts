import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  from: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}))

import { getHouseholdTimezone, setHouseholdTimezone } from '@/lib/actions/settings'

function createSelectBuilder(result: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
}

function createUpdateBuilder(result: unknown) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(result),
  }
}

describe('household timezone settings', () => {
  beforeEach(() => {
    mocks.getSession.mockReset()
    mocks.from.mockReset()
    mocks.revalidatePath.mockReset()
  })

  it('returns UTC when no session', async () => {
    mocks.getSession.mockResolvedValue(null)

    await expect(getHouseholdTimezone()).resolves.toBe('UTC')
  })

  it('returns stored timezone for household', async () => {
    mocks.getSession.mockResolvedValue('household-1')
    mocks.from.mockReturnValue(
      createSelectBuilder({ data: { timezone: 'America/Los_Angeles' } })
    )

    await expect(getHouseholdTimezone()).resolves.toBe('America/Los_Angeles')
  })

  it('updates timezone and revalidates paths', async () => {
    mocks.getSession.mockResolvedValue('household-1')
    mocks.from.mockReturnValue(
      createUpdateBuilder({ error: null })
    )

    await expect(setHouseholdTimezone('America/Chicago')).resolves.toBeUndefined()

    expect(mocks.revalidatePath).toHaveBeenCalledWith('/settings')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/')
  })
})
