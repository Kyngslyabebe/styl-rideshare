'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import StatsCard from '@/components/admin/StatsCard';
import s from '../driverDetail.module.css';

interface Props {
  driverId: string;
}

export default function EnRouteTab({ driverId }: Props) {
  const supabase = createClient();
  const [ride, setRide] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveRide = async () => {
    const { data } = await supabase
      .from('rides')
      .select('*, rider:profiles!rider_id(full_name, phone, avatar_url)')
      .eq('driver_id', driverId)
      .in('status', ['accepted', 'driver_arriving', 'driver_arrived', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1);

    setRide(data?.[0] || null);

    // Get driver location
    const { data: loc } = await supabase
      .from('driver_locations')
      .select('*')
      .eq('driver_id', driverId)
      .single();

    setLocation(loc);
    setLoading(false);
  };

  useEffect(() => {
    fetchActiveRide();
    const interval = setInterval(fetchActiveRide, 10000);
    return () => clearInterval(interval);
  }, [driverId]);

  const handleCancelRide = async () => {
    if (!ride || !confirm('Cancel this ride? The rider will be notified.')) return;
    await supabase.from('rides').update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'system',
      cancellation_reason: 'Cancelled by admin',
    }).eq('id', ride.id);
    fetchActiveRide();
  };

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Checking for active ride...</p>;
  }

  if (!ride) {
    return (
      <div className={s.enrouteEmpty}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-5.4A2 2 0 0 0 13.5 3h-3a2 2 0 0 0-1.8 1.1L6 9.4 3.5 11.1A2 2 0 0 0 2 13v3c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
        <p style={{ fontSize: 14, fontWeight: 600 }}>Driver is not currently on a ride</p>
        <p style={{ fontSize: 12 }}>This tab shows live ride info when the driver is en route.</p>
      </div>
    );
  }

  const statusLabel = ride.status.replace(/_/g, ' ');
  const elapsed = (() => {
    const latest = ride.started_at || ride.accepted_at || ride.created_at;
    const diff = Math.floor((Date.now() - new Date(latest).getTime()) / 60000);
    return diff < 1 ? 'just now' : `${diff} min ago`;
  })();

  return (
    <div>
      {/* Status banner */}
      <div className={s.card} style={{ borderColor: 'var(--orange)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={`${s.rideStatus} ${s.statusInProgress}`} style={{ fontSize: 12, padding: '5px 12px' }}>
            {statusLabel}
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            Since {elapsed}
          </span>
        </div>
        <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={handleCancelRide}>
          Cancel Ride
        </button>
      </div>

      <div className={s.enrouteGrid}>
        {/* Left: Ride info */}
        <div>
          {/* Rider */}
          <div className={s.card}>
            <h4 className={s.sectionTitle}>Rider</h4>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Name</span>
              <span className={s.infoValue}>{ride.rider?.full_name || '—'}</span>
            </div>
            {ride.rider?.phone && (
              <div className={s.infoRow}>
                <span className={s.infoLabel}>Phone</span>
                <span className={s.infoValue}>
                  <a href={`tel:${ride.rider.phone}`} style={{ color: 'var(--orange)' }}>{ride.rider.phone}</a>
                </span>
              </div>
            )}
          </div>

          {/* Route */}
          <div className={s.card}>
            <h4 className={s.sectionTitle}>Route</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: 'rgba(0,200,83,0.1)', borderRadius: 8, padding: '8px 12px' }}>
                <span style={{ fontSize: 9, color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase' }}>Pickup</span>
                <p style={{ fontSize: 12, color: 'var(--text)', margin: '2px 0 0' }}>{ride.pickup_address}</p>
              </div>
              <div style={{ background: 'rgba(255,107,0,0.1)', borderRadius: 8, padding: '8px 12px' }}>
                <span style={{ fontSize: 9, color: 'var(--orange)', fontWeight: 700, textTransform: 'uppercase' }}>Dropoff</span>
                <p style={{ fontSize: 12, color: 'var(--text)', margin: '2px 0 0' }}>{ride.dropoff_address}</p>
              </div>
            </div>
          </div>

          {/* Fare */}
          <div className={s.card}>
            <h4 className={s.sectionTitle}>Fare Estimate</h4>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Estimated fare</span>
              <span className={s.infoValue}>${Number(ride.estimated_fare || 0).toFixed(2)}</span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Distance</span>
              <span className={s.infoValue}>{Number(ride.estimated_distance_km || 0).toFixed(1)} km</span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Duration</span>
              <span className={s.infoValue}>{ride.estimated_duration_min || 0} min</span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Ride type</span>
              <span className={s.infoValue} style={{ textTransform: 'capitalize' }}>{ride.ride_type}</span>
            </div>
            {ride.surge_multiplier > 1 && (
              <div className={s.infoRow}>
                <span className={s.infoLabel}>Surge</span>
                <span className={s.infoValue} style={{ color: 'var(--orange)' }}>{ride.surge_multiplier}x</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Map / Location */}
        <div>
          <div className={s.card}>
            <h4 className={s.sectionTitle}>Driver Location</h4>
            {location ? (
              <>
                <div className={s.infoRow}>
                  <span className={s.infoLabel}>Latitude</span>
                  <span className={s.infoValue}>{Number(location.lat).toFixed(6)}</span>
                </div>
                <div className={s.infoRow}>
                  <span className={s.infoLabel}>Longitude</span>
                  <span className={s.infoValue}>{Number(location.lng).toFixed(6)}</span>
                </div>
                <div className={s.infoRow}>
                  <span className={s.infoLabel}>Speed</span>
                  <span className={s.infoValue}>{Number(location.speed || 0).toFixed(0)} km/h</span>
                </div>
                <div className={s.infoRow}>
                  <span className={s.infoLabel}>Last updated</span>
                  <span className={s.infoValue}>
                    {new Date(location.updated_at).toLocaleTimeString()}
                  </span>
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Location not available</p>
            )}
          </div>

          {/* Ride timeline */}
          <div className={s.card}>
            <h4 className={s.sectionTitle}>Progress</h4>
            <div className={s.timeline}>
              {[
                { label: 'Requested', ts: ride.requested_at || ride.created_at },
                { label: 'Accepted', ts: ride.accepted_at },
                { label: 'Arriving', ts: ride.driver_arrived_at ? ride.driver_arrived_at : null },
                { label: 'Trip Started', ts: ride.started_at },
              ].map((step, i, arr) => {
                const isActive = step.ts && !arr[i + 1]?.ts;
                const isDone = !!step.ts;
                const isLast = i === arr.length - 1;
                return (
                  <div key={step.label} className={s.timelineItem}>
                    <div className={s.timelineDotCol}>
                      <div
                        className={s.timelineDot}
                        style={{
                          background: isDone ? (isActive ? 'var(--orange)' : 'var(--success)') : 'var(--card-border)',
                          boxShadow: isActive ? '0 0 0 4px rgba(255,107,0,0.2)' : 'none',
                        }}
                      />
                      {!isLast && (
                        <div className={s.timelineLine} style={{ background: isDone ? 'var(--success)' : 'var(--card-border)' }} />
                      )}
                    </div>
                    <div className={s.timelineContent}>
                      <div className={s.timelineLabel} style={isActive ? { color: 'var(--orange)' } : undefined}>
                        {step.label} {isActive && '← current'}
                      </div>
                      {step.ts && (
                        <div className={s.timelineTime}>{new Date(step.ts).toLocaleTimeString()}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className={s.card}>
            <h4 className={s.sectionTitle}>Quick Actions</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ride.rider?.phone && (
                <a href={`tel:${ride.rider.phone}`} className={`${s.btn} ${s.btnGhost}`} style={{ textDecoration: 'none' }}>
                  Call Rider
                </a>
              )}
              <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={handleCancelRide}>
                Cancel Ride
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
