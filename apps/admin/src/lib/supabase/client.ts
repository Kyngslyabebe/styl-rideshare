import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Client-side: anon key only (safe for browser)
let client: ReturnType<typeof createSupabaseClient<any>> | null = null;

export function createClient() {
  if (!client) {
    client = createSupabaseClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

// Server-side only: service role key (never sent to browser)
export function createServiceClient() {
  return createSupabaseClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
