import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

const UNAUTHORIZED = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// GET — single driver with profile, vehicles, active ride check
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return UNAUTHORIZED;
  const { id } = await params;
  const supabase = createServiceClient();

  const [d, p, v, ride] = await Promise.all([
    supabase.from('drivers').select('*').eq('id', id).single(),
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('vehicles').select('*').eq('driver_id', id),
    supabase.from('rides').select('id').eq('driver_id', id)
      .in('status', ['accepted', 'driver_arriving', 'driver_arrived', 'in_progress'])
      .limit(1),
  ]);

  return NextResponse.json({
    driver: d.data,
    profile: p.data,
    vehicles: v.data || [],
    hasActiveRide: (ride.data?.length || 0) > 0,
  });
}

// PATCH — update driver fields (approve, reject, suspend, ride types, etc.)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return UNAUTHORIZED;
  const { id } = await params;
  const supabase = createServiceClient();

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Extract non-column fields before updating
  const { notify_email, ...updates } = body;

  console.log('[PATCH /api/admin/drivers/[id]] id:', id, 'updates:', JSON.stringify(updates));

  const { error } = await supabase.from('drivers').update(updates).eq('id', id);
  if (error) {
    console.error('[PATCH /api/admin/drivers/[id]] Supabase error:', error);
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }

  // Send notification email via edge function if requested
  if (notify_email) {
    await supabase.functions.invoke('send-driver-email', {
      body: { driver_id: id, type: notify_email },
    }).catch(() => {}); // Don't fail the request if email fails
  }

  return NextResponse.json({ ok: true });
}
