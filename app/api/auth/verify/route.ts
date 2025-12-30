import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyPin, createSession } from '@/lib/auth'
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/utils/rate-limit'
import type { Database } from '@/lib/types'

type HouseholdRow = Database['public']['Tables']['households']['Row']

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('cf-connecting-ip') ?? 'unknown'

    // Check rate limiting (persistent via Supabase)
    const rateLimit = await checkRateLimit(ip)
    if (!rateLimit.allowed) {
      const waitSeconds = rateLimit.lockoutEndsAt
        ? Math.ceil((rateLimit.lockoutEndsAt.getTime() - Date.now()) / 1000)
        : 300
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${waitSeconds} seconds.` },
        { status: 429 }
      )
    }

    // Parse JSON with error handling
    let body: unknown
    try {
      body = await request.json()
    } catch {
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
      // Record failed attempt (persistent)
      await recordFailedAttempt(ip)

      return NextResponse.json(
        { error: 'Incorrect PIN' },
        { status: 401 }
      )
    }

    // Clear rate limit on success
    await clearRateLimit(ip)

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

