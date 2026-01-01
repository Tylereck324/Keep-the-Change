-- Enable RLS on auth_attempts table
-- By default, this blocks all access for anon and authenticated users
-- Only Service Role (supabaseAdmin) can bypass this.

ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;
