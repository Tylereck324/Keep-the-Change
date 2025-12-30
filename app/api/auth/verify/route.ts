import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyPin, createSession } from '@/lib/auth'
import type { Database } from '@/lib/types'

type HouseholdRow = Database['public']['Tables']['households']['Row']

// Rate limiting: track failed attempts in memory (resets on server restart)
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 3
const LOCKOUT_DURATION = 5 * 60 * 1000 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('cf-connecting-ip') ?? 'local'
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

    // Parse JSON with error handling
    let body: unknown
    try {
      body = await request.json()
    } catch (error: unknown) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    const { pin } = body as { pin?: string }

    // Validate PIN format
    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be 4-6 digits' },
        { status: 400 }
      )
    }

    // Get household
    const { data: household } = await supabase
      .from('households')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (!household) {
      return NextResponse.json(
        { error: 'No household found' },
        { status: 404 }
      )
    }

    // Verify PIN
    const householdData = household as HouseholdRow
    const isValid = await verifyPin(pin, householdData.pin_hash)

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
    await createSession(householdData.id)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Verify error:', error)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
