'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/adminFetch';
import StatsCard from '@/components/admin/StatsCard';
import { useToast } from '@/components/admin/Toast';
import s from './driverDetail.module.css';

// Tabs
import OverviewTab from './components/OverviewTab';
import DocumentsTab from './components/DocumentsTab';
import RidesTab from './components/RidesTab';
import SubscriptionTab from './components/SubscriptionTab';
import ReportsTab from './components/ReportsTab';
import CommunicationTab from './components/CommunicationTab';
import EnRouteTab from './components/EnRouteTab';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'documents', label: 'Documents' },
  { key: 'rides', label: 'Rides' },
  { key: 'subscription', label: 'Subscription' },
  { key: 'reports', label: 'Reports' },
  { key: 'messages', label: 'Messages' },
  { key: 'enroute', label: 'En Route' },
];

export default function DriverDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [driver, setDriver] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasActiveRide, setHasActiveRide] = useState(false);
  const { toast, confirm: confirmAction } = useToast();

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const res = await adminFetch(`/api/admin/drivers/${id}`);
      const data = await res.json();
      setDriver(data.driver);
      setProfile(data.profile);
      setVehicles(data.vehicles || []);
      setHasActiveRide(data.hasActiveRide || false);
    } catch {}
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (msg: string) => toast('success', msg);

  const setTab = (tab: string) => {
    router.push(`?tab=${tab}`, { scroll: false });
  };

  // ─── Actions ───
  const patchDriver = async (updates: Record<string, any>) => {
    const res = await adminFetch(`/api/admin/drivers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      console.error('PATCH driver failed:', err);
      toast('error', 'Update failed', err.error || 'Something went wrong');
      throw new Error(err.error);
    }
  };

  const handleApprove = async () => {
    const types = driver?.approved_ride_types || [];
    if (!types.length) {
      toast('warning', 'Missing ride types', 'Please assign at least one ride type in Overview before approving.');
      return;
    }
    setSaving(true);
    try {
      await patchDriver({
        is_approved: true,
        approved_ride_types: types,
        approved_at: new Date().toISOString(),
        document_status: 'approved',
      });
      await fetchData();
      showToast('Driver approved');
    } catch { /* error already shown by patchDriver */ }
    setSaving(false);
  };

  const handleReject = async () => {
    const ok = await confirmAction({ title: 'Reject Driver', message: 'Are you sure you want to reject this driver? They will be notified by email.', confirmText: 'Reject', variant: 'danger' });
    if (!ok) return;
    setSaving(true);
    try {
      await patchDriver({
        is_approved: false,
        approved_ride_types: [],
        document_status: 'rejected',
      });
      await fetchData();
      showToast('Driver rejected');
    } catch { /* error already shown by patchDriver */ }
    setSaving(false);
  };

  const handleSuspend = async () => {
    const action = driver.is_suspended ? 'unsuspend' : 'suspend';
    const ok = await confirmAction({ title: `${action.charAt(0).toUpperCase() + action.slice(1)} Driver`, message: `Are you sure you want to ${action} this driver?`, confirmText: action.charAt(0).toUpperCase() + action.slice(1), variant: action === 'suspend' ? 'danger' : 'default' });
    if (!ok) return;
    setSaving(true);
    try {
      await patchDriver({
        is_suspended: action === 'suspend',
        ...(action === 'suspend' ? { is_online: false } : {}),
      });
      await fetchData();
      showToast(`Driver ${action}ed`);
    } catch { /* error already shown by patchDriver */ }
    setSaving(false);
  };

  if (!driver || !profile) {
    return <p style={{ color: 'var(--text-secondary)', padding: 20 }}>Loading driver...</p>;
  }

  const docStatus = driver.document_status;
  const initial = profile.full_name?.charAt(0)?.toUpperCase() || 'D';

  return (
    <div className={s.page}>
      {/* ─── Header ─── */}
      <div className={s.header}>
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className={s.avatar} />
        ) : (
          <div className={s.avatarFallback}>{initial}</div>
        )}
        <div className={s.headerInfo}>
          <h1 className={s.driverName}>{profile.full_name}</h1>
          <p className={s.driverEmail}>{profile.email}</p>
          {profile.phone && <p className={s.driverPhone}>{profile.phone}</p>}
          <div className={s.badges}>
            <span className={`${s.badge} ${driver.is_online ? s.badgeOnline : s.badgeOffline}`}>
              <span className={s.badgeDot} />
              {driver.is_online ? 'Online' : 'Offline'}
            </span>
            <span className={`${s.badge} ${
              driver.is_suspended ? s.badgeSuspended
                : driver.is_approved ? s.badgeApproved
                : docStatus === 'rejected' ? s.badgeRejected
                : s.badgePending
            }`}>
              {driver.is_suspended ? 'Suspended'
                : driver.is_approved ? 'Approved'
                : docStatus === 'rejected' ? 'Rejected'
                : docStatus === 'pending_review' ? 'Pending Review'
                : 'Pending'}
            </span>
            <span className={`${s.badge} ${
              driver.subscription_status === 'active' ? s.badgeSubActive : s.badgeSub
            }`}>
              Sub: {driver.subscription_status || 'inactive'}
            </span>
          </div>
        </div>
        <div className={s.headerActions}>
          {!driver.is_approved && docStatus !== 'approved' ? (
            <>
              <button className={`${s.btn} ${s.btnSuccess}`} onClick={handleApprove} disabled={saving}>
                Approve
              </button>
              <button className={`${s.btn} ${s.btnDanger}`} onClick={handleReject} disabled={saving}>
                Reject
              </button>
            </>
          ) : (
            <button
              className={`${s.btn} ${driver.is_suspended ? s.btnSuccess : s.btnDanger}`}
              onClick={handleSuspend}
              disabled={saving}
            >
              {driver.is_suspended ? 'Unsuspend' : 'Suspend'}
            </button>
          )}
        </div>
      </div>

      {/* ─── Tab bar ─── */}
      <div className={s.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${s.tab} ${activeTab === t.key ? s.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'enroute' && hasActiveRide && <span className={s.tabDot} />}
          </button>
        ))}
      </div>

      {/* ─── Active tab ─── */}
      {activeTab === 'overview' && (
        <OverviewTab
          driver={driver}
          profile={profile}
          vehicles={vehicles}
          driverId={id as string}
          onRefresh={fetchData}
          showToast={showToast}
        />
      )}
      {activeTab === 'documents' && (
        <DocumentsTab
          driver={driver}
          driverId={id as string}
          onRefresh={fetchData}
          showToast={showToast}
        />
      )}
      {activeTab === 'rides' && (
        <RidesTab driverId={id as string} />
      )}
      {activeTab === 'subscription' && (
        <SubscriptionTab driver={driver} driverId={id as string} />
      )}
      {activeTab === 'reports' && (
        <ReportsTab driverId={id as string} />
      )}
      {activeTab === 'messages' && (
        <CommunicationTab driverId={id as string} driverName={profile.full_name} />
      )}
      {activeTab === 'enroute' && (
        <EnRouteTab driverId={id as string} />
      )}
    </div>
  );
}
