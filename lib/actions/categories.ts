'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import type { Category, Database } from '@/lib/types'

/**
 * Validates that a category name is valid
 */
function validateName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error('Category name cannot be empty')
  }
  if (name.length > 100) {
    throw new Error('Category name must be 100 characters or less')
  }
}

/**
 * Validates that a color is a valid hex color format
 */
function validateColor(color: string): void {
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
  if (!hexColorRegex.test(color)) {
    throw new Error('Color must be a valid hex color format (e.g., #FF5733)')
  }
}

export async function getCategories(): Promise<Category[]> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId)
    .is('deleted_at', null)
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

  // Check for existing active category with same name
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('household_id', householdId)
    .ilike('name', name.trim())
    .is('deleted_at', null)
    .single()

  if (existing) {
    throw new Error('An active category with this name already exists')
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

  revalidatePath('/', 'layout')
  return data as Category
}

export async function updateCategory(id: string, name: string, color: string): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate inputs
  validateName(name)
  validateColor(color)

  // Check for existing active category with same name (excluding current one)
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('household_id', householdId)
    .ilike('name', name.trim())
    .is('deleted_at', null)
    .neq('id', id)
    .single()

  if (existing) {
    throw new Error('An active category with this name already exists')
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

  revalidatePath('/', 'layout')
}

export async function deleteCategory(id: string): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('categories')
    // @ts-expect-error - Supabase client type inference issue with new column
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) throw new Error(`Failed to delete category: ${error.message}`)

  revalidatePath('/', 'layout')
}
