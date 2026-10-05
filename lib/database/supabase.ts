import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns an initialized Supabase client if configured.
 * Uses service role key on server if available, otherwise falls back to anon key.
 * Never exposes service role key to the browser.
 */
export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: { persistSession: false },
      });
      return supabaseInstance;
    } catch (err) {
      console.warn('[Supabase] Failed to initialize client:', err);
    }
  }

  return null;
}
