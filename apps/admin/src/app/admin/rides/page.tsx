'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import s from '../dashboard.module.css';

const STATUS_OPTIONS = ['all', 'searching', 'accepted', 'driver_arriving', 'driver_arrived', 'in_progress', 'completed', 'cancelled'];
const STATUS_LABELS: Record<string, string> = {
  all: 'All', searching: 'Searching', accepted: 'Accepted', driver_arriving: 'Arriving',
  driver_arrived: 'Arrived', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
};

type PeriodFilter = 'today' | 'week' | 'month' | 'all';

export default function RidesPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [period, setPeriod] = useState<PeriodFilter>('week');
  const [search, setSearch] = useState('');
  const [expandedRide, setExpandedRide] = useState<string | null>(null);

  // Profiles cache
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  const getStart = useCallback((p: PeriodFilter) => {
    const now = new Date();
    if (p === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (p === 'week') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    if (p === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    return null;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const start = getStart(period);

    let query = supabase.from('rides')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (start) query = query.gte('created_at', start.toISOString());
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data } = await query;
    const list = data || [];
    setRides(list);

    // Fetch profiles for drivers and riders
    const driverIds = [...new Set(list.map((r: any) => r.driver_id).filter(Boolean))];
    const riderIds = [...new Set(list.map((r: any) => r.rider_id).filter(Boolean))];
    const allIds = [...new Set([...driverIds, ...riderIds])];

    if (allIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', allIds);
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }

    setLoading(false);
  }, [period, statusFilter, getStart]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Computed stats from current rides
  const stats = useMemo(() => {
    const completed = rides.filter((r) => r.status === 'completed');
    const cancelled = rides.filter((r) => r.status === 'cancelled');
    const active = rides.filter((r) => ['accepted', 'driver_arriving', 'driver_arrived', 'in_progress'].includes(r.status));
    const revenue = completed.reduce((sum, r) => sum + Number(r.final_fare || r.estimated_fare || 0), 0);
    const avgFare = completed.length > 0 ? revenue / completed.length : 0;
    const completionRate = rides.length > 0 ? (completed.length / rides.length) * 100 : 0;
    return { total: rides.length, completed: completed.length, cancelled: cancelled.length, active: active.length, revenue, avgFare, completionRate };
  }, [rides]);

  // Search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return rides;
    const q = search.toLowerCase();
    return rides.filter((r) =>
      r.pickup_address?.toLowerCase().includes(q) ||
      r.dropoff_address?.toLowerCase().includes(q) ||
      r.ride_type?.toLowerCase().includes(q) ||
      profiles[r.rider_id]?.full_name?.toLowerCase().includes(q) ||
      profiles[r.driver_id]?.full_name?.toLowerCase().includes(q)
    );
  }, [rides, search, profiles]);

  // Ride type stats
  const typeStats = useMemo(() => {
    const map: Record<string, number> = {};
    rides.forEach((r) => { map[r.ride_type || 'standard'] = (map[r.ride_type || 'standard'] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [rides]);

  const typeLabels: Record<string, string> = { standard: 'Standard', xl: 'XL', luxury: 'Luxury', electric: 'Eco' };
  const typeColors: Record<string, string> = { standard: '#4A90E2', xl: '#FF9800', luxury: '#9C27B0', electric: '#00C853' };
  const periodLabel = period === 'today' ? 'today' : period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'all time';

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.title} style={{ marginBottom: 4 }}>Rides</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            All rides and trip analytics
          </p>
        </div>
        <div className={s.filterBar} style={{ marginBottom: 0 }}>
          {(['today', 'week', 'month', 'all'] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              type="button"
              className={`${s.filterBtn} ${period === p ? s.filterBtnActive : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <span className={s.statLabel}>Total Rides</span>
          <span className={s.statValue}>{stats.total}</span>
          <span className={s.statSubtext}>{periodLabel}</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Completed</span>
          <span className={s.statValue} style={{ color: 'var(--success)' }}>{stats.completed}</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Active Now</span>
          <span className={s.statValue} style={{ color: '#4A90E2' }}>{stats.active}</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Cancelled</span>
          <span className={s.statValue} style={{ color: '#FF1744' }}>{stats.cancelled}</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Revenue</span>
          <span className={s.statValue}>${stats.revenue.toFixed(2)}</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Avg Fare</span>
          <span className={s.statValue}>${stats.avgFare.toFixed(2)}</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Completion Rate</span>
          <span className={s.statValue} style={{ color: stats.completionRate >= 80 ? 'var(--success)' : 'var(--orange)' }}>
            {stats.completionRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* ─── Ride Type Breakdown ─── */}
      <div className={s.section} style={{ marginBottom: 20 }}>
        <h3 className={s.sectionTitle}>Ride Type Distribution</h3>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 12 }}>
          {typeStats.map(([type, count]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: typeColors[type] || 'var(--orange)' }} />
              <span style={{ fontSize: 13, color: 'var(--text)' }}>
                {typeLabels[type] || type}: <strong>{count}</strong> ({stats.total > 0 ? ((count / stats.total) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Filters & Search ─── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className={s.searchInput}
          placeholder="Search rides by address, rider, driver..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={s.filterBar} style={{ marginBottom: 0 }}>
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st}
              type="button"
              className={`${s.filterBtn} ${statusFilter === st ? s.filterBtnActive : ''}`}
              onClick={() => setStatusFilter(st)}
              style={{ fontSize: 12, padding: '4px 12px' }}
            >
              {STATUS_LABELS[st] || st}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Ride List ─── */}
      <div className={s.tableCard}>
        <div className={s.tableHeader}>
          <span className={s.tableTitle}>Rides</span>
          <span className={s.tableCount}>{filtered.length} results</span>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 20, textAlign: 'center' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p className={s.empty}>No rides found</p>
        ) : (
          <table className={s.miniTable}>
            <thead>
              <tr>
                <th>Status</th>
                <th>Type</th>
                <th>Rider</th>
                <th>Driver</th>
                <th>Pickup</th>
                <th>Dropoff</th>
                <th>Fare</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const rider = profiles[r.rider_id];
                const driver = profiles[r.driver_id];
                const isExpanded = expandedRide === r.id;
                return (
                  <>
                    <tr
                      key={r.id}
                      className={s.miniTableClickable}
                      onClick={() => setExpandedRide(isExpanded ? null : r.id)}
                      style={isExpanded ? { background: 'rgba(255,107,0,0.04)' } : undefined}
                    >
                      <td>
                        <span className={`${s.badge} ${
                          r.status === 'completed' ? s.badgeSuccess
                          : r.status === 'cancelled' ? s.badgeError
                          : ['in_progress', 'driver_arriving', 'driver_arrived'].includes(r.status) ? s.badgeInfo
                          : s.badgeWarning
                        }`} style={{ textTransform: 'capitalize' }}>
                          {r.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{r.ride_type || 'standard'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {rider?.avatar_url ? (
                            <img src={rider.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
                          ) : (
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)' }}>
                              {rider?.full_name?.charAt(0) || 'R'}
                            </div>
                          )}
                          <span style={{ fontSize: 12 }}>{rider?.full_name || r.rider_id?.substring(0, 8) || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 12 }}>{driver?.full_name || (r.driver_id ? r.driver_id.substring(0, 8) : '—')}</span>
                      </td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {r.pickup_address?.split(',')[0] || '—'}
                      </td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {r.dropoff_address?.split(',')[0] || '—'}
                      </td>
                      <td style={{ fontWeight: 700 }}>${Number(r.final_fare || r.estimated_fare || 0).toFixed(2)}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{formatTime(r.created_at)}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${r.id}-detail`}>
                        <td colSpan={8} style={{ padding: 0 }}>
                          <RideDetail ride={r} rider={rider} driver={driver} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Expanded Ride Detail ───
function RideDetail({ ride, rider, driver }: { ride: any; rider: any; driver: any }) {
  return (
    <div style={{
      padding: '16px 20px', background: 'rgba(255,107,0,0.02)',
      borderTop: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        {/* Fare Breakdown */}
        <div>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
            Fare Breakdown
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Row label="Estimated Fare" value={`$${Number(ride.estimated_fare || 0).toFixed(2)}`} />
            {ride.final_fare && <Row label="Final Fare" value={`$${Number(ride.final_fare).toFixed(2)}`} bold />}
            {ride.base_fare && <Row label="Base Fare" value={`$${Number(ride.base_fare).toFixed(2)}`} />}
            {ride.distance_fare && <Row label="Distance" value={`$${Number(ride.distance_fare).toFixed(2)}`} />}
            {ride.time_fare && <Row label="Time" value={`$${Number(ride.time_fare).toFixed(2)}`} />}
            {ride.booking_fee && <Row label="Booking Fee" value={`$${Number(ride.booking_fee).toFixed(2)}`} />}
            {ride.surge_multiplier > 1 && <Row label="Surge" value={`${ride.surge_multiplier}x`} />}
            {ride.platform_fee && <Row label="Platform Fee" value={`$${Number(ride.platform_fee).toFixed(2)}`} color="#FF1744" />}
            {ride.driver_payout && <Row label="Driver Payout" value={`$${Number(ride.driver_payout).toFixed(2)}`} color="#00C853" />}
          </div>
        </div>

        {/* Route Info */}
        <div>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
            Route
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>PICKUP</span>
              <p style={{ fontSize: 13, color: 'var(--text)', margin: '2px 0' }}>{ride.pickup_address || '—'}</p>
              {ride.pickup_lat && (
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  {Number(ride.pickup_lat).toFixed(5)}, {Number(ride.pickup_lng).toFixed(5)}
                </span>
              )}
            </div>
            <div style={{ borderLeft: '2px dashed var(--card-border)', height: 16, marginLeft: 4 }} />
            <div>
              <span style={{ fontSize: 11, color: '#FF1744', fontWeight: 700 }}>DROPOFF</span>
              <p style={{ fontSize: 13, color: 'var(--text)', margin: '2px 0' }}>{ride.dropoff_address || '—'}</p>
              {ride.dropoff_lat && (
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  {Number(ride.dropoff_lat).toFixed(5)}, {Number(ride.dropoff_lng).toFixed(5)}
                </span>
              )}
            </div>
            {ride.distance_miles && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                Distance: <strong>{Number(ride.distance_miles).toFixed(1)} mi</strong>
                {ride.duration_minutes && <> · Duration: <strong>{Math.round(ride.duration_minutes)} min</strong></>}
              </p>
            )}
          </div>
        </div>

        {/* People & Status */}
        <div>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
            Details
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Row label="Rider" value={rider?.full_name || ride.rider_id?.substring(0, 8) || '—'} />
            <Row label="Driver" value={driver?.full_name || ride.driver_id?.substring(0, 8) || 'Not assigned'} />
            <Row label="Ride Type" value={(ride.ride_type || 'standard').charAt(0).toUpperCase() + (ride.ride_type || 'standard').slice(1)} />
            <Row label="Created" value={new Date(ride.created_at).toLocaleString()} />
            {ride.accepted_at && <Row label="Accepted" value={new Date(ride.accepted_at).toLocaleString()} />}
            {ride.completed_at && <Row label="Completed" value={new Date(ride.completed_at).toLocaleString()} />}
            {ride.cancelled_at && <Row label="Cancelled" value={new Date(ride.cancelled_at).toLocaleString()} />}
            {ride.cancellation_reason && <Row label="Cancel Reason" value={ride.cancellation_reason} color="#FF1744" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: bold ? 700 : 500, color: color || 'var(--text)' }}>{value}</span>
    </div>
  );
}
