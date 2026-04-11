import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServiceClient();

  const url = new URL(req.url);
  const period = url.searchParams.get('period') || 'week';
  const status = url.searchParams.get('status') || 'all';

  const now = new Date();
  let start: Date | null = null;
  if (period === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (period === 'week') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  else if (period === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);

  let query = supabase.from('rides').select('*').order('created_at', { ascending: false }).limit(200);
  if (start) query = query.gte('created_at', start.toISOString());
  if (status !== 'all') query = query.eq('status', status);

  const { data: rides } = await query;
  const list = rides || [];

  // Fetch profiles for drivers and riders
  const allIds = [...new Set([
    ...list.map((r: any) => r.driver_id).filter(Boolean),
    ...list.map((r: any) => r.rider_id).filter(Boolean),
  ])];

  let profiles: Record<string, any> = {};
  if (allIds.length > 0) {
    const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', allIds);
    for (const p of profs || []) profiles[p.id] = p;
  }

  return NextResponse.json({ rides: list, profiles });
}
