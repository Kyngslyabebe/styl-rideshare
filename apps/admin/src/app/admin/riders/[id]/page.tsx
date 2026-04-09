'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import s from '../../dashboard.module.css';

export default function RiderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<any>(null);
  const [rides, setRides] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState<'rides' | 'payments' | 'ratings'>('rides');

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const [profileRes, ridesRes, paymentsRes, ratingsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('rides').select('*, drivers:driver_id(id)').eq('rider_id', id).order('created_at', { ascending: false }).limit(100),
      supabase.from('payments').select('*').eq('rider_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('ratings').select('*').eq('rider_id', id).order('created_at', { ascending: false }).limit(50),
    ]);

    setProfile(profileRes.data);
    setRides(ridesRes.data || []);
    setPayments(paymentsRes.data || []);
    setRatings(ratingsRes.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const toggleActive = async () => {
    if (!profile) return;
    setSaving(true);
    await supabase.from('profiles').update({ is_active: !profile.is_active }).eq('id', id);
    await fetchData();
    setSaving(false);
    showToast(profile.is_active ? 'Rider deactivated' : 'Rider activated');
  };

  if (loading || !profile) {
    return <p style={{ color: 'var(--text-secondary)', padding: 20 }}>Loading rider...</p>;
  }

  // ── Computed stats ──
  const completedRides = rides.filter((r) => r.status === 'completed');
  const cancelledRides = rides.filter((r) => r.status === 'cancelled');
  const totalSpent = completedRides.reduce((sum, r) => sum + Number(r.final_fare || r.estimated_fare || 0), 0);
  const avgFare = completedRides.length > 0 ? totalSpent / completedRides.length : 0;
  const completionRate = rides.length > 0 ? (completedRides.length / rides.length) * 100 : 0;
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + Number(r.rating || 0), 0) / ratings.length : 0;

  // Ride frequency: rides per week since first ride
  const firstRide = rides.length > 0 ? new Date(rides[rides.length - 1].created_at) : null;
  const weeksSinceFirst = firstRide ? Math.max(1, (Date.now() - firstRide.getTime()) / (7 * 86400000)) : 1;
  const ridesPerWeek = (rides.length / weeksSinceFirst).toFixed(1);

  // Ride type breakdown
  const typeMap: Record<string, number> = {};
  rides.forEach((r) => {
    const t = r.ride_type || 'standard';
    typeMap[t] = (typeMap[t] || 0) + 1;
  });
  const typeBreakdown = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);
  const typeLabels: Record<string, string> = { standard: 'Standard', xl: 'XL', luxury: 'Luxury', electric: 'Eco' };
  const typeColors: Record<string, string> = { standard: '#4A90E2', xl: '#FF9800', luxury: '#9C27B0', electric: '#00C853' };

  const initial = profile.full_name?.charAt(0)?.toUpperCase() || 'R';

  return (
    <div>
      {/* ─── Header ─��─ */}
      <div className={s.detailHeader}>
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className={s.avatar} style={{ width: 64, height: 64 }} />
        ) : (
          <div className={s.avatarFallback} style={{ width: 64, height: 64, fontSize: 24 }}>{initial}</div>
        )}
        <div className={s.detailHeaderInfo}>
          <h1 className={s.detailName}>{profile.full_name}</h1>
          <p className={s.detailSub}>{profile.email}{profile.phone ? ` · ${profile.phone}` : ''}</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <span className={`${s.badge} ${profile.is_active !== false ? s.badgeSuccess : s.badgeError}`}>
              {profile.is_active !== false ? 'Active' : 'Inactive'}
            </span>
            {profile.is_verified && (
              <span className={`${s.badge} ${s.badgeInfo}`}>Verified</span>
            )}
          </div>
        </div>
        <div className={s.detailActions}>
          <button
            type="button"
            className={`${s.btn} ${profile.is_active !== false ? s.btnDanger : s.btnSuccess}`}
            onClick={toggleActive}
            disabled={saving}
          >
            {profile.is_active !== false ? 'Deactivate' : 'Activate'}
          </button>
          <button
            type="button"
            className={`${s.btn} ${s.btnOutline}`}
            onClick={() => router.back()}
          >
            Back
          </button>
        </div>
      </div>

      {toast && <div className={s.toast}>{toast}</div>}

      {/* ─── Stats ─── */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <span className={s.statLabel}>Total Rides</span>
          <span className={s.statValue}>{rides.length}</span>
          <span className={s.statSubtext}>{ridesPerWeek}/week avg</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Completed</span>
          <span className={s.statValue} style={{ color: 'var(--success)' }}>{completedRides.length}</span>
          <span className={s.statSubtext}>{completionRate.toFixed(0)}% completion</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Cancelled</span>
          <span className={s.statValue} style={{ color: '#FF1744' }}>{cancelledRides.length}</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Total Spent</span>
          <span className={s.statValue}>${totalSpent.toFixed(2)}</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Avg Fare</span>
          <span className={s.statValue}>${avgFare.toFixed(2)}</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Avg Rating Given</span>
          <span className={s.statValue} style={{ color: '#FF9800' }}>
            {avgRating > 0 ? avgRating.toFixed(1) : '—'}
          </span>
        </div>
      </div>

      <div className={s.twoCol}>
        {/* ─── Ride Type Breakdown ──�� */}
        <div className={s.section}>
          <h3 className={s.sectionTitle}>Preferred Ride Types</h3>
          <p className={s.sectionDesc} style={{ marginBottom: 16 }}>Distribution across all rides</p>
          {typeBreakdown.length === 0 ? (
            <p className={s.empty} style={{ padding: '20px 0' }}>No rides yet</p>
          ) : (
            <div className={s.breakdownList}>
              {typeBreakdown.map(([type, count]) => (
                <div key={type} className={s.hBar}>
                  <span className={s.hBarLabel}>{typeLabels[type] || type}</span>
                  <div className={s.hBarTrack}>
                    <div
                      className={s.hBarFill}
                      style={{
                        width: `${(count / rides.length) * 100}%`,
                        background: typeColors[type] || 'var(--orange)',
                      }}
                    />
                  </div>
                  <span className={s.hBarValue}>{count} ({((count / rides.length) * 100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ���── Account Info ─── */}
        <div className={s.section}>
          <h3 className={s.sectionTitle}>Account Info</h3>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Joined</span>
            <span className={s.infoValue}>{new Date(profile.created_at).toLocaleDateString()}</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Email</span>
            <span className={s.infoValue}>{profile.email}</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Phone</span>
            <span className={s.infoValue}>{profile.phone || 'Not set'}</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Verified</span>
            <span className={s.infoValue} style={{ color: profile.is_verified ? 'var(--success)' : 'var(--text-secondary)' }}>
              {profile.is_verified ? 'Yes' : 'No'}
            </span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Total Payments</span>
            <span className={s.infoValue}>{payments.length}</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Rider ID</span>
            <span className={s.infoValue} style={{ fontFamily: 'monospace', fontSize: 10 }}>{id}</span>
          </div>
        </div>
      </div>

      {/* ─── Tab bar ─── */}
      <div className={s.tabBar}>
        {(['rides', 'payments', 'ratings'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`${s.tab} ${tab === t ? s.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'rides' ? `Rides (${rides.length})` : t === 'payments' ? `Payments (${payments.length})` : `Ratings (${ratings.length})`}
          </button>
        ))}
      </div>

      {/* ─── Rides Tab ─── */}
      {tab === 'rides' && (
        <div className={s.tableCard}>
          <div className={s.tableHeader}>
            <span className={s.tableTitle}>Ride History</span>
            <span className={s.tableCount}>{rides.length} rides</span>
          </div>
          {rides.length === 0 ? (
            <p className={s.empty}>No rides yet</p>
          ) : (
            <table className={s.miniTable}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Pickup</th>
                  <th>Dropoff</th>
                  <th>Fare</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rides.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className={`${s.badge} ${
                        r.status === 'completed' ? s.badgeSuccess
                        : r.status === 'cancelled' ? s.badgeError
                        : r.status === 'in_progress' ? s.badgeInfo
                        : s.badgeWarning
                      }`} style={{ textTransform: 'capitalize' }}>
                        {r.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{r.ride_type || 'standard'}</td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.pickup_address || '—'}
                    </td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.dropoff_address || '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>${Number(r.final_fare || r.estimated_fare || 0).toFixed(2)}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Payments Tab ─── */}
      {tab === 'payments' && (
        <div className={s.tableCard}>
          <div className={s.tableHeader}>
            <span className={s.tableTitle}>Payment History</span>
            <span className={s.tableCount}>{payments.length} payments</span>
          </div>
          {payments.length === 0 ? (
            <p className={s.empty}>No payments yet</p>
          ) : (
            <table className={s.miniTable}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Currency</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className={`${s.badge} ${
                        p.status === 'succeeded' ? s.badgeSuccess
                        : p.status === 'failed' ? s.badgeError
                        : s.badgeWarning
                      }`} style={{ textTransform: 'capitalize' }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>${Number(p.amount || 0).toFixed(2)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.payment_method || 'card'}</td>
                    <td>{(p.currency || 'usd').toUpperCase()}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {new Date(p.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Ratings Tab ─── */}
      {tab === 'ratings' && (
        <div className={s.tableCard}>
          <div className={s.tableHeader}>
            <span className={s.tableTitle}>Ratings Given</span>
            <span className={s.tableCount}>{ratings.length} ratings · avg {avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
          </div>
          {ratings.length === 0 ? (
            <p className={s.empty}>No ratings yet</p>
          ) : (
            <table className={s.miniTable}>
              <thead>
                <tr>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Ride ID</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ color: '#FF9800', fontWeight: 800, fontSize: 16 }}>
                        {'★'.repeat(Math.round(Number(r.rating || 0)))}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', marginLeft: 6, fontSize: 13 }}>
                        {Number(r.rating || 0).toFixed(1)}
                      </span>
                    </td>
                    <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.comment || '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 10 }}>
                      {r.ride_id?.substring(0, 8)}...
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
      )}
    </div>
  );
}
