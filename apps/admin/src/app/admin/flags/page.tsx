'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import s from '../dashboard.module.css';

const FLAG_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  early_arrival_swipe: { label: 'Early Arrival', color: '#FF9800', bg: 'rgba(255,152,0,0.1)' },
  fake_pickup: { label: 'Fake Pickup', color: '#FF1744', bg: 'rgba(255,23,68,0.1)' },
  short_ride: { label: 'Short Ride', color: '#9C27B0', bg: 'rgba(156,39,176,0.1)' },
  gps_mismatch: { label: 'GPS Mismatch', color: '#2196F3', bg: 'rgba(33,150,243,0.1)' },
  repeated_cancel: { label: 'Repeated Cancel', color: '#FF5722', bg: 'rgba(255,87,34,0.1)' },
  suspicious_pattern: { label: 'Suspicious Pattern', color: '#F44336', bg: 'rgba(244,67,54,0.1)' },
};

interface RideFlag {
  id: string;
  ride_id: string;
  driver_id: string | null;
  rider_id: string | null;
  flag_type: string;
  description: string;
  driver_lat: number | null;
  driver_lng: number | null;
  expected_lat: number | null;
  expected_lng: number | null;
  distance_meters: number | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  // joined
  driver_name?: string;
  rider_name?: string;
}

export default function FlagsPage() {
  const [flags, setFlags] = useState<RideFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, unresolved: 0, today: 0, topType: '' });

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter, type: typeFilter });
      const res = await adminFetch(`/api/admin/flags?${params}`);
      const data = await res.json();
      const rawFlags = data.flags || [];
      const nameMap = data.nameMap || {};

      const enriched: RideFlag[] = rawFlags.map((f: any) => ({
        ...f,
        driver_name: f.driver_id ? nameMap[f.driver_id] || 'Unknown' : null,
        rider_name: f.rider_id ? nameMap[f.rider_id] || 'Unknown' : null,
      }));

      setFlags(enriched);

      // Top flag type from current data
      const typeCounts: Record<string, number> = {};
      rawFlags.forEach((f: any) => { typeCounts[f.flag_type] = (typeCounts[f.flag_type] || 0) + 1; });
      const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

      setStats({
        total: data.stats?.total || 0,
        unresolved: data.stats?.unresolved || 0,
        today: data.stats?.today || 0,
        topType,
      });
    } catch {
      setFlags([]);
    }
    setLoading(false);
  }, [filter, typeFilter]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const handleResolve = async (flagId: string) => {
    setResolving(true);
    await adminFetch('/api/admin/flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flagId,
        updates: {
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolveNotes || 'Reviewed and resolved',
        },
      }),
    });
    setResolveNotes('');
    setExpandedId(null);
    setResolving(false);
    fetchFlags();
  };

  const handleUnresolve = async (flagId: string) => {
    await adminFetch('/api/admin/flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flagId,
        updates: { resolved: false, resolved_by: null, resolved_at: null, resolution_notes: null },
      }),
    });
    fetchFlags();
  };

  const filteredFlags = flags.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.description?.toLowerCase().includes(q) ||
      f.driver_name?.toLowerCase().includes(q) ||
      f.rider_name?.toLowerCase().includes(q) ||
      f.ride_id?.toLowerCase().includes(q)
    );
  });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDistance = (meters: number | null) => {
    if (meters === null || meters === undefined) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  if (loading) {
    return (
      <div>
        <h1 className={s.title}>Ride Flags</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading flags...</p>
      </div>
    );
  }

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.title} style={{ marginBottom: 4 }}>Ride Flags</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Anti-abuse monitoring and GPS violation tracking
          </p>
        </div>
        <button
          type="button"
          className={`${s.btn} ${s.btnOutline}`}
          onClick={() => fetchFlags()}
        >
          Refresh
        </button>
      </div>

      {/* Stats cards */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <span className={s.statLabel}>Total Flags</span>
          <span className={s.statValue}>{stats.total}</span>
          <span className={s.statSubtext}>all time</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Unresolved</span>
          <span className={s.statValue} style={{ color: stats.unresolved > 0 ? '#FF1744' : 'var(--success)' }}>
            {stats.unresolved}
          </span>
          <span className={s.statSubtext}>needs review</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Today</span>
          <span className={s.statValue} style={{ color: '#FF9800' }}>{stats.today}</span>
          <span className={s.statSubtext}>flagged today</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Most Common</span>
          <span className={s.statValue} style={{ fontSize: 16 }}>
            {FLAG_LABELS[stats.topType]?.label || 'None'}
          </span>
          <span className={s.statSubtext}>flag type</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className={s.filterBar} style={{ marginBottom: 0 }}>
          {(['unresolved', 'all', 'resolved'] as const).map((f) => (
            <button
              key={f}
              className={`${s.filterBtn} ${filter === f ? s.filterBtnActive : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'unresolved' ? 'Unresolved' : f === 'resolved' ? 'Resolved' : 'All'}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            height: 38, borderRadius: 8, border: '1px solid var(--input-border)',
            background: 'var(--input-bg)', color: 'var(--text)', padding: '0 12px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <option value="all">All Types</option>
          {Object.entries(FLAG_LABELS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <input
          className={s.searchInput}
          placeholder="Search by driver, rider, description, ride ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />

        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginLeft: 'auto' }}>
          {filteredFlags.length} flag{filteredFlags.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Flags table */}
      <div className={s.tableCard}>
        <table className={s.miniTable} style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Driver</th>
              <th>Description</th>
              <th>Distance</th>
              <th>Time</th>
              <th>Status</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredFlags.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <p className={s.empty}>
                    {filter === 'unresolved' ? 'No unresolved flags. All clear!' : 'No flags found'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredFlags.map((flag) => {
                const typeInfo = FLAG_LABELS[flag.flag_type] || { label: flag.flag_type, color: '#999', bg: 'rgba(150,150,150,0.1)' };
                const isExpanded = expandedId === flag.id;

                return (
                  <tr key={flag.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : flag.id)}>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '3px 10px', borderRadius: 6,
                        fontSize: 11, fontWeight: 700,
                        color: typeInfo.color, background: typeInfo.bg,
                      }}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {flag.driver_name || 'N/A'}
                        </div>
                        {flag.rider_name && (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            Rider: {flag.rider_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, color: 'var(--text)', maxWidth: 360 }}>
                        {flag.description}
                      </div>
                      {/* Expanded detail */}
                      {isExpanded && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            marginTop: 12, padding: 16, borderRadius: 10,
                            background: 'var(--input-bg)', border: '1px solid var(--card-border)',
                          }}
                        >
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Ride ID
                              </span>
                              <p style={{ fontSize: 12, color: 'var(--text)', margin: '2px 0 0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {flag.ride_id}
                              </p>
                            </div>
                            <div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Flagged At
                              </span>
                              <p style={{ fontSize: 12, color: 'var(--text)', margin: '2px 0 0' }}>
                                {new Date(flag.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {/* GPS Evidence */}
                          {(flag.driver_lat !== null || flag.expected_lat !== null) && (
                            <div style={{
                              padding: 12, borderRadius: 8, marginBottom: 12,
                              background: 'var(--card)', border: '1px solid var(--card-border)',
                            }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                GPS Evidence
                              </span>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                                {flag.driver_lat !== null && (
                                  <div>
                                    <span style={{ fontSize: 11, color: '#FF1744', fontWeight: 600 }}>Driver Location</span>
                                    <p style={{ fontSize: 12, color: 'var(--text)', margin: '2px 0 0', fontFamily: 'monospace' }}>
                                      {Number(flag.driver_lat).toFixed(6)}, {Number(flag.driver_lng).toFixed(6)}
                                    </p>
                                  </div>
                                )}
                                {flag.expected_lat !== null && (
                                  <div>
                                    <span style={{ fontSize: 11, color: '#00C853', fontWeight: 600 }}>Expected Location</span>
                                    <p style={{ fontSize: 12, color: 'var(--text)', margin: '2px 0 0', fontFamily: 'monospace' }}>
                                      {Number(flag.expected_lat).toFixed(6)}, {Number(flag.expected_lng).toFixed(6)}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {flag.distance_meters !== null && (
                                <div style={{
                                  marginTop: 10, padding: '8px 12px', borderRadius: 6,
                                  background: 'rgba(255,23,68,0.08)', display: 'inline-flex',
                                  alignItems: 'center', gap: 6,
                                }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#FF1744' }}>
                                    {formatDistance(flag.distance_meters)} away
                                  </span>
                                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                    (limit: 200m)
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Resolution */}
                          {flag.resolved ? (
                            <div style={{
                              padding: 12, borderRadius: 8,
                              background: 'rgba(0,200,83,0.06)', border: '1px solid rgba(0,200,83,0.2)',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#00C853' }}>Resolved</span>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                  {flag.resolved_at ? formatDate(flag.resolved_at) : ''}
                                </span>
                              </div>
                              {flag.resolution_notes && (
                                <p style={{ fontSize: 12, color: 'var(--text)', margin: '0 0 8px' }}>
                                  {flag.resolution_notes}
                                </p>
                              )}
                              <button
                                type="button"
                                className={`${s.btn} ${s.btnOutline}`}
                                style={{ height: 32, fontSize: 12 }}
                                onClick={() => handleUnresolve(flag.id)}
                              >
                                Reopen Flag
                              </button>
                            </div>
                          ) : (
                            <div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Resolution Notes
                              </span>
                              <textarea
                                value={resolveNotes}
                                onChange={(e) => setResolveNotes(e.target.value)}
                                placeholder="Add notes about how this was reviewed and resolved..."
                                style={{
                                  width: '100%', height: 72, borderRadius: 8, marginTop: 6,
                                  border: '1px solid var(--input-border)', background: 'var(--card)',
                                  color: 'var(--text)', padding: 10, fontSize: 13, resize: 'vertical',
                                }}
                              />
                              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button
                                  type="button"
                                  className={`${s.btn} ${s.btnSuccess}`}
                                  style={{ height: 36 }}
                                  onClick={() => handleResolve(flag.id)}
                                  disabled={resolving}
                                >
                                  {resolving ? 'Resolving...' : 'Mark Resolved'}
                                </button>
                                <button
                                  type="button"
                                  className={`${s.btn} ${s.btnOutline}`}
                                  style={{ height: 36 }}
                                  onClick={() => { setExpandedId(null); setResolveNotes(''); }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {flag.distance_meters !== null ? (
                        <span style={{
                          fontWeight: 700, fontSize: 13,
                          color: Number(flag.distance_meters) > 200 ? '#FF1744' : '#00C853',
                        }}>
                          {formatDistance(flag.distance_meters)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>N/A</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {formatDate(flag.created_at)}
                      </span>
                    </td>
                    <td>
                      {flag.resolved ? (
                        <span className={`${s.badge} ${s.badgeSuccess}`}>Resolved</span>
                      ) : (
                        <span className={`${s.badge} ${s.badgeError}`}>Open</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
                        {isExpanded ? '▾' : '▸'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Flag type legend */}
      <div className={s.section}>
        <h3 className={s.sectionTitle}>Flag Types Reference</h3>
        <p className={s.sectionDesc} style={{ marginBottom: 16 }}>What each flag type means and when it triggers</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FlagTypeInfo
            type="early_arrival_swipe"
            desc='Driver swiped "arrived" but GPS shows they are more than 200m from the pickup location.'
          />
          <FlagTypeInfo
            type="fake_pickup"
            desc='Driver swiped "picked up" but GPS shows they are more than 200m from the pickup. Could indicate a phantom ride.'
          />
          <FlagTypeInfo
            type="short_ride"
            desc="Ride completed in under 2 minutes or traveled less than 0.5km. Possible fare manipulation."
          />
          <FlagTypeInfo
            type="gps_mismatch"
            desc='Driver swiped "drop off" but GPS shows they are more than 200m from the destination.'
          />
          <FlagTypeInfo
            type="repeated_cancel"
            desc="Driver has a pattern of cancelling rides after accepting. May indicate cherry-picking."
          />
          <FlagTypeInfo
            type="suspicious_pattern"
            desc="Auto-generated when a driver is taken offline after 4+ consecutive ignored ride requests."
          />
        </div>
      </div>
    </div>
  );
}

function FlagTypeInfo({ type, desc }: { type: string; desc: string }) {
  const info = FLAG_LABELS[type];
  if (!info) return null;
  return (
    <div style={{
      padding: 14, borderRadius: 10,
      background: info.bg, border: `1px solid ${info.color}20`,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: info.color }}>{info.label}</span>
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}
