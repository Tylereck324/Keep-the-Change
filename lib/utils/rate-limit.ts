'use server'

import { supabase } from '@/lib/supabase'

const MAX_ATTEMPTS = 3
const LOCKOUT_DURATION_MS = 5 * 60 * 1000 // 5 minutes

interface RateLimitResult {
    allowed: boolean
    remainingAttempts: number
    lockoutEndsAt?: Date
}

interface AuthAttemptRecord {
    ip_address: string
    attempt_count: number
    last_attempt_at: string
    lockout_until: string | null
}

/**
 * Check if an IP is rate limited for PIN verification.
 * Uses Supabase to persist rate limit state across server restarts.
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
    const now = new Date()

    // Get existing attempts for this IP
    const { data: existing } = await supabase
        .from('auth_attempts')
        .select('*')
        .eq('ip_address', ip)
        .maybeSingle()

    if (!existing) {
        return { allowed: true, remainingAttempts: MAX_ATTEMPTS }
    }

    const record = existing as AuthAttemptRecord
    const lockoutEndsAt = record.lockout_until ? new Date(record.lockout_until) : null

    // Check if currently locked out
    if (lockoutEndsAt && lockoutEndsAt > now) {
        return {
            allowed: false,
            remainingAttempts: 0,
            lockoutEndsAt,
        }
    }

    // If lockout expired, reset
    if (lockoutEndsAt && lockoutEndsAt <= now) {
        await supabase
            .from('auth_attempts')
            .delete()
            .eq('ip_address', ip)
        return { allowed: true, remainingAttempts: MAX_ATTEMPTS }
    }

    const remainingAttempts = MAX_ATTEMPTS - record.attempt_count
    return {
        allowed: remainingAttempts > 0,
        remainingAttempts: Math.max(0, remainingAttempts),
    }
}

/**
 * Record a failed PIN verification attempt.
 */
export async function recordFailedAttempt(ip: string): Promise<void> {
    const now = new Date()

    // Get existing attempts
    const { data: existing } = await supabase
        .from('auth_attempts')
        .select('*')
        .eq('ip_address', ip)
        .maybeSingle()

    if (!existing) {
        // First failed attempt
        await supabase
            .from('auth_attempts')
            // @ts-expect-error - Supabase type inference issue, will be fixed in PR3
            .insert({
                ip_address: ip,
                attempt_count: 1,
                last_attempt_at: now.toISOString(),
            })
    } else {
        const record = existing as AuthAttemptRecord
        const newCount = record.attempt_count + 1
        const updateData: Record<string, unknown> = {
            attempt_count: newCount,
            last_attempt_at: now.toISOString(),
        }

        // If max attempts reached, set lockout
        if (newCount >= MAX_ATTEMPTS) {
            const lockoutUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS)
            updateData.lockout_until = lockoutUntil.toISOString()
        }

        await supabase
            .from('auth_attempts')
            // @ts-expect-error - Supabase type inference issue, will be fixed in PR3
            .update(updateData)
            .eq('ip_address', ip)
    }
}

/**
 * Clear rate limit on successful authentication.
 */
export async function clearRateLimit(ip: string): Promise<void> {
    await supabase
        .from('auth_attempts')
        .delete()
        .eq('ip_address', ip)
}
