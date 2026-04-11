import { createClient } from '@/lib/supabase/client';

/**
 * Fetch wrapper that attaches the Supabase auth token to admin API requests.
 * Use this instead of plain fetch() for /api/admin/* routes.
 */
export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
