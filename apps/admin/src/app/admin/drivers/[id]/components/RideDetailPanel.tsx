'use client';

import s from '../driverDetail.module.css';

interface Props {
  ride: any;
}

const TIMELINE_STEPS = [
  { key: 'requested_at', label: 'Requested' },
  { key: 'accepted_at', label: 'Accepted' },
  { key: 'driver_arrived_at', label: 'Driver Arrived' },
  { key: 'started_at', label: 'Trip Started' },
  { key: 'completed_at', label: 'Completed' },
];

function formatTime(ts: string | null) {
  if (!ts) return null;
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function elapsed(from: string | null, to: string | null) {
  if (!from || !to) return null;
  const diff = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

export default function RideDetailPanel({ ride }: Props) {
  const isCancelled = ride.status === 'cancelled';

  // Build timeline entries
  const timelineEntries = TIMELINE_STEPS.map((step, i) => {
    const ts = ride[step.key];
    const prevTs = i > 0 ? ride[TIMELINE_STEPS[i - 1].key] : null;
    const isCompleted = !!ts;
    const isCancelledStep = step.key === 'completed_at' && isCancelled;
    return {
      ...step,
      ts,
      time: formatTime(ts),
      elapsed: elapsed(prevTs, ts),
      completed: isCompleted,
      cancelled: isCancelledStep,
    };
  });

  // Add cancelled step if applicable
  if (isCancelled && ride.cancelled_at) {
    timelineEntries.push({
      key: 'cancelled_at',
      label: `Cancelled by ${ride.cancelled_by || 'unknown'}`,
      ts: ride.cancelled_at,
      time: formatTime(ride.cancelled_at),
      elapsed: null,
      completed: true,
      cancelled: true,
    });
  }

  return (
    <div className={s.rideDetail}>
      {/* Left: Info */}
      <div className={s.rideDetailInfo}>
        {/* Fare Breakdown */}
        <div>
          <h4 className={s.sectionTitle}>Fare Breakdown</h4>
          <div className={s.fareRow}>
            <span className={s.fareLabel}>Base fare</span>
            <span className={s.fareValue}>${Number(ride.base_fare || 0).toFixed(2)}</span>
          </div>
          <div className={s.fareRow}>
            <span className={s.fareLabel}>Distance fare</span>
            <span className={s.fareValue}>${Number(ride.distance_fare || 0).toFixed(2)}</span>
          </div>
          {ride.surge_multiplier > 1 && (
            <div className={s.fareRow}>
              <span className={s.fareLabel}>Surge ({ride.surge_multiplier}x)</span>
              <span className={s.fareValue} style={{ color: 'var(--orange)' }}>Applied</span>
            </div>
          )}
          <div className={s.fareRow}>
            <span className={s.fareLabel}>Platform fee</span>
            <span className={s.fareValue} style={{ color: 'var(--error)' }}>
              -${Number(ride.platform_fee || 0).toFixed(2)}
            </span>
          </div>
          <div className={s.fareTotal}>
            <span className={s.fareLabel}>Total fare</span>
            <span className={s.fareValue}>${Number(ride.final_fare || ride.estimated_fare || 0).toFixed(2)}</span>
          </div>
          <div className={s.fareRow}>
            <span className={s.fareLabel}>Driver earnings</span>
            <span className={s.fareValue} style={{ color: 'var(--success)' }}>
              ${Number(ride.driver_earnings || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Route info */}
        <div>
          <h4 className={s.sectionTitle}>Route</h4>
          <div className={s.fareRow}>
            <span className={s.fareLabel}>Distance</span>
            <span className={s.fareValue}>{Number(ride.actual_distance_km || ride.estimated_distance_km || 0).toFixed(1)} km</span>
          </div>
          <div className={s.fareRow}>
            <span className={s.fareLabel}>Duration</span>
            <span className={s.fareValue}>{ride.actual_duration_min || ride.estimated_duration_min || 0} min</span>
          </div>
          <div className={s.fareRow}>
            <span className={s.fareLabel}>Payment</span>
            <span className={s.fareValue} style={{ textTransform: 'capitalize' }}>{ride.payment_method} · {ride.payment_status}</span>
          </div>
        </div>

        {/* Rider info */}
        {ride.rider && (
          <div>
            <h4 className={s.sectionTitle}>Rider</h4>
            <div className={s.fareRow}>
              <span className={s.fareLabel}>Name</span>
              <span className={s.fareValue}>{ride.rider.full_name}</span>
            </div>
            {ride.rider.phone && (
              <div className={s.fareRow}>
                <span className={s.fareLabel}>Phone</span>
                <span className={s.fareValue}>{ride.rider.phone}</span>
              </div>
            )}
          </div>
        )}

        {ride.cancellation_reason && (
          <div>
            <h4 className={s.sectionTitle}>Cancellation</h4>
            <p style={{ color: 'var(--error)', fontSize: 12, margin: 0 }}>{ride.cancellation_reason}</p>
          </div>
        )}
      </div>

      {/* Right: Map + Timeline */}
      <div>
        {/* Static map showing pickup & dropoff */}
        <div className={s.rideDetailMap}>
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 16,
          }}>
            <div style={{
              background: 'rgba(0,200,83,0.15)',
              borderRadius: 8,
              padding: '8px 14px',
              width: '100%',
            }}>
              <span style={{ fontSize: 9, color: '#00C853', fontWeight: 700, textTransform: 'uppercase' }}>Pickup</span>
              <p style={{ fontSize: 11, color: 'var(--text)', margin: '2px 0 0', lineHeight: 1.3 }}>
                {ride.pickup_address}
              </p>
              <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
                {Number(ride.pickup_lat).toFixed(5)}, {Number(ride.pickup_lng).toFixed(5)}
              </span>
            </div>
            <div style={{ width: 2, height: 20, background: 'var(--card-border)' }} />
            <div style={{
              background: 'rgba(255,107,0,0.15)',
              borderRadius: 8,
              padding: '8px 14px',
              width: '100%',
            }}>
              <span style={{ fontSize: 9, color: 'var(--orange)', fontWeight: 700, textTransform: 'uppercase' }}>Dropoff</span>
              <p style={{ fontSize: 11, color: 'var(--text)', margin: '2px 0 0', lineHeight: 1.3 }}>
                {ride.dropoff_address}
              </p>
              <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
                {Number(ride.dropoff_lat).toFixed(5)}, {Number(ride.dropoff_lng).toFixed(5)}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ marginTop: 16 }}>
          <h4 className={s.sectionTitle}>Timeline</h4>
          <div className={s.timeline}>
            {timelineEntries.map((entry, i) => {
              const dotColor = entry.cancelled ? 'var(--error)'
                : entry.completed ? 'var(--success)'
                : 'var(--card-border)';
              const lineColor = entry.completed ? 'var(--success)' : 'var(--card-border)';
              const isLast = i === timelineEntries.length - 1;

              return (
                <div key={entry.key} className={s.timelineItem}>
                  <div className={s.timelineDotCol}>
                    <div className={s.timelineDot} style={{ background: dotColor }} />
                    {!isLast && <div className={s.timelineLine} style={{ background: lineColor }} />}
                  </div>
                  <div className={s.timelineContent}>
                    <div className={s.timelineLabel} style={entry.cancelled ? { color: 'var(--error)' } : undefined}>
                      {entry.label}
                    </div>
                    {entry.time && <div className={s.timelineTime}>{entry.time}</div>}
                    {entry.elapsed && <div className={s.timelineElapsed}>+{entry.elapsed}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
