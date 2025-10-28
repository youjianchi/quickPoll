import { createClient } from '@supabase/supabase-js';

let cachedAnonClient = null;
let cachedServiceClient = null;

function assertEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAnonClient() {
  if (cachedAnonClient) {
    return cachedAnonClient;
  }

  const supabaseUrl = assertEnv('SUPABASE_URL', process.env.SUPABASE_URL);
  const anonKey = assertEnv('SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);

  cachedAnonClient = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAnonClient;
}

export function getServiceClient() {
  if (cachedServiceClient) {
    return cachedServiceClient;
  }

  const supabaseUrl = assertEnv('SUPABASE_URL', process.env.SUPABASE_URL);
  const serviceRoleKey = assertEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  cachedServiceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedServiceClient;
}
