'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function getCategories() {
  const householdId = await getSession()
  if (!householdId) return []

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId)
    .order('name')

  if (error) throw error
  return data || []
}

export async function createCategory(name: string, color: string) {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('categories')
    .insert({
      household_id: householdId,
      name,
      color,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/')
  return data
}

export async function updateCategory(id: string, name: string, color: string) {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('categories')
    .update({ name, color })
    .eq('id', id)
    .eq('household_id', householdId)
    .select()
    .single()

  if (error) throw error

  revalidatePath('/')
  return data
}

export async function deleteCategory(id: string) {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) throw error

  revalidatePath('/')
}
