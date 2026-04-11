import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();

  const url = new URL(req.url);
  const period = url.searchParams.get('period') || 'daily';
  const daysBack = period === 'daily' ? 30 : period === 'weekly' ? 84 : 365;
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();

  const [e, r, rt] = await Promise.all([
    supabase.from('driver_earnings').select('net_amount, created_at').eq('driver_id', id).gte('created_at', since).order('created_at'),
    supabase.from('rides').select('id, status, created_at, final_fare, driver_earnings').eq('driver_id', id).gte('created_at', since).order('created_at'),
    supabase.from('ratings').select('rating, created_at').eq('rated_user', id).gte('created_at', since).order('created_at'),
  ]);

  return NextResponse.json({
    earnings: e.data || [],
    rides: r.data || [],
    ratings: rt.data || [],
  });
}
