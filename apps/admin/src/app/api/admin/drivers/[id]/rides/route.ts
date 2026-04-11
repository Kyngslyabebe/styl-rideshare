import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();

  const url = new URL(req.url);
  const period = url.searchParams.get('period') || 'month';
  const customFrom = url.searchParams.get('from');
  const customTo = url.searchParams.get('to');

  let query = supabase
    .from('rides')
    .select('*, rider:profiles!rider_id(full_name, phone)')
    .eq('driver_id', id)
    .order('created_at', { ascending: false });

  if (period === 'custom') {
    if (customFrom) query = query.gte('created_at', new Date(customFrom).toISOString());
    if (customTo) {
      const to = new Date(customTo);
      to.setHours(23, 59, 59, 999);
      query = query.lte('created_at', to.toISOString());
    }
  } else if (period !== 'all') {
    const now = new Date();
    let start: string | null = null;
    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (period === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.getFullYear(), now.getMonth(), diff).toISOString();
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1).toISOString();
    }
    if (start) query = query.gte('created_at', start);
  }

  const { data } = await query.limit(200);
  return NextResponse.json({ rides: data || [] });
}
