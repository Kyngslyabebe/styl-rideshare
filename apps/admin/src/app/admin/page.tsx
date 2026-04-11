'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/adminFetch';
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
  const [unresolvedFlags, setUnresolvedFlags] = useState(0);
  const [totalTips, setTotalTips] = useState(0);
  const [tipCount, setTipCount] = useState(0);

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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/dashboard?period=${period}`);
      const data = await res.json();

      setTotalDrivers(data.totalDrivers || 0);
      setTotalRiders(data.totalRiders || 0);
      setDriversOnline(data.driversOnline || 0);
      setActiveRides(data.activeRides || 0);
      setPendingApprovals(data.pendingApprovals || 0);
      setSubsCollecting(data.subsCollecting || 0);
      setSubsActive(data.subsActive || 0);
      setUnresolvedFlags(data.unresolvedFlags || 0);
      setTipCount(data.tipCount || 0);
      setTotalTips(data.totalTips || 0);
      setCurrent(data.current || { rides: 0, completed: 0, cancelled: 0, revenue: 0, platformFees: 0, avgFare: 0 });
      setPrevious(data.previous || { rides: 0, completed: 0, cancelled: 0, revenue: 0, platformFees: 0, avgFare: 0 });
      setRideTypeBreakdown(data.rideTypeBreakdown || []);
      setChartData(data.chartData || []);
      setRecentRides(data.recentRides || []);
      setTopDrivers(data.topDrivers || []);
    } catch {
      // keep defaults
    }
    setLoading(false);
  }, [period]);

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
        <div className={s.statCard}>
          <span className={s.statLabel}>Ride Flags</span>
          <span className={s.statValue} style={{ color: unresolvedFlags > 0 ? '#FF1744' : 'var(--success)' }}>
            {unresolvedFlags}
          </span>
          <span className={s.statSubtext}>unresolved</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Tips {periodLabel}</span>
          <span className={s.statValue} style={{ color: totalTips > 0 ? '#00C853' : 'var(--text-secondary)' }}>
            ${totalTips.toFixed(2)}
          </span>
          <span className={s.statSubtext}>{tipCount} ride{tipCount !== 1 ? 's' : ''} tipped</span>
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
