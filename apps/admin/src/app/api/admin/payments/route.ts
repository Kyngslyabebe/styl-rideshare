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

  // Filtered list
  let query = supabase.from('payments').select('*').order('created_at', { ascending: false });
  if (start) query = query.gte('created_at', start.toISOString());
  if (status !== 'all') query = query.eq('status', status);
  const { data: filtered } = await query.limit(500);

  // Unfiltered for stats (no status filter)
  let statsQuery = supabase.from('payments').select('*').order('created_at', { ascending: false });
  if (start) statsQuery = statsQuery.gte('created_at', start.toISOString());
  const { data: allData } = await statsQuery.limit(500);

  return NextResponse.json({ payments: filtered || [], allPayments: allData || [] });
}
