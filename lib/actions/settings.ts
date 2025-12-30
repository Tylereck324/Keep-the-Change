'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function getAutoRolloverSetting(): Promise<boolean> {
  const householdId = await getSession()
  if (!householdId) return false

  const { data } = await supabase
    .from('households')
    .select('auto_rollover_budget')
    .eq('id', householdId)
    .maybeSingle()

  return data?.auto_rollover_budget ?? false
}

export async function setAutoRolloverSetting(enabled: boolean): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('households')
    .update({ auto_rollover_budget: enabled })
    .eq('id', householdId)

  if (error) {
    throw new Error(`Failed to update setting: ${error.message}`)
  }

  revalidatePath('/settings')
  revalidatePath('/')
}
