'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import StatsCard from '@/components/admin/StatsCard';
import RideDetailPanel from './RideDetailPanel';
import s from '../driverDetail.module.css';

type Period = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

function getPeriodStart(period: Period): string | null {
  const now = new Date();
  if (period === 'all') return null;
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  if (period === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff).toISOString();
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1).toISOString();
  }
  return null;
}

interface Props {
  driverId: string;
}

export default function RidesTab({ driverId }: Props) {
  const supabase = createClient();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [expandedRide, setExpandedRide] = useState<string | null>(null);

  useEffect(() => {
    fetchRides();
  }, [driverId, period, customFrom, customTo]);

  const fetchRides = async () => {
    setLoading(true);
    let query = supabase
      .from('rides')
      .select('*, rider:profiles!rider_id(full_name, phone)')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (period === 'custom') {
      if (customFrom) query = query.gte('created_at', new Date(customFrom).toISOString());
      if (customTo) {
        const to = new Date(customTo);
        to.setHours(23, 59, 59, 999);
        query = query.lte('created_at', to.toISOString());
      }
    } else {
      const start = getPeriodStart(period);
      if (start) query = query.gte('created_at', start);
    }

    const { data } = await query.limit(200);
    setRides(data || []);
    setLoading(false);
  };

  const completed = rides.filter((r) => r.status === 'completed');
  const totalEarnings = completed.reduce((sum, r) => sum + Number(r.driver_earnings || r.final_fare || 0), 0);
  const avgFare = completed.length > 0 ? totalEarnings / completed.length : 0;
  const cancelled = rides.filter((r) => r.status === 'cancelled');
  const completionRate = rides.length > 0 ? ((completed.length / rides.length) * 100).toFixed(0) : '0';

  const getStatusClass = (status: string) => {
    if (status === 'completed') return s.statusCompleted;
    if (status === 'cancelled') return s.statusCancelled;
    if (['in_progress', 'accepted', 'driver_arriving', 'driver_arrived'].includes(status)) return s.statusInProgress;
    return s.statusOther;
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const truncate = (str: string, len = 30) => str?.length > len ? str.slice(0, len) + '…' : str;

  return (
    <div>
      {/* Filter bar */}
      <div className={s.filterBar}>
        {(['today', 'week', 'month', 'year', 'all'] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`${s.filterBtn} ${period === p ? s.filterBtnActive : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'All Time'}
          </button>
        ))}
        <button
          type="button"
          className={`${s.filterBtn} ${period === 'custom' ? s.filterBtnActive : ''}`}
          onClick={() => setPeriod('custom')}
        >
          Custom
        </button>
        {period === 'custom' && (
          <>
            <input type="date" className={s.dateInput} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>to</span>
            <input type="date" className={s.dateInput} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </>
        )}
      </div>

      {/* Stats summary */}
      <div className={s.statsGrid}>
        <StatsCard label="Total Rides" value={rides.length} />
        <StatsCard label="Completed" value={completed.length} color="var(--success)" />
        <StatsCard label="Cancelled" value={cancelled.length} color="var(--error)" />
        <StatsCard label="Earnings" value={`$${totalEarnings.toFixed(2)}`} />
        <StatsCard label="Avg Fare" value={`$${avgFare.toFixed(2)}`} />
        <StatsCard label="Completion" value={`${completionRate}%`} />
      </div>

      {/* Ride list */}
      <div className={s.card} style={{ padding: 0, overflow: 'hidden' }}>
        <div className={s.rideRowHeader}>
          <span>Status</span>
          <span>Fare</span>
          <span>Pickup</span>
          <span>Dropoff</span>
          <span>Rider</span>
          <span>Date</span>
          <span>Type</span>
        </div>
        {loading ? (
          <p style={{ padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Loading rides...</p>
        ) : rides.length === 0 ? (
          <p className={s.empty}>No rides found for this period</p>
        ) : (
          rides.map((ride) => (
            <div key={ride.id}>
              <div
                className={s.rideRow}
                onClick={() => setExpandedRide(expandedRide === ride.id ? null : ride.id)}
              >
                <span className={`${s.rideStatus} ${getStatusClass(ride.status)}`}>
                  {ride.status.replace(/_/g, ' ')}
                </span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                  ${Number(ride.final_fare || ride.estimated_fare || 0).toFixed(2)}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 11 }} title={ride.pickup_address}>
                  {truncate(ride.pickup_address)}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 11 }} title={ride.dropoff_address}>
                  {truncate(ride.dropoff_address)}
                </span>
                <span style={{ color: 'var(--text)', fontSize: 11 }}>
                  {ride.rider?.full_name || '—'}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                  {formatDate(ride.created_at)}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 11, textTransform: 'capitalize' }}>
                  {ride.ride_type}
                </span>
              </div>
              {expandedRide === ride.id && (
                <RideDetailPanel ride={ride} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
