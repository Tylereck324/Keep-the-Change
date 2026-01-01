import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { hashPin, createSession } from '@/lib/auth'
import type { Database } from '@/lib/types'

type HouseholdRow = Database['public']['Tables']['households']['Row']
type HouseholdInsert = Database['public']['Tables']['households']['Insert']

// Ensure this route is dynamic
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
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

    // Validate PIN
    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be 4-6 digits' },
        { status: 400 }
      )
    }

    // Check if household already exists
    const { data: existing } = await supabaseAdmin
      .from('households')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Household already exists' },
        { status: 400 }
      )
    }

    // Create household with hashed PIN
    const pinHash = await hashPin(pin)
    const { data: household, error } = await supabaseAdmin
      .from('households')
      .insert({
        name: 'My Household',
        pin_hash: pinHash,
      })
      .select()
      .single()

    if (error || !household) {
      console.error('Household creation error:', error)
      return NextResponse.json(
        {
          error: 'Failed to create household',
          details: error?.message || 'Unknown error',
          code: error?.code
        },
        { status: 500 }
      )
    }

    // Create session
    const householdData = household as HouseholdRow
    await createSession(householdData.id)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Setup error:', error)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
