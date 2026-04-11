'use client';

import { useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import StatsCard from '@/components/admin/StatsCard';
import s from '../driverDetail.module.css';

const RIDE_TYPES = ['standard', 'xl', 'luxury', 'electric'];
const RIDE_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard', xl: 'XL', luxury: 'Luxury', electric: 'Eco',
};

interface Props {
  driver: any;
  profile: any;
  vehicles: any[];
  driverId: string;
  onRefresh: () => Promise<void>;
  showToast: (msg: string) => void;
}

export default function OverviewTab({ driver, profile, vehicles, driverId, onRefresh, showToast }: Props) {
  const [approvedTypes, setApprovedTypes] = useState<string[]>(driver.approved_ride_types || []);
  const [saving, setSaving] = useState(false);

  const toggleType = (type: string) => {
    setApprovedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSaveTypes = async () => {
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/drivers/${driverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_ride_types: approvedTypes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Save ride types failed:', err);
        showToast(`Error: ${err.error || 'Failed to save'}`);
        return;
      }
      await onRefresh();
      showToast('Ride types updated');
    } catch (e) {
      console.error('Save ride types error:', e);
      showToast('Error saving ride types');
    }
    setSaving(false);
  };

  return (
    <div>
      {/* Stats */}
      <div className={s.statsGrid}>
        <StatsCard label="Rating" value={Number(driver.rating).toFixed(1)} />
        <StatsCard label="Total Rides" value={driver.total_rides || 0} />
        <StatsCard label="Total Earnings" value={`$${Number(driver.total_earnings || 0).toFixed(2)}`} />
        <StatsCard label="Subscription" value={driver.subscription_status || 'inactive'} />
        <StatsCard
          label="Approved"
          value={driver.is_approved ? 'Yes' : 'Pending'}
          color={driver.is_approved ? 'var(--success)' : 'var(--orange)'}
        />
        <StatsCard
          label="Online"
          value={driver.is_online ? 'Yes' : 'No'}
          color={driver.is_online ? 'var(--success)' : 'var(--text-secondary)'}
        />
      </div>

      {/* Ride Types */}
      <div className={s.card}>
        <h3 className={s.sectionTitle}>Approved Ride Types</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '0 0 12px' }}>
          Select which ride types this driver can accept based on their vehicle.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          {RIDE_TYPES.map((type) => {
            const active = approvedTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`${s.filterBtn} ${active ? s.filterBtnActive : ''}`}
                style={{ padding: '8px 18px', fontSize: 13 }}
              >
                {RIDE_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
        <button type="button" className={`${s.btn} ${s.btnOrange}`} onClick={handleSaveTypes} disabled={saving}>
          Save Ride Types
        </button>
      </div>

      {/* Vehicles */}
      <h3 className={s.sectionTitle}>Vehicles</h3>
      {vehicles.length === 0 ? (
        <p className={s.empty}>No vehicles registered</p>
      ) : (
        vehicles.map((v) => (
          <div key={v.id} className={s.card} style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: 'var(--text)' }}>{v.year} {v.make} {v.model}</strong>
                <span style={{ color: 'var(--text-secondary)', marginLeft: 12 }}>{v.color} · {v.license_plate}</span>
              </div>
              {v.vehicle_type && (
                <span className={`${s.rideStatus} ${s.statusCompleted}`} style={{ background: 'var(--orange)', color: '#fff' }}>
                  {RIDE_TYPE_LABELS[v.vehicle_type] || v.vehicle_type}
                </span>
              )}
            </div>
          </div>
        ))
      )}

      {/* Stripe */}
      <h3 className={s.sectionTitle}>Stripe Account</h3>
      <div className={s.card}>
        <div className={s.infoRow}>
          <span className={s.infoLabel}>Account ID</span>
          <span className={s.infoValue} style={{ fontFamily: 'monospace', fontSize: 11 }}>
            {driver.stripe_account_id || 'Not connected'}
          </span>
        </div>
      </div>

      {/* Account Info */}
      <h3 className={s.sectionTitle}>Account Info</h3>
      <div className={s.card}>
        <div className={s.infoRow}>
          <span className={s.infoLabel}>Joined</span>
          <span className={s.infoValue}>{new Date(profile.created_at).toLocaleDateString()}</span>
        </div>
        {driver.approved_at && (
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Approved on</span>
            <span className={s.infoValue}>{new Date(driver.approved_at).toLocaleDateString()}</span>
          </div>
        )}
        {driver.documents_submitted_at && (
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Docs submitted</span>
            <span className={s.infoValue}>{new Date(driver.documents_submitted_at).toLocaleDateString()}</span>
          </div>
        )}
        <div className={s.infoRow}>
          <span className={s.infoLabel}>Driver ID</span>
          <span className={s.infoValue} style={{ fontSize: 10, fontFamily: 'monospace' }}>{driverId}</span>
        </div>
      </div>
    </div>
  );
}
