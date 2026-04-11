import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

// GET — fetch support messages for a driver
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('support_messages')
    .select('*')
    .eq('driver_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ messages: data || [] });
}

// POST — send a message from admin to driver
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();
  const { message } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const { error: msgErr } = await supabase.from('support_messages').insert({
    driver_id: id,
    sender_role: 'admin',
    message: message.trim(),
  });

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 });

  // Send notification to driver
  await supabase.from('notifications').insert({
    user_id: id,
    title: 'New message from Styl Support',
    body: message.length > 100 ? message.substring(0, 100) + '...' : message,
    type: 'support_message',
    data: { type: 'support_message' },
  });

  return NextResponse.json({ ok: true });
}
