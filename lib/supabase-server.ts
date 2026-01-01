/**
 * Server-side Supabase client with service role key.
 * 
 * IMPORTANT: This client bypasses RLS policies - use ONLY in server actions
 * and API routes where you manually verify household_id ownership.
 * 
 * Never import this in client components (won't work anyway since the
 * env var isn't public).
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

// Only validate service key on server (it won't exist in client bundles)
if (typeof window === 'undefined' && !supabaseServiceKey) {
  console.warn(
    'WARNING: SUPABASE_SERVICE_ROLE_KEY not set. Server-side database operations will fail.'
  )
}

/**
 * Admin Supabase client for server-side operations.
 * Bypasses RLS - always filter by household_id in your queries!
 */
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey || '', // Empty string to prevent crash on import, but operations will fail
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  }
)
