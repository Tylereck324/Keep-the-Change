'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

const WARNING_THRESHOLD_SECONDS = 60 * 60 * 24
const AUTO_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 2
const CHECK_INTERVAL_MS = 5 * 60 * 1000
const REFRESH_COOLDOWN_MS = 5 * 60 * 1000

function formatRemaining(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours <= 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function SessionMonitor() {
  const router = useRouter()
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [expiringSoon, setExpiringSoon] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const lastRefreshAttempt = useRef(0)

  const applyStatus = useCallback((remaining: number | null, expiring: boolean) => {
    setTimeRemaining(remaining)
    setExpiringSoon(expiring)
  }, [])

  const updateStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', { method: 'GET', cache: 'no-store' })

      if (response.status === 401) {
        applyStatus(null, false)
        setError(null)
        return
      }

      if (!response.ok) {
        setError('Failed to check session')
        return
      }

      const data = await response.json()
      const remaining = typeof data.timeRemaining === 'number' ? data.timeRemaining : null
      const expiring =
        typeof data.expiringSoon === 'boolean'
          ? data.expiringSoon
          : remaining !== null && remaining < WARNING_THRESHOLD_SECONDS

      applyStatus(remaining, expiring)
      setError(null)
    } catch {
      setError('Failed to check session')
    }
  }, [applyStatus])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    lastRefreshAttempt.current = Date.now()

    try {
      const response = await fetch('/api/auth/refresh', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Failed to refresh session')
        return
      }

      const remaining = typeof data.timeRemaining === 'number' ? data.timeRemaining : null
      const expiring = remaining !== null && remaining < WARNING_THRESHOLD_SECONDS

      applyStatus(remaining, expiring)
    } catch {
      setError('Failed to refresh session')
    } finally {
      setIsRefreshing(false)
    }
  }, [applyStatus])

  const maybeAutoRefresh = useCallback(() => {
    if (isRefreshing || timeRemaining === null) return
    if (timeRemaining >= AUTO_REFRESH_THRESHOLD_SECONDS) return

    const now = Date.now()
    if (now - lastRefreshAttempt.current < REFRESH_COOLDOWN_MS) return

    void handleRefresh()
  }, [handleRefresh, isRefreshing, timeRemaining])

  useEffect(() => {
    void updateStatus()
    const intervalId = window.setInterval(updateStatus, CHECK_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [updateStatus])

  useEffect(() => {
    const onActivity = () => {
      if (document.visibilityState === 'hidden') return
      maybeAutoRefresh()
    }

    window.addEventListener('mousemove', onActivity)
    window.addEventListener('keydown', onActivity)
    document.addEventListener('visibilitychange', onActivity)

    return () => {
      window.removeEventListener('mousemove', onActivity)
      window.removeEventListener('keydown', onActivity)
      document.removeEventListener('visibilitychange', onActivity)
    }
  }, [maybeAutoRefresh])

  if (!expiringSoon && !error) return null

  const remainingLabel = timeRemaining !== null ? formatRemaining(timeRemaining) : null

  return (
    <div className="px-4 pt-4 md:px-6">
      <Alert variant={error ? 'destructive' : 'default'}>
        <AlertTitle>Session expiring</AlertTitle>
        <AlertDescription>
          {error ? (
            <p>{error}</p>
          ) : (
            <p>{remainingLabel ? `Session expires in ${remainingLabel}.` : 'Session expiring soon.'}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing…' : 'Stay signed in'}
            </Button>
            {error ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => router.refresh()}
              >
                Sign in again
              </Button>
            ) : null}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
