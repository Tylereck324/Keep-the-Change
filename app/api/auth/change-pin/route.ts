import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { hashPin, verifyPin, getSession } from '@/lib/auth'

// Ensure this route is dynamic
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const householdId = await getSession()
    if (!householdId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { currentPin, newPin } = body as { currentPin?: string; newPin?: string }

    // Validate PINs
    if (!currentPin || currentPin.length < 4 || currentPin.length > 6 || !/^\d+$/.test(currentPin)) {
      return NextResponse.json({ error: 'Current PIN must be 4-6 digits' }, { status: 400 })
    }
    if (!newPin || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      return NextResponse.json({ error: 'New PIN must be 4-6 digits' }, { status: 400 })
    }

    // Get household
    const { data: household } = await supabaseAdmin
      .from('households')
      .select('pin_hash')
      .eq('id', householdId)
      .single()

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 })
    }

    // Verify current PIN
    const isValid = await verifyPin(currentPin, household.pin_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 401 })
    }

    // Hash and update new PIN
    const newPinHash = await hashPin(newPin)
    const { error } = await supabaseAdmin
      .from('households')
      .update({ pin_hash: newPinHash })
      .eq('id', householdId)

    if (error) {
      return NextResponse.json({ error: 'Failed to update PIN' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Change PIN error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
