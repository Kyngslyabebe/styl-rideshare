'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import s from './dashboard.module.css';

interface PeriodStats {
  rides: number;
  completed: number;
  cancelled: number;
  revenue: number;
  platformFees: number;
  avgFare: number;
}

interface DailyPoint {
  label: string;
  rides: number;
  revenue: number;
}

export default function DashboardPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');

  // Top-level counts
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [totalRiders, setTotalRiders] = useState(0);
  const [driversOnline, setDriversOnline] = useState(0);
  const [activeRides, setActiveRides] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [subsCollecting, setSubsCollecting] = useState(0);
  const [subsActive, setSubsActive] = useState(0);

  // Period stats + previous period for comparison
  const [current, setCurrent] = useState<PeriodStats>({ rides: 0, completed: 0, cancelled: 0, revenue: 0, platformFees: 0, avgFare: 0 });
  const [previous, setPrevious] = useState<PeriodStats>({ rides: 0, completed: 0, cancelled: 0, revenue: 0, platformFees: 0, avgFare: 0 });

  // Chart data
  const [chartData, setChartData] = useState<DailyPoint[]>([]);

  // Recent rides
  const [recentRides, setRecentRides] = useState<any[]>([]);

  // Top drivers
  const [topDrivers, setTopDrivers] = useState<any[]>([]);

  // Ride type breakdown
  const [rideTypeBreakdown, setRideTypeBreakdown] = useState<{ type: string; count: number }[]>([]);

  const getRange = useCallback((p: string) => {
    const now = new Date();
    let start: Date, prevStart: Date, prevEnd: Date;
    if (p === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevEnd = new Date(start);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 1);
    } else if (p === 'week') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      prevEnd = new Date(start);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prevEnd = new Date(start);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }
    return { start, prevStart, prevEnd };
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { start, prevStart, prevEnd } = getRange(period);
    const now = new Date();

    // ── Parallel top-level counts ──
    const [
      driversRes, ridersRes, onlineRes, activeRes, pendingRes,
      subsCollRes, subsActRes,
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
      // Current period rides
      supabase.from('rides').select('id, status, estimated_fare, final_fare, platform_fee, ride_type, created_at, completed_at')
        .gte('created_at', start.toISOString()),
      // Previous period rides
      supabase.from('rides').select('id, status, estimated_fare, final_fare, platform_fee, ride_type, created_at')
        .gte('created_at', prevStart.toISOString())
        .lt('created_at', prevEnd.toISOString()),
      // Recent rides
      supabase.from('rides').select('id, status, pickup_address, dropoff_address, estimated_fare, ride_type, created_at')
        .order('created_at', { ascending: false }).limit(10),
      // Top drivers by rides this period
      supabase.from('rides').select('driver_id')
        .eq('status', 'completed')
        .gte('created_at', start.toISOString()),
    ]);

    setTotalDrivers(driversRes.count || 0);
    setTotalRiders(ridersRes.count || 0);
    setDriversOnline(onlineRes.count || 0);
    setActiveRides(activeRes.count || 0);
    setPendingApprovals(pendingRes.count || 0);
    setSubsCollecting(subsCollRes.count || 0);
    setSubsActive(subsActRes.count || 0);

    // ── Process current period ──
    const curRides = curRidesRes.data || [];
    const curCompleted = curRides.filter((r: any) => r.status === 'completed');
    const curCancelled = curRides.filter((r: any) => r.status === 'cancelled');
    const curRevenue = curCompleted.reduce((sum: number, r: any) => sum + Number(r.final_fare || r.estimated_fare || 0), 0);
    const curPlatform = curCompleted.reduce((sum: number, r: any) => sum + Number(r.platform_fee || 0), 0);

    setCurrent({
      rides: curRides.length,
      completed: curCompleted.length,
      cancelled: curCancelled.length,
      revenue: curRevenue,
      platformFees: curPlatform,
      avgFare: curCompleted.length > 0 ? curRevenue / curCompleted.length : 0,
    });

    // ── Process previous period ──
    const prevRides = prevRidesRes.data || [];
    const prevCompleted = prevRides.filter((r: any) => r.status === 'completed');
    const prevCancelled = prevRides.filter((r: any) => r.status === 'cancelled');
    const prevRevenue = prevCompleted.reduce((sum: number, r: any) => sum + Number(r.final_fare || r.estimated_fare || 0), 0);

    setPrevious({
      rides: prevRides.length,
      completed: prevCompleted.length,
      cancelled: prevCancelled.length,
      revenue: prevRevenue,
      platformFees: prevCompleted.reduce((sum: number, r: any) => sum + Number(r.platform_fee || 0), 0),
      avgFare: prevCompleted.length > 0 ? prevRevenue / prevCompleted.length : 0,
    });

    // ── Ride type breakdown ──
    const typeMap: Record<string, number> = {};
    curRides.forEach((r: any) => {
      const t = r.ride_type || 'standard';
      typeMap[t] = (typeMap[t] || 0) + 1;
    });
    setRideTypeBreakdown(
      Object.entries(typeMap)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    );

    // ── Chart: daily data points ──
    const days = period === 'today' ? 1 : period === 'week' ? 7 : Math.ceil((now.getTime() - start.getTime()) / 86400000);
    const points: DailyPoint[] = [];
    for (let i = 0; i < Math.min(days, 14); i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
      const dayStr = d.toISOString().split('T')[0];
      const dayRides = curRides.filter((r: any) => r.created_at?.startsWith(dayStr));
      const dayRevenue = dayRides
        .filter((r: any) => r.status === 'completed')
        .reduce((sum: number, r: any) => sum + Number(r.final_fare || r.estimated_fare || 0), 0);
      points.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        rides: dayRides.length,
        revenue: dayRevenue,
      });
    }
    setChartData(points);

    // ── Recent rides ──
    setRecentRides(recentRes.data || []);

    // ── Top drivers ──
    const driverCounts: Record<string, number> = {};
    (topRes.data || []).forEach((r: any) => {
      if (r.driver_id) driverCounts[r.driver_id] = (driverCounts[r.driver_id] || 0) + 1;
    });
    const topIds = Object.entries(driverCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', topIds.map(([id]) => id));
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
      setTopDrivers(topIds.map(([id, count]) => ({
        id, count, name: profileMap[id]?.full_name || 'Unknown', avatar: profileMap[id]?.avatar_url,
      })));
    }

    setLoading(false);
  }, [period, getRange]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const pctChange = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev) * 100;
  };

  const changeLabel = (cur: number, prev: number) => {
    const pct = pctChange(cur, prev);
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(0)}%`;
  };

  const changeClass = (cur: number, prev: number) => {
    const pct = pctChange(cur, prev);
    return pct > 0 ? s.statChangeUp : pct < 0 ? s.statChangeDown : s.statChangeNeutral;
  };

  const completionRate = current.rides > 0 ? ((current.completed / current.rides) * 100) : 0;
  const prevCompletionRate = previous.rides > 0 ? ((previous.completed / previous.rides) * 100) : 0;

  const maxChartRides = Math.max(...chartData.map((d) => d.rides), 1);
  const maxChartRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  const typeColors: Record<string, string> = {
    standard: '#4A90E2', xl: '#FF9800', luxury: '#9C27B0', electric: '#00C853',
  };
  const typeLabels: Record<string, string> = {
    standard: 'Standard', xl: 'XL', luxury: 'Luxury', electric: 'Eco',
  };
  const totalTypeRides = rideTypeBreakdown.reduce((sum, r) => sum + r.count, 0) || 1;

  const periodLabel = period === 'today' ? 'today' : period === 'week' ? 'this week' : 'this month';
  const prevLabel = period === 'today' ? 'yesterday' : period === 'week' ? 'last week' : 'last month';

  if (loading) {
    return (
      <div>
        <h1 className={s.title}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.title} style={{ marginBottom: 4 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Platform overview and analytics
          </p>
        </div>
        <div className={s.filterBar} style={{ marginBottom: 0 }}>
          {(['today', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              className={`${s.filterBtn} ${period === p ? s.filterBtnActive : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Live Indicators ─── */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <span className={s.statLabel}>Drivers Online</span>
          <span className={s.statValue} style={{ color: 'var(--success)' }}>{driversOnline}</span>
          <span className={s.statSubtext}>of {totalDrivers} total</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Active Rides</span>
          <span className={s.statValue} style={{ color: '#4A90E2' }}>{activeRides}</span>
          <span className={s.statSubtext}>in progress now</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Pending Approvals</span>
          <span className={s.statValue} style={{ color: '#FF9800' }}>{pendingApprovals}</span>
          <span className={s.statSubtext}>drivers awaiting review</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Total Riders</span>
          <span className={s.statValue}>{totalRiders}</span>
          <span className={s.statSubtext}>registered</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Subscriptions</span>
          <span className={s.statValue} style={{ color: 'var(--success)' }}>{subsActive}</span>
          <span className={s.statSubtext}>{subsCollecting} collecting</span>
        </div>
      </div>

      {/* ─── Period KPIs ─── */}
      <div className={s.statsRow} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <div className={s.statCard}>
          <span className={s.statLabel}>Rides {periodLabel}</span>
          <span className={s.statValue}>{current.rides}</span>
          <span className={`${s.statChange} ${changeClass(current.rides, previous.rides)}`}>
            {changeLabel(current.rides, previous.rides)} vs {prevLabel}
          </span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Completed</span>
          <span className={s.statValue} style={{ color: 'var(--success)' }}>{current.completed}</span>
          <span className={`${s.statChange} ${changeClass(current.completed, previous.completed)}`}>
            {changeLabel(current.completed, previous.completed)} vs {prevLabel}
          </span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Cancelled</span>
          <span className={s.statValue} style={{ color: '#FF1744' }}>{current.cancelled}</span>
          <span className={`${s.statChange} ${changeClass(previous.cancelled, current.cancelled)}`}>
            {current.cancelled > previous.cancelled ? '↑' : current.cancelled < previous.cancelled ? '↓' : '—'} {Math.abs(current.cancelled - previous.cancelled)} vs {prevLabel}
          </span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Revenue</span>
          <span className={s.statValue}>${current.revenue.toFixed(2)}</span>
          <span className={`${s.statChange} ${changeClass(current.revenue, previous.revenue)}`}>
            {changeLabel(current.revenue, previous.revenue)} vs {prevLabel}
          </span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Avg Fare</span>
          <span className={s.statValue}>${current.avgFare.toFixed(2)}</span>
          <span className={`${s.statChange} ${changeClass(current.avgFare, previous.avgFare)}`}>
            {changeLabel(current.avgFare, previous.avgFare)}
          </span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Completion Rate</span>
          <span className={s.statValue} style={{ color: completionRate >= 80 ? 'var(--success)' : 'var(--orange)' }}>
            {completionRate.toFixed(1)}%
          </span>
          <span className={`${s.statChange} ${changeClass(completionRate, prevCompletionRate)}`}>
            {changeLabel(completionRate, prevCompletionRate)} vs {prevLabel}
          </span>
        </div>
      </div>

      {/* ─── Charts Row ─── */}
      <div className={s.twoCol}>
        {/* Ride Volume Chart */}
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <div>
              <h3 className={s.sectionTitle}>Ride Volume</h3>
              <p className={s.sectionDesc}>Daily rides {periodLabel}</p>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)' }}>{current.rides}</span>
          </div>
          <div className={s.chartContainer}>
            {chartData.map((d, i) => (
              <div key={i} className={s.chartBar}>
                <span className={s.chartBarValue}>{d.rides || ''}</span>
                <div
                  className={s.chartBarFill}
                  style={{ height: `${(d.rides / maxChartRides) * 100}%` }}
                  title={`${d.label}: ${d.rides} rides`}
                />
                <span className={s.chartBarLabel}>
                  {chartData.length <= 7 ? d.label.split(', ')[0] : d.label.split(' ')[1]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Chart */}
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <div>
              <h3 className={s.sectionTitle}>Revenue</h3>
              <p className={s.sectionDesc}>Daily revenue {periodLabel}</p>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--success)' }}>${current.revenue.toFixed(2)}</span>
          </div>
          <div className={s.chartContainer}>
            {chartData.map((d, i) => (
              <div key={i} className={s.chartBar}>
                <span className={s.chartBarValue}>{d.revenue > 0 ? `$${d.revenue.toFixed(0)}` : ''}</span>
                <div
                  className={`${s.chartBarFill} ${s.chartBarFillSuccess}`}
                  style={{ height: `${(d.revenue / maxChartRevenue) * 100}%` }}
                  title={`${d.label}: $${d.revenue.toFixed(2)}`}
                />
                <span className={s.chartBarLabel}>
                  {chartData.length <= 7 ? d.label.split(', ')[0] : d.label.split(' ')[1]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Bottom Row ─── */}
      <div className={s.threeCol}>
        {/* Ride Type Breakdown */}
        <div className={s.section}>
          <h3 className={s.sectionTitle}>Ride Types</h3>
          <p className={s.sectionDesc} style={{ marginBottom: 16 }}>Distribution {periodLabel}</p>
          <div className={s.breakdownList}>
            {rideTypeBreakdown.map((r) => (
              <div key={r.type}>
                <div className={s.hBar}>
                  <span className={s.hBarLabel}>{typeLabels[r.type] || r.type}</span>
                  <div className={s.hBarTrack}>
                    <div
                      className={s.hBarFill}
                      style={{
                        width: `${(r.count / totalTypeRides) * 100}%`,
                        background: typeColors[r.type] || 'var(--orange)',
                      }}
                    />
                  </div>
                  <span className={s.hBarValue}>
                    {r.count} ({((r.count / totalTypeRides) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
            {rideTypeBreakdown.length === 0 && (
              <p className={s.empty} style={{ padding: '20px 0' }}>No rides in this period</p>
            )}
          </div>
        </div>

        {/* Top Drivers */}
        <div className={s.section}>
          <h3 className={s.sectionTitle}>Top Drivers</h3>
          <p className={s.sectionDesc} style={{ marginBottom: 16 }}>Most completed rides {periodLabel}</p>
          {topDrivers.length === 0 ? (
            <p className={s.empty} style={{ padding: '20px 0' }}>No rides yet</p>
          ) : (
            topDrivers.map((d, i) => (
              <div key={d.id} className={s.feedItem}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: i === 0 ? 'var(--orange)' : i === 1 ? '#4A90E2' : 'var(--card-border)',
                  color: i < 2 ? '#fff' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <span className={s.feedText}>{d.name}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--orange)' }}>{d.count}</span>
              </div>
            ))
          )}
        </div>

        {/* Recent Activity */}
        <div className={s.section}>
          <h3 className={s.sectionTitle}>Recent Rides</h3>
          <p className={s.sectionDesc} style={{ marginBottom: 12 }}>Latest activity</p>
          <div className={s.feedList}>
            {recentRides.map((ride) => {
              const dotClass =
                ride.status === 'completed' ? s.feedDotGreen
                : ride.status === 'cancelled' ? s.feedDotRed
                : ride.status === 'in_progress' ? s.feedDotBlue
                : s.feedDotOrange;
              return (
                <div key={ride.id} className={s.feedItem}>
                  <span className={`${s.feedDot} ${dotClass}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={s.feedText} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ride.pickup_address?.split(',')[0] || 'Unknown'} → {ride.dropoff_address?.split(',')[0] || 'Unknown'}
                    </div>
                    <div className={s.feedTime}>
                      {ride.ride_type} · ${Number(ride.estimated_fare || 0).toFixed(2)} · {new Date(ride.created_at).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className={`${s.badge} ${
                    ride.status === 'completed' ? s.badgeSuccess
                    : ride.status === 'cancelled' ? s.badgeError
                    : ride.status === 'in_progress' ? s.badgeInfo
                    : s.badgeWarning
                  }`} style={{ textTransform: 'capitalize' }}>
                    {ride.status?.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
            {recentRides.length === 0 && (
              <p className={s.empty}>No recent rides</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Platform Revenue Breakdown ─── */}
      <div className={s.section}>
        <h3 className={s.sectionTitle}>Platform Revenue Breakdown</h3>
        <p className={s.sectionDesc} style={{ marginBottom: 16 }}>
          Styl takes $0 commission — revenue comes from subscriptions only. Platform fees shown below are Stripe pass-through costs.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          <div className={s.infoRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '14px 0' }}>
            <span className={s.infoLabel}>Total Ride Fares</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>${current.revenue.toFixed(2)}</span>
          </div>
          <div className={s.infoRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '14px 0' }}>
            <span className={s.infoLabel}>Stripe Fees (pass-through)</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#FF1744' }}>${current.platformFees.toFixed(2)}</span>
          </div>
          <div className={s.infoRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '14px 0' }}>
            <span className={s.infoLabel}>Driver Payouts</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>
              ${(current.revenue - current.platformFees).toFixed(2)}
            </span>
          </div>
          <div className={s.infoRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '14px 0' }}>
            <span className={s.infoLabel}>Active Subscriptions Revenue</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange)' }}>{subsActive} active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
