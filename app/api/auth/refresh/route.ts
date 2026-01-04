import { NextResponse } from 'next/server'
import { getSessionTimeRemaining, refreshSession } from '@/lib/auth'

/**
 * POST /api/auth/refresh
 * Refresh the user's session to extend expiry.
 * Phase 1.1: Session refresh mechanism
 */
export async function POST() {
  try {
    const result = await refreshSession()

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    const timeRemaining = await getSessionTimeRemaining()

    return NextResponse.json({
      success: true,
      expiresIn: result.expiresIn,
      timeRemaining,
    })
  } catch (error) {
    console.error('Session refresh error:', error)
    return NextResponse.json({ error: 'Failed to refresh session' }, { status: 500 })
  }
}

/**
 * GET /api/auth/refresh
 * Get session status without refreshing.
 */
export async function GET() {
  try {
    const timeRemaining = await getSessionTimeRemaining()

    if (timeRemaining === null) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 })
    }

    return NextResponse.json({
      timeRemaining,
      expiringSoon: timeRemaining < 60 * 60 * 24,
    })
  } catch (error) {
    console.error('Session status error:', error)
    return NextResponse.json({ error: 'Failed to get session status' }, { status: 500 })
  }
}
