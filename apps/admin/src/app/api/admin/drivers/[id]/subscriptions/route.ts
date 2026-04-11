import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('driver_subscriptions')
    .select('*')
    .eq('driver_id', id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ history: data || [] });
}
