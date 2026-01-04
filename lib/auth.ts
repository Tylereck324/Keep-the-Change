import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import { supabaseAdmin } from './supabase-server'

const COOKIE_NAME = 'household_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const SESSION_WARNING_THRESHOLD = 60 * 60 * 24 // 24 hours before expiry

/**
 * Get secret key for JWT signing.
 * THROWS in production if SESSION_SECRET is not set (P1-1 fix).
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: SESSION_SECRET environment variable must be set in production. ' +
        'Generate a secure random string (e.g., `openssl rand -base64 32`) and add to your environment.'
      )
    }
    // Development fallback only
    return new TextEncoder().encode('development-only-secret-do-not-use-in-production')
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

/**
 * Helper to require session - throws if not authenticated.
 * Use this in server actions for consistent auth error handling (P2-1 fix).
 */
export async function requireSession(): Promise<string> {
  const householdId = await getSession()
  if (!householdId) {
    throw new Error('Not authenticated')
  }
  return householdId
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getHousehold() {
  const householdId = await getSession()
  if (!householdId) return null

  const { data } = await supabaseAdmin
    .from('households')
    .select('*')
    .eq('id', householdId)
    .single()

  return data
}

export async function checkHouseholdExists() {
  const { data } = await supabaseAdmin
    .from('households')
    .select('id')
    .limit(1)
    .single()

  return !!data
}

/**
 * Get remaining time until session expiry in seconds.
 * Returns null if no valid session exists.
 * Phase 1.1: Session refresh mechanism
 */
export async function getSessionTimeRemaining(): Promise<number | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getSecretKey())

    if (!payload.exp) return null

    const now = Math.floor(Date.now() / 1000)
    const remaining = payload.exp - now

    return remaining > 0 ? remaining : 0
  } catch {
    return null
  }
}

/**
 * Check if session is approaching expiry (< 24 hours remaining).
 * Phase 1.1: Session refresh mechanism
 */
export async function isSessionExpiringSoon(): Promise<boolean> {
  const remaining = await getSessionTimeRemaining()
  if (remaining === null) return false

  return remaining < SESSION_WARNING_THRESHOLD
}

/**
 * Refresh the current session by creating a new token with extended expiry.
 * Phase 1.1: Session refresh mechanism
 */
export async function refreshSession(): Promise<{ success: boolean; expiresIn?: number; error?: string }> {
  const householdId = await getSession()

  if (!householdId) {
    return { success: false, error: 'No active session to refresh' }
  }

  await createSession(householdId)

  return { success: true, expiresIn: COOKIE_MAX_AGE }
}
