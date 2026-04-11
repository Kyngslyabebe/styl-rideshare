import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

export async function GET() {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServiceClient();

  const [driversRes, subsRes] = await Promise.all([
    supabase.from('drivers').select('*'),
    supabase.from('driver_subscriptions').select('driver_id, plan, status, price')
      .order('created_at', { ascending: false }),
  ]);

  const list = driversRes.data || [];

  // Map latest subscription plan per driver
  const subMap: Record<string, any> = {};
  (subsRes.data || []).forEach((sub: any) => {
    if (!subMap[sub.driver_id]) subMap[sub.driver_id] = sub;
  });

  const active = list.filter((d: any) => d.subscription_status === 'active');
  const collecting = list.filter((d: any) => d.subscription_status === 'collecting');
  const inactive = list.filter((d: any) => !d.subscription_status || d.subscription_status === 'inactive');

  const totalCollected = collecting.reduce((sum: number, d: any) => sum + Number(d.subscription_collected || 0), 0);
  const totalTarget = collecting.reduce((sum: number, d: any) => sum + Number(d.subscription_target || 0), 0);

  // Plan breakdown
  const planMap: Record<string, number> = {};
  Object.values(subMap).forEach((sub: any) => {
    if (sub.plan && sub.status !== 'canceled') {
      planMap[sub.plan] = (planMap[sub.plan] || 0) + 1;
    }
  });

  // Attach plan info + profile data
  const ids = list.map((d: any) => d.id);
  let profiles: Record<string, any> = {};
  if (ids.length > 0) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', ids);
    (profileData || []).forEach((p: any) => { profiles[p.id] = p; });
  }

  const drivers = list.map((d: any) => ({
    ...d,
    _plan: subMap[d.id]?.plan || null,
    _subPrice: subMap[d.id]?.price || null,
  }));

  return NextResponse.json({
    totalDrivers: list.length,
    activeCount: active.length,
    collectingCount: collecting.length,
    inactiveCount: inactive.length,
    totalCollected,
    totalTarget,
    planBreakdown: Object.entries(planMap).map(([plan, count]) => ({ plan, count })).sort((a, b) => b.count - a.count),
    drivers,
    profiles,
  });
}
