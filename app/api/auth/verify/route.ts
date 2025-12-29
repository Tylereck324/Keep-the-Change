import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyPin, createSession } from '@/lib/auth'

// Rate limiting: track failed attempts in memory (resets on server restart)
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 60 * 1000 // 1 minute

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const now = Date.now()

    // Check rate limiting
    const attempts = failedAttempts.get(ip)
    if (attempts && attempts.count >= MAX_ATTEMPTS) {
      const timeSinceLast = now - attempts.lastAttempt
      if (timeSinceLast < LOCKOUT_DURATION) {
        const waitSeconds = Math.ceil((LOCKOUT_DURATION - timeSinceLast) / 1000)
        return NextResponse.json(
          { error: `Too many attempts. Try again in ${waitSeconds} seconds.` },
          { status: 429 }
        )
      }
      // Reset after lockout period
      failedAttempts.delete(ip)
    }

    const { pin } = await request.json()

    if (!pin) {
      return NextResponse.json(
        { error: 'PIN is required' },
        { status: 400 }
      )
    }

    // Get household
    const { data: household } = await supabase
      .from('households')
      .select('*')
      .limit(1)
      .single()

    if (!household) {
      return NextResponse.json(
        { error: 'No household found' },
        { status: 404 }
      )
    }

    // Verify PIN
    const isValid = await verifyPin(pin, household.pin_hash)

    if (!isValid) {
      // Track failed attempt
      const current = failedAttempts.get(ip) ?? { count: 0, lastAttempt: now }
      failedAttempts.set(ip, { count: current.count + 1, lastAttempt: now })

      return NextResponse.json(
        { error: 'Incorrect PIN' },
        { status: 401 }
      )
    }

    // Clear failed attempts on success
    failedAttempts.delete(ip)

    // Create session
    await createSession(household.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
