import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

/**
 * Verifies the current request is from an authenticated admin user.
 * Reads the Bearer token from the Authorization header,
 * validates it with Supabase, then checks profile.role = 'admin'.
 * Returns the user ID if admin, null otherwise.
 */
export async function verifyAdmin(): Promise<string | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const headerStore = await headers();
    const authHeader = headerStore.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) return null;

    // Verify the JWT and get the user
    const supabase = createClient(url, serviceKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return null;

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') return null;

    return user.id;
  } catch {
    return null;
  }
}
