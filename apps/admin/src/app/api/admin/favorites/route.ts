import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

export async function GET() {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServiceClient();

  const { data: favorites } = await supabase
    .from('favorite_drivers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const raw = favorites || [];

  const allIds = [...new Set([
    ...raw.map((f: any) => f.rider_id),
    ...raw.map((f: any) => f.driver_id),
  ])];

  let profiles: Record<string, { name: string; email: string }> = {};
  if (allIds.length > 0) {
    const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', allIds);
    for (const p of profs || []) {
      profiles[p.id] = { name: p.full_name || 'Unknown', email: p.email || '' };
    }
  }

  return NextResponse.json({ favorites: raw, profiles });
}
