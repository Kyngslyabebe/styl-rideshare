'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import StatsCard from '@/components/admin/StatsCard';
import styles from '../../dashboard.module.css';

export default function RideDetailPage() {
  const { id } = useParams();
  const [ride, setRide] = useState<any>(null);
  const [stops, setStops] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    Promise.all([
      supabase.from('rides').select('*').eq('id', id).single(),
      supabase.from('ride_stops').select('*').eq('ride_id', id).order('stop_order'),
    ]).then(([r, s]) => {
      setRide(r.data);
      setStops(s.data || []);
    });
  }, [id]);

  if (!ride) return <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>;

  const statusColor = ride.status === 'completed' ? 'var(--success)' : ride.status === 'cancelled' ? 'var(--error)' : 'var(--orange)';

  return (
    <div>
      <h1 className={styles.title}>Ride Detail</h1>
      <span style={{ color: statusColor, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
        {ride.status.replace(/_/g, ' ')}
      </span>

      <div className={styles.grid} style={{ marginTop: 20 }}>
        <StatsCard label="Est. Fare" value={`$${Number(ride.estimated_fare || 0).toFixed(2)}`} />
        <StatsCard label="Final Fare" value={`$${Number(ride.final_fare || 0).toFixed(2)}`} />
        <StatsCard label="Platform Fee" value={`$${Number(ride.platform_fee || 0).toFixed(2)}`} />
        <StatsCard label="Driver Earnings" value={`$${Number(ride.driver_earnings || 0).toFixed(2)}`} />
        <StatsCard label="Distance" value={`${Number(ride.estimated_distance_km || 0).toFixed(1)} km`} />
        <StatsCard label="Duration" value={`${ride.estimated_duration_min || 0} min`} />
        <StatsCard label="Ride Type" value={ride.ride_type} />
        <StatsCard label="Payment" value={ride.payment_status} />
      </div>

      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Route</h2>
        <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 10, padding: 16 }}>
          <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: 13 }}>PICKUP</p>
          <p style={{ color: 'var(--text)', marginBottom: 12 }}>{ride.pickup_address}</p>

          {stops.map((s) => (
            <div key={s.id} style={{ marginBottom: 12 }}>
              <p style={{ color: 'var(--warning)', fontWeight: 600, fontSize: 13 }}>STOP {s.stop_order}</p>
              <p style={{ color: 'var(--text)' }}>{s.address}</p>
            </div>
          ))}

          <p style={{ color: 'var(--orange)', fontWeight: 600, fontSize: 13 }}>DROPOFF</p>
          <p style={{ color: 'var(--text)' }}>{ride.dropoff_address}</p>
        </div>
      </div>

      {ride.cancelled_by && (
        <div style={{ marginTop: 20, background: 'rgba(255,23,68,0.08)', border: '1px solid var(--error)', borderRadius: 10, padding: 14 }}>
          <p style={{ color: 'var(--error)', fontWeight: 600, fontSize: 13 }}>CANCELLED BY {ride.cancelled_by.toUpperCase()}</p>
          <p style={{ color: 'var(--text)', fontSize: 14 }}>{ride.cancellation_reason || 'No reason provided'}</p>
        </div>
      )}
    </div>
  );
}
