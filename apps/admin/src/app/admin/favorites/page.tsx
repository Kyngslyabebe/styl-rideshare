'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import s from '../dashboard.module.css';

interface FavoritePair {
  id: string;
  rider_id: string;
  driver_id: string;
  created_at: string;
  rider_name: string;
  driver_name: string;
  rider_email: string;
  driver_email: string;
}

interface TopDriver {
  driver_id: string;
  driver_name: string;
  count: number;
}

export default function FavoritesPage() {
  const [pairs, setPairs] = useState<FavoritePair[]>([]);
  const [topDrivers, setTopDrivers] = useState<TopDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, uniqueRiders: 0, uniqueDrivers: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await adminFetch('/api/admin/favorites');
        const data = await res.json();
        const raw = data.favorites || [];
        const profileMap = data.profiles || {};

        const enriched: FavoritePair[] = raw.map((f: any) => ({
          ...f,
          rider_name: profileMap[f.rider_id]?.name || 'Unknown',
          driver_name: profileMap[f.driver_id]?.name || 'Unknown',
          rider_email: profileMap[f.rider_id]?.email || '',
          driver_email: profileMap[f.driver_id]?.email || '',
        }));

        setPairs(enriched);

        const uniqueRiders = new Set(raw.map((f: any) => f.rider_id)).size;
        const uniqueDrivers = new Set(raw.map((f: any) => f.driver_id)).size;
        setStats({ total: raw.length, uniqueRiders, uniqueDrivers });

        const driverCounts: Record<string, number> = {};
        raw.forEach((f: any) => { driverCounts[f.driver_id] = (driverCounts[f.driver_id] || 0) + 1; });
        const top = Object.entries(driverCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([driver_id, count]) => ({
            driver_id,
            driver_name: profileMap[driver_id]?.name || 'Unknown',
            count,
          }));
        setTopDrivers(top);
      } catch {
        setPairs([]);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = pairs.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.rider_name.toLowerCase().includes(q) ||
      p.driver_name.toLowerCase().includes(q) ||
      p.rider_email.toLowerCase().includes(q) ||
      p.driver_email.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div>
        <h1 className={s.title}>Favorite Drivers</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading favorites...</p>
      </div>
    );
  }

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.title} style={{ marginBottom: 4 }}>Favorite Drivers</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Rider-driver favorite pairs used for priority matching
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <span className={s.statLabel}>Total Favorites</span>
          <span className={s.statValue}>{stats.total}</span>
          <span className={s.statSubtext}>rider-driver pairs</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Riders with Favorites</span>
          <span className={s.statValue} style={{ color: '#4A90E2' }}>{stats.uniqueRiders}</span>
          <span className={s.statSubtext}>unique riders</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Favorited Drivers</span>
          <span className={s.statValue} style={{ color: 'var(--success)' }}>{stats.uniqueDrivers}</span>
          <span className={s.statSubtext}>unique drivers</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Avg Favorites / Rider</span>
          <span className={s.statValue} style={{ color: 'var(--orange)' }}>
            {stats.uniqueRiders > 0 ? (stats.total / stats.uniqueRiders).toFixed(1) : '0'}
          </span>
          <span className={s.statSubtext}>per rider</span>
        </div>
      </div>

      <div className={s.twoCol}>
        {/* Top Favorited Drivers */}
        <div className={s.section}>
          <h3 className={s.sectionTitle}>Most Favorited Drivers</h3>
          <p className={s.sectionDesc} style={{ marginBottom: 16 }}>
            Drivers with the most riders who marked them as favorite
          </p>
          {topDrivers.length === 0 ? (
            <p className={s.empty}>No favorites yet</p>
          ) : (
            topDrivers.map((d, i) => (
              <div key={d.driver_id} className={s.feedItem}>
                <span style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: i === 0 ? 'var(--orange)' : i === 1 ? '#4A90E2' : i === 2 ? '#00C853' : 'var(--card-border)',
                  color: i < 3 ? '#fff' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <span className={s.feedText}>{d.driver_name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--orange)' }}>{d.count}</span>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                    {d.count === 1 ? 'rider' : 'riders'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* How it works */}
        <div className={s.section}>
          <h3 className={s.sectionTitle}>How Priority Matching Works</h3>
          <p className={s.sectionDesc} style={{ marginBottom: 16 }}>
            How favorites influence the driver matching algorithm
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StepItem number={1} title="Rider books a ride" desc="The rider requests a ride from the app. The match-driver function fires." />
            <StepItem number={2} title="System checks favorites" desc="Before sorting by distance, the system loads the rider's favorite_drivers list." />
            <StepItem number={3} title="Favorites get priority" desc="Available drivers who are in the rider's favorites list are sorted to the top, ahead of closer non-favorite drivers." />
            <StepItem number={4} title="Rider gets notified" desc='If matched with a favorite, the rider sees "Your favorite driver is on the way!" instead of the generic message.' />
          </div>
        </div>
      </div>

      {/* All pairs table */}
      <div style={{ marginBottom: 20 }}>
        <input
          className={s.searchInput}
          placeholder="Search by rider or driver name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 16 }}
        />
      </div>

      <div className={s.tableCard}>
        <div className={s.tableHeader}>
          <span className={s.tableTitle}>All Favorite Pairs</span>
          <span className={s.tableCount}>{filtered.length} pair{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <table className={s.miniTable} style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Rider</th>
              <th>Driver</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <p className={s.empty}>No favorite pairs found</p>
                </td>
              </tr>
            ) : (
              filtered.map((pair) => (
                <tr key={pair.id}>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{pair.rider_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{pair.rider_email}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{pair.driver_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{pair.driver_email}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {new Date(pair.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StepItem({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'var(--orange)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 800,
      }}>
        {number}
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}
