import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { supabase } from './supabase'

const COOKIE_NAME = 'household_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

export async function createSession(householdId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, householdId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getHousehold() {
  const householdId = await getSession()
  if (!householdId) return null

  const { data } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .single()

  return data
}

export async function checkHouseholdExists() {
  const { data } = await supabase
    .from('households')
    .select('id')
    .limit(1)
    .single()

  return !!data
}
