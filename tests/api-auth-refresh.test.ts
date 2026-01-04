import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refreshSession: vi.fn(),
  getSessionTimeRemaining: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  refreshSession: mocks.refreshSession,
  getSessionTimeRemaining: mocks.getSessionTimeRemaining,
}))

import { GET, POST } from '@/app/api/auth/refresh/route'

describe('GET /api/auth/refresh', () => {
  beforeEach(() => {
    mocks.refreshSession.mockReset()
    mocks.getSessionTimeRemaining.mockReset()
  })

  it('returns 401 when there is no active session', async () => {
    mocks.getSessionTimeRemaining.mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('No active session')
  })

  it('returns remaining time and expiringSoon flag', async () => {
    mocks.getSessionTimeRemaining.mockResolvedValue(60 * 60)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.timeRemaining).toBe(60 * 60)
    expect(body.expiringSoon).toBe(true)
  })
})

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    mocks.refreshSession.mockReset()
    mocks.getSessionTimeRemaining.mockReset()
  })

  it('returns 401 when refresh fails', async () => {
    mocks.refreshSession.mockResolvedValue({
      success: false,
      error: 'No active session to refresh',
    })

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('No active session to refresh')
  })

  it('returns new expiry info on success', async () => {
    mocks.refreshSession.mockResolvedValue({ success: true, expiresIn: 30 })
    mocks.getSessionTimeRemaining.mockResolvedValue(120)

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.expiresIn).toBe(30)
    expect(body.timeRemaining).toBe(120)
  })

  it('returns 500 on unexpected errors', async () => {
    mocks.refreshSession.mockRejectedValue(new Error('boom'))

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Failed to refresh session')
  })
})
