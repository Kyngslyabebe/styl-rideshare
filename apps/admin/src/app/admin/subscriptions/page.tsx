'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import s from '../dashboard.module.css';

type FilterStatus = 'all' | 'active' | 'collecting' | 'inactive' | 'cancelled';

export default function SubscriptionsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');

  // Stats
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [collectingCount, setCollectingCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalTarget, setTotalTarget] = useState(0);

  // Driver list with subscription info
  const [drivers, setDrivers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  // Plan breakdown
  const [planBreakdown, setPlanBreakdown] = useState<{ plan: string; count: number }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Get all drivers + their latest subscription record for plan info
    const [driversRes, subsRes] = await Promise.all([
      supabase.from('drivers').select('*'),
      supabase.from('driver_subscriptions').select('driver_id, plan, status, price')
        .order('created_at', { ascending: false }),
    ]);

    if (driversRes.error) console.error('Drivers fetch error:', driversRes.error);

    const list = driversRes.data || [];
    setTotalDrivers(list.length);

    // Map latest subscription plan per driver
    const subMap: Record<string, any> = {};
    (subsRes.data || []).forEach((sub: any) => {
      if (!subMap[sub.driver_id]) subMap[sub.driver_id] = sub; // first = latest
    });

    const active = list.filter((d: any) => d.subscription_status === 'active');
    const collecting = list.filter((d: any) => d.subscription_status === 'collecting');
    const inactive = list.filter((d: any) => !d.subscription_status || d.subscription_status === 'inactive');

    setActiveCount(active.length);
    setCollectingCount(collecting.length);
    setInactiveCount(inactive.length);

    // Total collected & target from collecting drivers
    const col = collecting.reduce((sum: number, d: any) => sum + Number(d.subscription_collected || 0), 0);
    const tar = collecting.reduce((sum: number, d: any) => sum + Number(d.subscription_target || 0), 0);
    setTotalCollected(col);
    setTotalTarget(tar);

    // Plan breakdown from driver_subscriptions
    const planMap: Record<string, number> = {};
    Object.values(subMap).forEach((sub: any) => {
      if (sub.plan && sub.status !== 'canceled') {
        planMap[sub.plan] = (planMap[sub.plan] || 0) + 1;
      }
    });
    setPlanBreakdown(
      Object.entries(planMap)
        .map(([plan, count]) => ({ plan, count }))
        .sort((a, b) => b.count - a.count)
    );

    // Apply filter
    let filtered = list;
    if (filter === 'active') filtered = active;
    else if (filter === 'collecting') filtered = collecting;
    else if (filter === 'inactive') filtered = inactive;
    else if (filter === 'cancelled') filtered = list.filter((d: any) => d.subscription_status === 'cancelled');

    // Attach plan info to each driver
    filtered = filtered.map((d: any) => ({
      ...d,
      _plan: subMap[d.id]?.plan || null,
      _subPrice: subMap[d.id]?.price || null,
    }));

    setDrivers(filtered);

    // Fetch profiles for all drivers in the filtered list
    const ids = filtered.map((d: any) => d.id);
    if (ids.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', ids);
      const map: Record<string, any> = {};
      (profileData || []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }

    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const overallCollectionPct = totalTarget > 0 ? (totalCollected / totalTarget) * 100 : 0;
  const planLabels: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
  const totalWithPlan = planBreakdown.reduce((sum, p) => sum + p.count, 0) || 1;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: s.badgeSuccess,
      collecting: s.badgeWarning,
      inactive: s.badgeNeutral,
      cancelled: s.badgeError,
    };
    return map[status] || s.badgeNeutral;
  };

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.title} style={{ marginBottom: 4 }}>Subscriptions</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Driver subscription management and collection tracking
          </p>
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <span className={s.statLabel}>Active</span>
          <span className={s.statValue} style={{ color: 'var(--success)' }}>{activeCount}</span>
          <span className={s.statSubtext}>fully collected</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Collecting</span>
          <span className={s.statValue} style={{ color: '#FF9800' }}>{collectingCount}</span>
          <span className={s.statSubtext}>skimming in progress</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Inactive</span>
          <span className={s.statValue} style={{ color: 'var(--text-secondary)' }}>{inactiveCount}</span>
          <span className={s.statSubtext}>no subscription</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Collection Rate</span>
          <span className={s.statValue}>{overallCollectionPct.toFixed(0)}%</span>
          <span className={s.statSubtext}>${totalCollected.toFixed(2)} / ${totalTarget.toFixed(2)}</span>
        </div>
      </div>

      <div className={s.twoCol}>
        {/* ─── Collection Progress ─── */}
        <div className={s.section}>
          <h3 className={s.sectionTitle}>Active Collection Progress</h3>
          <p className={s.sectionDesc} style={{ marginBottom: 16 }}>
            60% skim from ride earnings until subscription fully collected
          </p>
          {collectingCount === 0 ? (
            <p className={s.empty} style={{ padding: '20px 0' }}>No drivers currently collecting</p>
          ) : (
            <div>
              {/* Overall progress bar */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Overall Collection</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{overallCollectionPct.toFixed(1)}%</span>
                </div>
                <div className={s.hBarTrack} style={{ height: 10 }}>
                  <div className={s.hBarFill} style={{ width: `${Math.min(overallCollectionPct, 100)}%`, background: 'var(--orange)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text)' }}>
                <span>Collected: <strong style={{ color: 'var(--success)' }}>${totalCollected.toFixed(2)}</strong></span>
                <span>Remaining: <strong style={{ color: '#FF9800' }}>${(totalTarget - totalCollected).toFixed(2)}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* ─── Plan Breakdown ─── */}
        <div className={s.section}>
          <h3 className={s.sectionTitle}>Plan Distribution</h3>
          <p className={s.sectionDesc} style={{ marginBottom: 16 }}>Active and collecting subscriptions by plan</p>
          <div className={s.breakdownList}>
            {planBreakdown.map((p) => (
              <div key={p.plan} className={s.hBar}>
                <span className={s.hBarLabel}>{planLabels[p.plan] || p.plan}</span>
                <div className={s.hBarTrack}>
                  <div
                    className={s.hBarFill}
                    style={{
                      width: `${(p.count / totalWithPlan) * 100}%`,
                      background: p.plan === 'monthly' ? '#4A90E2' : p.plan === 'weekly' ? 'var(--orange)' : '#00C853',
                    }}
                  />
                </div>
                <span className={s.hBarValue}>{p.count} ({((p.count / totalWithPlan) * 100).toFixed(0)}%)</span>
              </div>
            ))}
            {planBreakdown.length === 0 && (
              <p className={s.empty} style={{ padding: '20px 0' }}>No subscriptions yet</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Driver List ─── */}
      <div className={s.tableCard}>
        <div className={s.tableHeader}>
          <div>
            <span className={s.tableTitle}>Drivers</span>
            <span className={s.tableCount} style={{ marginLeft: 8 }}>{drivers.length} results</span>
          </div>
          <div className={s.filterBar} style={{ marginBottom: 0 }}>
            {(['all', 'active', 'collecting', 'inactive'] as FilterStatus[]).map((f) => (
              <button
                key={f}
                className={`${s.filterBtn} ${filter === f ? s.filterBtnActive : ''}`}
                onClick={() => setFilter(f)}
                style={{ padding: '4px 12px', fontSize: 12 }}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 20, textAlign: 'center' }}>Loading...</p>
        ) : drivers.length === 0 ? (
          <p className={s.empty}>No drivers match this filter</p>
        ) : (
          <table className={s.miniTable}>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Collected</th>
                <th>Target</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d: any) => {
                const p = profiles[d.id];
                const pct = d.subscription_target > 0
                  ? (Number(d.subscription_collected || 0) / Number(d.subscription_target)) * 100
                  : 0;
                return (
                  <tr
                    key={d.id}
                    className={s.miniTableClickable}
                    onClick={() => router.push(`/admin/drivers/${d.id}?tab=subscription`)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p?.avatar_url ? (
                          <img src={p.avatar_url} alt="" className={s.avatarSmall} />
                        ) : (
                          <div className={s.avatarFallbackSmall}>
                            {p?.full_name?.charAt(0)?.toUpperCase() || 'D'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p?.full_name || 'Unknown'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p?.email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{d._plan || '—'}</td>
                    <td>
                      <span className={`${s.badge} ${statusBadge(d.subscription_status || 'inactive')}`}>
                        {(d.subscription_status || 'inactive').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>${Number(d.subscription_collected || 0).toFixed(2)}</td>
                    <td>${Number(d.subscription_target || 0).toFixed(2)}</td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className={s.hBarTrack} style={{ flex: 1, height: 6 }}>
                          <div
                            className={s.hBarFill}
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background: pct >= 100 ? 'var(--success)' : 'var(--orange)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', minWidth: 35 }}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
