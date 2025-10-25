import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let cachedClient = null;

export function getSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }

  if (!supabaseUrl) {
    cachedClient = {
      client: null,
      error:
        'Missing VITE_SUPABASE_URL. Create client/.env with your Supabase project URL (see .env.example).',
    };
    return cachedClient;
  }

  if (!supabaseAnonKey) {
    cachedClient = {
      client: null,
      error:
        'Missing VITE_SUPABASE_ANON_KEY. Populate client/.env with your Supabase anon key (see .env.example).',
    };
    return cachedClient;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  cachedClient = { client, error: null };
  return cachedClient;
}
