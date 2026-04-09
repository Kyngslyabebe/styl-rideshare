'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import StatsCard from '@/components/admin/StatsCard';
import s from '../driverDetail.module.css';

type Period = 'daily' | 'weekly' | 'monthly';

function groupByDate(items: any[], dateKey: string, period: Period) {
  const groups: Record<string, number> = {};
  items.forEach((item) => {
    const d = new Date(item[dateKey]);
    let key: string;
    if (period === 'daily') {
      key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (period === 'weekly') {
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    groups[key] = (groups[key] || 0) + Number(item.amount || item.net_amount || 1);
  });
  return Object.entries(groups).map(([label, value]) => ({ label, value }));
}

interface Props {
  driverId: string;
}

export default function ReportsTab({ driverId }: Props) {
  const supabase = createClient();
  const [period, setPeriod] = useState<Period>('daily');
  const [earnings, setEarnings] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const daysBack = period === 'daily' ? 30 : period === 'weekly' ? 84 : 365;
      const since = new Date(Date.now() - daysBack * 86400000).toISOString();

      const [e, r, rt] = await Promise.all([
        supabase.from('driver_earnings').select('net_amount, created_at').eq('driver_id', driverId).gte('created_at', since).order('created_at'),
        supabase.from('rides').select('id, status, created_at, final_fare, driver_earnings').eq('driver_id', driverId).gte('created_at', since).order('created_at'),
        supabase.from('ratings').select('rating, created_at').eq('rated_user', driverId).gte('created_at', since).order('created_at'),
      ]);
      setEarnings(e.data || []);
      setRides(r.data || []);
      setRatings(rt.data || []);
      setLoading(false);
    })();
  }, [driverId, period]);

  const completedRides = rides.filter((r) => r.status === 'completed');
  const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.net_amount || 0), 0);
  const avgRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2) : '5.00';
  const bestDay = groupByDate(earnings.map((e) => ({ ...e, amount: e.net_amount })), 'created_at', 'daily')
    .sort((a, b) => b.value - a.value)[0];

  const earningsData = groupByDate(earnings.map((e) => ({ ...e, amount: e.net_amount })), 'created_at', period);
  const ridesData = groupByDate(completedRides.map((r) => ({ ...r, amount: 1 })), 'created_at', period);

  const barMax = (data: { value: number }[]) => Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      {/* Period toggle */}
      <div className={s.filterBar}>
        {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`${s.filterBtn} ${period === p ? s.filterBtnActive : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p === 'daily' ? 'Last 30 Days' : p === 'weekly' ? 'Last 12 Weeks' : 'Last 12 Months'}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className={s.statsGrid}>
        <StatsCard label="Total Earnings" value={`$${totalEarnings.toFixed(2)}`} />
        <StatsCard label="Completed Rides" value={completedRides.length} />
        <StatsCard label="Avg Rating" value={avgRating} />
        <StatsCard label="Best Day" value={bestDay ? `$${bestDay.value.toFixed(0)}` : '—'} subtext={bestDay?.label} />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading reports...</p>
      ) : (
        <div className={s.chartsGrid}>
          {/* Earnings chart */}
          <div className={s.chartCard}>
            <div className={s.chartTitle}>Earnings</div>
            {earningsData.length === 0 ? (
              <p className={s.empty}>No earnings data</p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160 }}>
                {earningsData.slice(-20).map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 24,
                        height: `${Math.max((d.value / barMax(earningsData)) * 140, 4)}px`,
                        background: 'var(--orange)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s',
                      }}
                      title={`${d.label}: $${d.value.toFixed(2)}`}
                    />
                    {i % 3 === 0 && (
                      <span style={{ fontSize: 8, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{d.label}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rides chart */}
          <div className={s.chartCard}>
            <div className={s.chartTitle}>Rides Completed</div>
            {ridesData.length === 0 ? (
              <p className={s.empty}>No ride data</p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160 }}>
                {ridesData.slice(-20).map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 24,
                        height: `${Math.max((d.value / barMax(ridesData)) * 140, 4)}px`,
                        background: 'var(--success)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s',
                      }}
                      title={`${d.label}: ${d.value} rides`}
                    />
                    {i % 3 === 0 && (
                      <span style={{ fontSize: 8, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{d.label}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rating trend */}
          <div className={s.chartCard} style={{ gridColumn: '1 / -1' }}>
            <div className={s.chartTitle}>Rating Trend ({ratings.length} ratings)</div>
            {ratings.length === 0 ? (
              <p className={s.empty}>No ratings yet</p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
                {ratings.slice(-40).map((r, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      maxWidth: 16,
                      height: `${(r.rating / 5) * 90}px`,
                      background: r.rating >= 4 ? 'var(--success)' : r.rating >= 3 ? 'var(--orange)' : 'var(--error)',
                      borderRadius: '2px 2px 0 0',
                    }}
                    title={`${r.rating}/5 — ${new Date(r.created_at).toLocaleDateString()}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
