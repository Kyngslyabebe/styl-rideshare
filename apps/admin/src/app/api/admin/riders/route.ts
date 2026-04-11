import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

const UNAUTHORIZED = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// GET — list all riders with ride stats
export async function GET() {
  if (!(await verifyAdmin())) return UNAUTHORIZED;
  const supabase = createServiceClient();

  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString();

  const [ridersRes, newRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'rider').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'rider').gte('created_at', weekStart),
  ]);

  const list = ridersRes.data || [];
  const ids = list.map((r: any) => r.id);

  let rideCounts: Record<string, number> = {};
  let spentMap: Record<string, number> = {};

  if (ids.length > 0) {
    const { data: rides } = await supabase
      .from('rides')
      .select('rider_id, status, estimated_fare, final_fare')
      .in('rider_id', ids);

    (rides || []).forEach((r: any) => {
      rideCounts[r.rider_id] = (rideCounts[r.rider_id] || 0) + 1;
      if (r.status === 'completed') {
        spentMap[r.rider_id] = (spentMap[r.rider_id] || 0) + Number(r.final_fare || r.estimated_fare || 0);
      }
    });
  }

  return NextResponse.json({
    riders: list,
    newThisWeek: newRes.count || 0,
    rideCounts,
    spentMap,
  });
}

// PATCH — update a rider profile (toggle active, etc.)
export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin())) return UNAUTHORIZED;
  const supabase = createServiceClient();
  const { id, ...updates } = await req.json();

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase.from('profiles').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
