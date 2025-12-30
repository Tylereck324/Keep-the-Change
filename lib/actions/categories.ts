'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import type { Category } from '@/lib/types'
import { validateName, validateColor } from '@/lib/utils/validators'

export async function getCategories(): Promise<Category[]> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId)
    .order('name')

  if (error) throw new Error(`Failed to fetch categories: ${error.message}`)
  return data || []
}

export async function createCategory(name: string, color: string): Promise<Category> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate inputs
  validateName(name)
  validateColor(color)

  // Check for duplicate category name (case-insensitive)
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('household_id', householdId)
    .ilike('name', name.trim())
    .maybeSingle()

  if (existing) {
    throw new Error('A category with this name already exists')
  }

  const { data, error } = await supabase
    .from('categories')
    // @ts-expect-error - Supabase client type inference issue
    .insert({
      household_id: householdId,
      name: name.trim(),
      color,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create category: ${error.message}`)

  revalidatePath('/')
  return data as Category
}

export async function updateCategory(id: string, name: string, color: string): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate inputs
  validateName(name)
  validateColor(color)

  // Check for duplicate category name (case-insensitive), excluding current category
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('household_id', householdId)
    .ilike('name', name.trim())
    .neq('id', id)
    .maybeSingle()

  if (existing) {
    throw new Error('A category with this name already exists')
  }

  const { error } = await supabase
    .from('categories')
    // @ts-expect-error - Supabase client type inference issue
    .update({
      name: name.trim(),
      color
    })
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) throw new Error(`Failed to update category: ${error.message}`)

  revalidatePath('/')
}

export async function deleteCategory(id: string): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) throw new Error(`Failed to delete category: ${error.message}`)

  revalidatePath('/')
}
