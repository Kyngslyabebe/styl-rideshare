import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

export async function GET() {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServiceClient();

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  const list = tickets || [];
  const riderIds = [...new Set(list.map((t: any) => t.rider_id))];

  let riderNames: Record<string, string> = {};
  if (riderIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', riderIds);
    for (const p of profiles || []) riderNames[p.id] = p.full_name || 'Unknown';
  }

  return NextResponse.json({ tickets: list, riderNames });
}

export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServiceClient();
  const { ticketId, updates } = await req.json();

  if (!ticketId) return NextResponse.json({ error: 'ticketId required' }, { status: 400 });

  const { error } = await supabase.from('support_tickets').update(updates).eq('id', ticketId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServiceClient();
  const { action, ticketId, message } = await req.json();

  if (action === 'get_responses') {
    const { data } = await supabase
      .from('ticket_responses')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    return NextResponse.json({ responses: data || [] });
  }

  if (action === 'reply') {
    const { error } = await supabase.from('ticket_responses').insert({
      ticket_id: ticketId,
      sender_role: 'admin',
      sender_id: null,
      message,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
