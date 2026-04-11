import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

// GET — active ride + driver location
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();

  const [rideRes, locRes] = await Promise.all([
    supabase
      .from('rides')
      .select('*, rider:profiles!rider_id(full_name, phone, avatar_url)')
      .eq('driver_id', id)
      .in('status', ['accepted', 'driver_arriving', 'driver_arrived', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('driver_locations')
      .select('*')
      .eq('driver_id', id)
      .single(),
  ]);

  return NextResponse.json({
    ride: rideRes.data?.[0] || null,
    location: locRes.data || null,
  });
}

// PATCH — cancel active ride
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();
  const { rideId } = await req.json();

  if (!rideId) return NextResponse.json({ error: 'rideId is required' }, { status: 400 });

  const { error } = await supabase.from('rides').update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancelled_by: 'system',
    cancellation_reason: 'Cancelled by admin',
  }).eq('id', rideId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
