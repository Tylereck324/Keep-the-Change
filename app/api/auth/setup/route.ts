import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPin, createSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

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
      .single()

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
      .insert({ name: 'My Household', pin_hash: pinHash })
      .select()
      .single()

    if (error || !household) {
      return NextResponse.json(
        { error: 'Failed to create household' },
        { status: 500 }
      )
    }

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
