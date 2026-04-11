import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

// GET /api/settings — fetch all platform settings
export async function GET() {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('platform_settings')
    .select('key, value, updated_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Convert array to object map
  const settings: Record<string, any> = {};
  for (const row of data || []) {
    settings[row.key] = row.value;
  }

  return NextResponse.json(settings);
}

// PUT /api/settings — update one or more settings
export async function PUT(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServiceClient();
  const body = await req.json();

  // body is { key: value, key: value, ... }
  const errors: string[] = [];
  for (const [key, value] of Object.entries(body)) {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({
        key,
        value: typeof value === 'object' ? value : value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) errors.push(`${key}: ${error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
