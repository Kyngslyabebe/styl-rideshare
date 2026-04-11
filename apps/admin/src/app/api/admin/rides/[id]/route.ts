import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();

  const [rideRes, stopsRes] = await Promise.all([
    supabase.from('rides').select('*').eq('id', id).single(),
    supabase.from('ride_stops').select('*').eq('ride_id', id).order('stop_order'),
  ]);

  return NextResponse.json({ ride: rideRes.data, stops: stopsRes.data || [] });
}
