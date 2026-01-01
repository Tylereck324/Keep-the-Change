import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyPin, createSession } from '@/lib/auth'
import type { Database } from '@/lib/types'

type HouseholdRow = Database['public']['Tables']['households']['Row']

// Ensure this route is dynamic
export const dynamic = 'force-dynamic'

/**
 * Check rate limit using database-backed auth_attempts table.
 * Works correctly on serverless (Vercel) unlike in-memory rate limiting.
 */
async function checkRateLimit(ip: string): Promise<{ blocked: boolean; waitSeconds: number }> {
  try {
    const { data, error } = await supabaseAdmin.rpc('check_auth_rate_limit', {
      p_ip_address: ip,
    })

    if (error) {
      console.error('Rate limit check error:', error)
      // Fail open - allow request but log the error
      return { blocked: false, waitSeconds: 0 }
    }

    const result = data?.[0]
    if (!result) {
      return { blocked: false, waitSeconds: 0 }
    }

    return {
      blocked: result.is_blocked,
      waitSeconds: result.wait_seconds || 0,
    }
  } catch (error) {
    console.error('Rate limit check exception:', error)
    return { blocked: false, waitSeconds: 0 }
  }
}

/**
 * Record a failed auth attempt in the database.
 */
async function recordFailedAttempt(ip: string): Promise<void> {
  try {
    await supabaseAdmin.rpc('record_auth_failure', {
      p_ip_address: ip,
    })
  } catch (error) {
    console.error('Failed to record auth failure:', error)
  }
}

/**
 * Clear auth attempts on successful login.
 */
async function clearAuthAttempts(ip: string): Promise<void> {
  try {
    await supabaseAdmin.rpc('clear_auth_attempts', {
      p_ip_address: ip,
    })
  } catch (error) {
    console.error('Failed to clear auth attempts:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('cf-connecting-ip') ?? 'unknown'

    // Check rate limiting (persistent via Supabase)
    const rateLimit = await checkRateLimit(ip)
    if (rateLimit.blocked) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rateLimit.waitSeconds} seconds.` },
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
    const { data: household } = await supabaseAdmin
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
    await clearAuthAttempts(ip)

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

