import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPin, verifyPin, getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const householdId = await getSession()
    if (!householdId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { currentPin, newPin } = body

    // Validate new PIN
    if (!newPin || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      return NextResponse.json(
        { error: 'New PIN must be 4-6 digits' },
        { status: 400 }
      )
    }

    // Validate current PIN is provided
    if (!currentPin) {
      return NextResponse.json(
        { error: 'Current PIN is required' },
        { status: 400 }
      )
    }

    // Get current household
    const { data: household, error: fetchError } = await supabase
      .from('households')
      .select('pin_hash')
      .eq('id', householdId)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch household' },
        { status: 500 }
      )
    }

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 })
    }

    // Verify current PIN
    // @ts-expect-error - Supabase client type inference issue
    const isValid = await verifyPin(currentPin, household.pin_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 401 })
    }

    // Update PIN
    const newPinHash = await hashPin(newPin)
    const { error: updateError } = await supabase
      .from('households')
      // @ts-expect-error - Supabase client type inference issue
      .update({ pin_hash: newPinHash })
      .eq('id', householdId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update PIN' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
