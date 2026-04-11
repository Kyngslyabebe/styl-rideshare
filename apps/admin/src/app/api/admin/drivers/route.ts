import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

const UNAUTHORIZED = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// GET — list all drivers with profile info (only users with role='driver')
export async function GET() {
  if (!(await verifyAdmin())) return UNAUTHORIZED;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('drivers')
    .select('*, profiles!inner(full_name, email, phone, role)')
    .eq('profiles.role', 'driver')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — update a driver (approve, etc.)
export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin())) return UNAUTHORIZED;
  const supabase = createServiceClient();
  const { id, ...updates } = await req.json();

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase.from('drivers').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
