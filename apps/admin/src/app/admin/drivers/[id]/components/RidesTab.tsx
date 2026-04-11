'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import StatsCard from '@/components/admin/StatsCard';
import RideDetailPanel from './RideDetailPanel';
import s from '../driverDetail.module.css';

type Period = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

interface Props {
  driverId: string;
}

export default function RidesTab({ driverId }: Props) {
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
    const params = new URLSearchParams({ period });
    if (period === 'custom') {
      if (customFrom) params.set('from', customFrom);
      if (customTo) params.set('to', customTo);
    }
    try {
      const res = await adminFetch(`/api/admin/drivers/${driverId}/rides?${params}`);
      const data = await res.json();
      setRides(data.rides || []);
    } catch {
      setRides([]);
    }
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
