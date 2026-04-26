import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:8000';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.warn('⚠️ SUPABASE_SERVICE_KEY not set — Supabase admin operations will fail');
}

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Regular anon client for public operations
export const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_URL + '/anon-key-placeholder',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
