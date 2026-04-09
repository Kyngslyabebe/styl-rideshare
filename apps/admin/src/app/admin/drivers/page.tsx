'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DataTable from '@/components/admin/DataTable';
import styles from '../dashboard.module.css';

export default function DriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => { fetchDrivers(); }, []);

  const fetchDrivers = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('drivers')
      .select('*, profiles!inner(full_name, email, phone)')
      .order('created_at', { ascending: false });
    setDrivers(data || []);
  };

  const handleApprove = async (driverId: string) => {
    const supabase = createClient();
    await supabase.from('drivers').update({ is_approved: true }).eq('id', driverId);
    fetchDrivers();
  };

  const columns = [
    { key: 'full_name', label: 'Name', render: (_: any, row: any) => row.profiles?.full_name || '—' },
    { key: 'email', label: 'Email', render: (_: any, row: any) => row.profiles?.email || '—' },
    { key: 'rating', label: 'Rating', render: (v: any) => Number(v || 5).toFixed(1) },
    { key: 'total_rides', label: 'Rides' },
    { key: 'is_online', label: 'Status', render: (v: boolean) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: v ? '#00C853' : '#999' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: v ? '#00C853' : '#bbb', display: 'inline-block' }} />
        {v ? 'Online' : 'Offline'}
      </span>
    )},
    { key: 'subscription_status', label: 'Sub', render: (v: string) => {
      const colors: Record<string, string> = { active: '#00C853', inactive: '#999', past_due: '#FFD600' };
      return <span style={{ color: colors[v] || '#999', fontWeight: 600 }}>{v}</span>;
    }},
    { key: 'is_approved', label: 'Approved', render: (v: boolean, row: any) => v
      ? <span style={{ color: '#00C853', fontWeight: 600 }}>Yes</span>
      : <button
          onClick={(e) => { e.stopPropagation(); handleApprove(row.id); }}
          style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
        >Approve</button>
    },
  ];

  return (
    <div>
      <h1 className={styles.title}>Drivers</h1>
      <DataTable
        columns={columns}
        data={drivers}
        onRowClick={(row) => router.push(`/admin/drivers/${row.id}`)}
      />
    </div>
  );
}
