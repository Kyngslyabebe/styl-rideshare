import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();

  const [profileRes, ridesRes, paymentsRes, ratingsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('rides').select('*, drivers:driver_id(id)').eq('rider_id', id).order('created_at', { ascending: false }).limit(100),
    supabase.from('payments').select('*').eq('rider_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('ratings').select('*').eq('rider_id', id).order('created_at', { ascending: false }).limit(50),
  ]);

  return NextResponse.json({
    profile: profileRes.data,
    rides: ridesRes.data || [],
    payments: paymentsRes.data || [],
    ratings: ratingsRes.data || [],
  });
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();
  const updates = await _req.json();

  const { error } = await supabase.from('profiles').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
