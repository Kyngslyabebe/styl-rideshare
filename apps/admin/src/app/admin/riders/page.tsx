'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/adminFetch';
import s from '../dashboard.module.css';

type StatusFilter = 'all' | 'active' | 'inactive' | 'verified';

export default function RidersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [riders, setRiders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  // Stats
  const [totalRiders, setTotalRiders] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [newThisWeek, setNewThisWeek] = useState(0);

  // Ride counts per rider
  const [rideCounts, setRideCounts] = useState<Record<string, number>>({});
  const [spentMap, setSpentMap] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/riders');
      const data = await res.json();
      const list = data.riders || [];
      setRiders(list);
      setTotalRiders(list.length);
      setActiveCount(list.filter((r: any) => r.is_active !== false).length);
      setVerifiedCount(list.filter((r: any) => r.is_verified).length);
      setNewThisWeek(data.newThisWeek || 0);
      setRideCounts(data.rideCounts || {});
      setSpentMap(data.spentMap || {});
    } catch {
      setRiders([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let list = riders;
    if (filter === 'active') list = list.filter((r) => r.is_active !== false);
    else if (filter === 'inactive') list = list.filter((r) => r.is_active === false);
    else if (filter === 'verified') list = list.filter((r) => r.is_verified);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.full_name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.phone?.includes(q)
      );
    }
    return list;
  }, [riders, filter, search]);

  const toggleActive = async (id: string, current: boolean) => {
    await adminFetch('/api/admin/riders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    });
    fetchData();
  };

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.title} style={{ marginBottom: 4 }}>Riders</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Rider management and analytics
          </p>
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <span className={s.statLabel}>Total Riders</span>
          <span className={s.statValue}>{totalRiders}</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Active</span>
          <span className={s.statValue} style={{ color: 'var(--success)' }}>{activeCount}</span>
          <span className={s.statSubtext}>{totalRiders > 0 ? ((activeCount / totalRiders) * 100).toFixed(0) : 0}% of total</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Verified</span>
          <span className={s.statValue} style={{ color: '#4A90E2' }}>{verifiedCount}</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>New This Week</span>
          <span className={s.statValue} style={{ color: 'var(--orange)' }}>{newThisWeek}</span>
        </div>
      </div>

      {/* ─── Search & Filters ─── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className={s.searchInput}
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={s.filterBar} style={{ marginBottom: 0 }}>
          {(['all', 'active', 'inactive', 'verified'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`${s.filterBtn} ${filter === f ? s.filterBtnActive : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className={s.tableCard}>
        <div className={s.tableHeader}>
          <span className={s.tableTitle}>Riders</span>
          <span className={s.tableCount}>{filtered.length} results</span>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 20, textAlign: 'center' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p className={s.empty}>No riders found</p>
        ) : (
          <table className={s.miniTable}>
            <thead>
              <tr>
                <th>Rider</th>
                <th>Phone</th>
                <th>Rides</th>
                <th>Total Spent</th>
                <th>Verified</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr
                  key={r.id}
                  className={s.miniTableClickable}
                  onClick={() => router.push(`/admin/riders/${r.id}`)}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt="" className={s.avatarSmall} />
                      ) : (
                        <div className={s.avatarFallbackSmall}>
                          {r.full_name?.charAt(0)?.toUpperCase() || 'R'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.full_name || 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{r.phone || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{rideCounts[r.id] || 0}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                    ${(spentMap[r.id] || 0).toFixed(2)}
                  </td>
                  <td>
                    {r.is_verified ? (
                      <span className={`${s.badge} ${s.badgeSuccess}`}>Verified</span>
                    ) : (
                      <span className={`${s.badge} ${s.badgeNeutral}`}>No</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleActive(r.id, r.is_active !== false); }}
                      className={`${s.badge} ${r.is_active !== false ? s.badgeSuccess : s.badgeError}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                    >
                      {r.is_active !== false ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
