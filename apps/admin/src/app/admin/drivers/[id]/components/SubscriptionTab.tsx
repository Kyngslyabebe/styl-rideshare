'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import StatsCard from '@/components/admin/StatsCard';
import s from '../driverDetail.module.css';

interface Props {
  driver: any;
  driverId: string;
}

export default function SubscriptionTab({ driver, driverId }: Props) {
  const supabase = createClient();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('driver_subscriptions')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });
      setHistory(data || []);
      setLoading(false);
    })();
  }, [driverId]);

  const current = history[0];
  const status = driver.subscription_status || 'inactive';
  const collected = Number(driver.subscription_collected || 0);
  const target = Number(driver.subscription_target || 0);
  const progress = target > 0 ? Math.min(collected / target, 1) : 0;
  const remaining = Math.max(target - collected, 0);

  const isActive = status === 'active';
  const isCollecting = status === 'collecting';

  return (
    <div>
      {/* Status cards */}
      <div className={s.statsGrid}>
        <StatsCard
          label="Status"
          value={status}
          color={isActive ? 'var(--success)' : isCollecting ? 'var(--orange)' : 'var(--text-secondary)'}
        />
        <StatsCard label="Current Plan" value={current?.plan || 'None'} />
        <StatsCard label="Price" value={current ? `$${Number(current.price).toFixed(0)}` : '—'} />
        <StatsCard label="Collected" value={`$${collected.toFixed(2)}`} color="var(--orange)" />
      </div>

      {/* Collection progress */}
      {isCollecting && target > 0 && (
        <div className={s.card}>
          <h3 className={s.sectionTitle}>Collection Progress</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              ${collected.toFixed(2)} collected
            </span>
            <span style={{ color: 'var(--text)', fontWeight: 700 }}>
              ${target.toFixed(2)} target
            </span>
          </div>
          <div className={s.progressBarTrack}>
            <div className={s.progressBarFill} style={{ width: `${progress * 100}%` }} />
          </div>
          <p style={{ color: 'var(--orange)', fontSize: 11, marginTop: 6 }}>
            ${remaining.toFixed(2)} remaining · 60% of ride earnings skimmed
          </p>
        </div>
      )}

      {/* Current plan details */}
      {current && (
        <div className={s.card}>
          <h3 className={s.sectionTitle}>Current Period</h3>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Plan</span>
            <span className={s.infoValue} style={{ textTransform: 'capitalize' }}>{current.plan}</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Period start</span>
            <span className={s.infoValue}>
              {current.current_period_start ? new Date(current.current_period_start).toLocaleDateString() : '—'}
            </span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Period end</span>
            <span className={s.infoValue}>
              {current.current_period_end ? new Date(current.current_period_end).toLocaleDateString() : '—'}
            </span>
          </div>
          {driver.subscription_expires_at && (
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Expires</span>
              <span className={s.infoValue}>{new Date(driver.subscription_expires_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Subscription history */}
      <h3 className={s.sectionTitle}>Subscription History</h3>
      <div className={s.card} style={{ padding: 0, overflow: 'hidden' }}>
        <div className={s.rideRowHeader} style={{ gridTemplateColumns: '1fr 80px 80px 100px 100px' }}>
          <span>Plan</span>
          <span>Price</span>
          <span>Status</span>
          <span>Start</span>
          <span>End</span>
        </div>
        {loading ? (
          <p style={{ padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Loading...</p>
        ) : history.length === 0 ? (
          <p className={s.empty}>No subscription history</p>
        ) : (
          history.map((sub) => (
            <div
              key={sub.id}
              className={s.rideRow}
              style={{ gridTemplateColumns: '1fr 80px 80px 100px 100px', cursor: 'default' }}
            >
              <span style={{ color: 'var(--text)', fontWeight: 600, textTransform: 'capitalize' }}>{sub.plan}</span>
              <span style={{ color: 'var(--text)' }}>${Number(sub.price).toFixed(0)}</span>
              <span className={`${s.rideStatus} ${
                sub.status === 'active' || sub.status === 'collecting' ? s.statusCompleted
                  : sub.status === 'canceled' ? s.statusCancelled
                  : s.statusOther
              }`}>
                {sub.status}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                {sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString() : '—'}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '—'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
