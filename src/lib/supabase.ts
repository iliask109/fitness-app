import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null when the app runs in local demo mode (no Supabase keys configured). */
export const supabase: SupabaseClient | null =
  url && key && !url.includes('YOUR-PROJECT') ? createClient(url, key) : null;

export const isDemo = supabase === null;
