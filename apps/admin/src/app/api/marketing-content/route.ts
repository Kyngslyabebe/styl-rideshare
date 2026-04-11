import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

// GET — fetch all marketing content sections (public — used by marketing page)
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('marketing_content').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PUT — upsert a section (admin only)
export async function PUT(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServiceClient();
  const { section, content } = await req.json();

  if (!section || !content) {
    return NextResponse.json({ error: 'section and content are required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('marketing_content')
    .upsert({ section, content, updated_at: new Date().toISOString() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
