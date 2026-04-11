import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { verifyAdmin } from '@/lib/verifyAdmin';

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'week';

  const now = new Date();
  let start: Date, prevStart: Date, prevEnd: Date;

  if (period === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    prevEnd = new Date(start);
    prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 1);
  } else if (period === 'week') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    prevEnd = new Date(start);
    prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    prevEnd = new Date(start);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }

  const [
    driversRes, ridersRes, onlineRes, activeRes, pendingRes,
    subsCollRes, subsActRes, flagsRes,
    curRidesRes, prevRidesRes, recentRes, topRes
  ] = await Promise.all([
    supabase.from('drivers').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'rider'),
    supabase.from('drivers').select('id', { count: 'exact', head: true }).eq('is_online', true),
    supabase.from('rides').select('id', { count: 'exact', head: true })
      .in('status', ['accepted', 'driver_arriving', 'driver_arrived', 'in_progress']),
    supabase.from('drivers').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    supabase.from('drivers').select('id', { count: 'exact', head: true }).eq('subscription_status', 'collecting'),
    supabase.from('drivers').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    supabase.from('ride_flags').select('id', { count: 'exact', head: true }).eq('resolved', false),
    supabase.from('rides').select('id, status, estimated_fare, final_fare, platform_fee, ride_type, created_at, completed_at, tip_amount')
      .gte('created_at', start.toISOString()),
    supabase.from('rides').select('id, status, estimated_fare, final_fare, platform_fee, ride_type, created_at')
      .gte('created_at', prevStart.toISOString())
      .lt('created_at', prevEnd.toISOString()),
    supabase.from('rides').select('id, status, pickup_address, dropoff_address, estimated_fare, ride_type, created_at')
      .order('created_at', { ascending: false }).limit(10),
    supabase.from('rides').select('driver_id')
      .eq('status', 'completed')
      .gte('created_at', start.toISOString()),
  ]);

  // Current period stats
  const curRides = curRidesRes.data || [];
  const curCompleted = curRides.filter((r: any) => r.status === 'completed');
  const curCancelled = curRides.filter((r: any) => r.status === 'cancelled');
  const curRevenue = curCompleted.reduce((sum: number, r: any) => sum + Number(r.final_fare || r.estimated_fare || 0), 0);
  const curPlatform = curCompleted.reduce((sum: number, r: any) => sum + Number(r.platform_fee || 0), 0);
  const tippedRides = curRides.filter((r: any) => Number(r.tip_amount || 0) > 0);

  // Previous period stats
  const prevRides = prevRidesRes.data || [];
  const prevCompleted = prevRides.filter((r: any) => r.status === 'completed');
  const prevCancelled = prevRides.filter((r: any) => r.status === 'cancelled');
  const prevRevenue = prevCompleted.reduce((sum: number, r: any) => sum + Number(r.final_fare || r.estimated_fare || 0), 0);

  // Ride type breakdown
  const typeMap: Record<string, number> = {};
  curRides.forEach((r: any) => { typeMap[r.ride_type || 'standard'] = (typeMap[r.ride_type || 'standard'] || 0) + 1; });

  // Chart data
  const days = period === 'today' ? 1 : period === 'week' ? 7 : Math.ceil((now.getTime() - start.getTime()) / 86400000);
  const chartData = [];
  for (let i = 0; i < Math.min(days, 14); i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
    const dayStr = d.toISOString().split('T')[0];
    const dayRides = curRides.filter((r: any) => r.created_at?.startsWith(dayStr));
    chartData.push({
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      rides: dayRides.length,
      revenue: dayRides.filter((r: any) => r.status === 'completed')
        .reduce((sum: number, r: any) => sum + Number(r.final_fare || r.estimated_fare || 0), 0),
    });
  }

  // Top drivers
  const driverCounts: Record<string, number> = {};
  (topRes.data || []).forEach((r: any) => {
    if (r.driver_id) driverCounts[r.driver_id] = (driverCounts[r.driver_id] || 0) + 1;
  });
  const topIds = Object.entries(driverCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  let topDrivers: any[] = [];
  if (topIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', topIds.map(([id]) => id));
    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
    topDrivers = topIds.map(([id, count]) => ({
      id, count, name: profileMap[id]?.full_name || 'Unknown', avatar: profileMap[id]?.avatar_url,
    }));
  }

  return NextResponse.json({
    totalDrivers: driversRes.count || 0,
    totalRiders: ridersRes.count || 0,
    driversOnline: onlineRes.count || 0,
    activeRides: activeRes.count || 0,
    pendingApprovals: pendingRes.count || 0,
    subsCollecting: subsCollRes.count || 0,
    subsActive: subsActRes.count || 0,
    unresolvedFlags: flagsRes.count || 0,
    tipCount: tippedRides.length,
    totalTips: tippedRides.reduce((sum: number, r: any) => sum + Number(r.tip_amount || 0), 0),
    current: {
      rides: curRides.length,
      completed: curCompleted.length,
      cancelled: curCancelled.length,
      revenue: curRevenue,
      platformFees: curPlatform,
      avgFare: curCompleted.length > 0 ? curRevenue / curCompleted.length : 0,
    },
    previous: {
      rides: prevRides.length,
      completed: prevCompleted.length,
      cancelled: prevCancelled.length,
      revenue: prevRevenue,
      platformFees: prevCompleted.reduce((sum: number, r: any) => sum + Number(r.platform_fee || 0), 0),
      avgFare: prevCompleted.length > 0 ? prevRevenue / prevCompleted.length : 0,
    },
    rideTypeBreakdown: Object.entries(typeMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    chartData,
    recentRides: recentRes.data || [],
    topDrivers,
  });
}
