import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SessionMonitor } from '@/components/session-monitor'

const routerMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerMocks.refresh }),
}))

function makeResponse(status: number, body: Record<string, unknown>) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

describe('SessionMonitor', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
     
    global.fetch = fetchMock as any
  })

  afterEach(() => {
    fetchMock.mockReset()
    routerMocks.refresh.mockReset()
  })

  it('does not render a banner when there is no active session', async () => {
    fetchMock.mockImplementationOnce(() => makeResponse(401, { error: 'No active session' }))

    render(<SessionMonitor />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows a warning banner when the session is expiring soon', async () => {
    fetchMock.mockImplementationOnce(() =>
      makeResponse(200, { timeRemaining: 60 * 60, expiringSoon: true })
    )

    render(<SessionMonitor />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).not.toBeNull()
    })

    expect(screen.getByRole('button', { name: /stay signed in/i })).not.toBeNull()
  })

  it('refreshes the session when the user clicks stay signed in', async () => {
    fetchMock
      .mockImplementationOnce(() =>
        makeResponse(200, { timeRemaining: 60 * 60, expiringSoon: true })
      )
      .mockImplementationOnce(() =>
        makeResponse(200, { success: true, expiresIn: 30, timeRemaining: 60 * 60 * 25 })
      )

    render(<SessionMonitor />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /stay signed in/i })).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: /stay signed in/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })

  it('offers a sign in action when refresh fails', async () => {
    fetchMock
      .mockImplementationOnce(() =>
        makeResponse(200, { timeRemaining: 60 * 60, expiringSoon: true })
      )
      .mockImplementationOnce(() =>
        makeResponse(401, { error: 'No active session to refresh' })
      )

    render(<SessionMonitor />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /stay signed in/i })).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: /stay signed in/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in again/i })).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: /sign in again/i }))

    expect(routerMocks.refresh).toHaveBeenCalled()
  })
})
