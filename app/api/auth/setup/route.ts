import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPin, createSession } from '@/lib/auth'
import type { Database } from '@/lib/types'

type HouseholdRow = Database['public']['Tables']['households']['Row']
type HouseholdInsert = Database['public']['Tables']['households']['Insert']

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
    const { data: existing } = await supabase
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
    const { data: household, error } = await supabase
      .from('households')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        name: 'My Household',
        pin_hash: pinHash
      } as any)
      .select()
      .single()

    if (error || !household) {
      return NextResponse.json(
        { error: 'Failed to create household' },
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
