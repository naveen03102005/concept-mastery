import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

if (!SUPABASE_URL) {
  console.warn('⚠️  SUPABASE_URL is not set in .env');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY is not set in .env');
}

/**
 * Server-side Supabase client using the service_role key.
 * The service_role key bypasses Row Level Security (RLS).
 * NEVER expose this key to the browser / frontend.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export default supabase;
