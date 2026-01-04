import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let cookieValue: string | undefined
let auth: typeof import('@/lib/auth')
const jwtVerifyMock = vi.fn()

const cookieStore = {
  get: vi.fn(() => (cookieValue ? { value: cookieValue } : undefined)),
  set: vi.fn((name: string, value: string) => {
    cookieValue = value
  }),
  delete: vi.fn(() => {
    cookieValue = undefined
  }),
}

vi.mock('next/headers', () => ({
  cookies: () => cookieStore,
}))

vi.mock('jose', async () => {
  const actual = await vi.importActual<typeof import('jose')>('jose')
  return {
    ...actual,
    jwtVerify: jwtVerifyMock,
  }
})

function setSessionWithRemaining(seconds: number) {
  const nowSeconds = Math.floor(Date.now() / 1000)
  cookieValue = 'valid-token'
  jwtVerifyMock.mockResolvedValueOnce({ payload: { exp: nowSeconds + seconds } })
}

beforeEach(async () => {
  process.env.SESSION_SECRET = 'test-session-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  cookieValue = undefined
  cookieStore.get.mockClear()
  cookieStore.set.mockClear()
  cookieStore.delete.mockClear()
  jwtVerifyMock.mockReset()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-04T00:00:00Z'))

  vi.resetModules()
  auth = await import('@/lib/auth')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getSessionTimeRemaining', () => {
  it('returns null when no session cookie is present', async () => {
    const remaining = await auth.getSessionTimeRemaining()

    expect(remaining).toBeNull()
  })

  it('returns null when the token is invalid', async () => {
    cookieValue = 'invalid-token'
    jwtVerifyMock.mockRejectedValueOnce(new Error('invalid-token'))

    const remaining = await auth.getSessionTimeRemaining()

    expect(remaining).toBeNull()
  })

  it('returns remaining seconds for a valid token', async () => {
    await setSessionWithRemaining(60 * 60)

    const remaining = await auth.getSessionTimeRemaining()

    expect(remaining).toBe(60 * 60)
  })
})

describe('isSessionExpiringSoon', () => {
  it('returns true when remaining time is under 24 hours', async () => {
    await setSessionWithRemaining(23 * 60 * 60)

    const expiringSoon = await auth.isSessionExpiringSoon()

    expect(expiringSoon).toBe(true)
  })

  it('returns false when remaining time is at or above 24 hours', async () => {
    await setSessionWithRemaining(24 * 60 * 60)

    const expiringSoon = await auth.isSessionExpiringSoon()

    expect(expiringSoon).toBe(false)
  })
})
