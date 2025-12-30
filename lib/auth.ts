import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import { supabase } from './supabase'

const COOKIE_NAME = 'household_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// Get secret key for JWT signing (falls back to development key if not set)
function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'development-secret-change-in-production'
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    console.warn('WARNING: SESSION_SECRET not set in production!')
  }
  return new TextEncoder().encode(secret)
}

interface SessionPayload extends JWTPayload {
  householdId: string
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

export async function createSession(householdId: string): Promise<void> {
  const cookieStore = await cookies()

  // Create signed JWT with householdId
  const token = await new SignJWT({ householdId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecretKey())

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  try {
    // Verify JWT signature and expiration
    const { payload } = await jwtVerify(token, getSecretKey())
    const sessionPayload = payload as SessionPayload
    return sessionPayload.householdId ?? null
  } catch {
    // Invalid or expired token
    return null
  }
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

