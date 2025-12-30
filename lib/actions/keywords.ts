'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import type { CategoryKeyword } from '@/lib/types'

/**
 * Validates that a keyword is valid
 */
function validateKeyword(keyword: string): void {
  if (!keyword || keyword.trim().length === 0) {
    throw new Error('Keyword cannot be empty')
  }
  if (keyword.length > 100) {
    throw new Error('Keyword must be 100 characters or less')
  }
}

/**
 * Get all keywords for a specific category
 */
export async function getKeywordsByCategory(categoryId: string): Promise<CategoryKeyword[]> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  if (!categoryId || categoryId.trim() === '') {
    throw new Error('Category ID is required')
  }

  const { data, error } = await supabase
    .from('category_keywords')
    .select('*')
    .eq('household_id', householdId)
    .eq('category_id', categoryId)
    .order('keyword')

  if (error) {
    throw new Error(`Failed to fetch keywords: ${error.message}`)
  }

  return data || []
}

/**
 * Get all keywords grouped by category
 */
export async function getAllKeywords(): Promise<Record<string, CategoryKeyword[]>> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('category_keywords')
    .select('*')
    .eq('household_id', householdId)
    .order('keyword')

  if (error) {
    throw new Error(`Failed to fetch keywords: ${error.message}`)
  }

  // Group keywords by category_id
  const keywordsByCategory: Record<string, CategoryKeyword[]> = {}
  const keywords = (data || []) as CategoryKeyword[]

  for (const keyword of keywords) {
    if (!keywordsByCategory[keyword.category_id]) {
      keywordsByCategory[keyword.category_id] = []
    }
    keywordsByCategory[keyword.category_id].push(keyword)
  }

  return keywordsByCategory
}

/**
 * Add a keyword to a category
 * Keywords are normalized to lowercase for case-insensitive matching
 */
export async function addKeyword(categoryId: string, keyword: string): Promise<CategoryKeyword> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate inputs
  if (!categoryId || categoryId.trim() === '') {
    throw new Error('Category ID is required')
  }
  validateKeyword(keyword)

  // Normalize keyword to lowercase
  const normalizedKeyword = keyword.trim().toLowerCase()

  // Check for duplicates
  const { data: existing } = await supabase
    .from('category_keywords')
    .select('id')
    .eq('household_id', householdId)
    .eq('category_id', categoryId)
    .eq('keyword', normalizedKeyword)
    .single()

  if (existing) {
    throw new Error('This keyword already exists for this category')
  }

  // Insert the keyword
  const { data, error } = await supabase
    .from('category_keywords')
    // @ts-expect-error - Supabase client type inference issue
    .insert({
      household_id: householdId,
      category_id: categoryId,
      keyword: normalizedKeyword,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add keyword: ${error.message}`)
  }

  revalidatePath('/')
  return data as CategoryKeyword
}

/**
 * Delete a keyword
 */
export async function deleteKeyword(keywordId: string): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  if (!keywordId || keywordId.trim() === '') {
    throw new Error('Keyword ID is required')
  }

  const { error } = await supabase
    .from('category_keywords')
    .delete()
    .eq('id', keywordId)
    .eq('household_id', householdId)

  if (error) {
    throw new Error(`Failed to delete keyword: ${error.message}`)
  }

  revalidatePath('/')
}
