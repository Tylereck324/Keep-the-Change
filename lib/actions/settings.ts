'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'

export async function getAutoRolloverSetting(): Promise<boolean> {
  const householdId = await getSession()
  if (!householdId) return false

  const { data } = await supabaseAdmin
    .from('households')
    .select('auto_rollover_budget')
    .eq('id', householdId)
    .maybeSingle()

  return data?.auto_rollover_budget ?? false
}

export async function setAutoRolloverSetting(enabled: boolean): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { error } = await supabaseAdmin
    .from('households')
    .update({ auto_rollover_budget: enabled })
    .eq('id', householdId)

  if (error) {
    throw new Error(`Failed to update setting: ${error.message}`)
  }

  revalidatePath('/settings')
  revalidatePath('/')
}

export async function getHouseholdTimezone(): Promise<string> {
  const householdId = await getSession()
  if (!householdId) return 'UTC'

  const { data } = await supabaseAdmin
    .from('households')
    .select('timezone')
    .eq('id', householdId)
    .maybeSingle()

  return data?.timezone ?? 'UTC'
}

export async function setHouseholdTimezone(timezone: string): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { error } = await supabaseAdmin
    .from('households')
    .update({ timezone })
    .eq('id', householdId)

  if (error) {
    throw new Error(`Failed to update timezone: ${error.message}`)
  }

  revalidatePath('/settings')
  revalidatePath('/')
}
