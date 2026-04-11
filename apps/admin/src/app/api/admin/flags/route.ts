import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServiceClient();

  const url = new URL(req.url);
  const filter = url.searchParams.get('filter') || 'unresolved';
  const typeFilter = url.searchParams.get('type') || 'all';

  let query = supabase.from('ride_flags').select('*').order('created_at', { ascending: false }).limit(200);
  if (filter === 'unresolved') query = query.eq('resolved', false);
  if (filter === 'resolved') query = query.eq('resolved', true);
  if (typeFilter !== 'all') query = query.eq('flag_type', typeFilter);

  const { data: flags } = await query;
  const rawFlags = flags || [];

  // Fetch names
  const allIds = [...new Set([
    ...rawFlags.map((f: any) => f.driver_id).filter(Boolean),
    ...rawFlags.map((f: any) => f.rider_id).filter(Boolean),
  ])];

  let nameMap: Record<string, string> = {};
  if (allIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', allIds);
    for (const p of profiles || []) nameMap[p.id] = p.full_name || 'Unknown';
  }

  // Stats
  const [totalRes, unresolvedRes, todayRes] = await Promise.all([
    supabase.from('ride_flags').select('id', { count: 'exact', head: true }),
    supabase.from('ride_flags').select('id', { count: 'exact', head: true }).eq('resolved', false),
    (() => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return supabase.from('ride_flags').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString());
    })(),
  ]);

  return NextResponse.json({
    flags: rawFlags,
    nameMap,
    stats: {
      total: totalRes.count || 0,
      unresolved: unresolvedRes.count || 0,
      today: todayRes.count || 0,
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServiceClient();
  const { flagId, updates } = await req.json();

  if (!flagId) return NextResponse.json({ error: 'flagId required' }, { status: 400 });

  const { error } = await supabase.from('ride_flags').update(updates).eq('id', flagId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
