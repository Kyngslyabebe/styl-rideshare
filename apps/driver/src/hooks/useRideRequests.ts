import { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';

interface PendingRide {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_fare: number;
  estimated_distance_km: number;
  rider_id: string;
  status: string;
}

export function useRideRequests(driverId: string | undefined) {
  const [pendingRide, setPendingRide] = useState<PendingRide | null>(null);
  const subscribed = useRef(false);

  useEffect(() => {
    if (!driverId || subscribed.current) return;
    subscribed.current = true;

    // Check for any existing accepted ride assigned to this driver on mount
    supabase
      .from('rides')
      .select('*')
      .eq('driver_id', driverId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const ride = data[0];
          setPendingRide({
            id: ride.id,
            pickup_address: ride.pickup_address,
            dropoff_address: ride.dropoff_address,
            estimated_fare: ride.estimated_fare || 0,
            estimated_distance_km: ride.estimated_distance_km || 0,
            rider_id: ride.rider_id,
            status: ride.status,
          });
        }
      });

    // Listen for realtime updates — match-driver assigns driver_id and sets status='accepted'
    const channel = supabase
      .channel(`ride-requests-${driverId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rides',
        filter: `driver_id=eq.${driverId}`,
      }, (payload) => {
        const ride = payload.new as any;
        if (ride.status === 'accepted') {
          setPendingRide({
            id: ride.id,
            pickup_address: ride.pickup_address,
            dropoff_address: ride.dropoff_address,
            estimated_fare: ride.estimated_fare || 0,
            estimated_distance_km: ride.estimated_distance_km || 0,
            rider_id: ride.rider_id,
            status: ride.status,
          });
        } else if (ride.status === 'cancelled' || ride.status === 'searching') {
          // Ride was cancelled or re-assigned — clear pending
          setPendingRide((prev) => prev?.id === ride.id ? null : prev);
        }
      })
      .subscribe();

    return () => {
      subscribed.current = false;
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  const acceptRide = async (rideId: string) => {
    await supabase.from('rides').update({
      status: 'driver_arriving',
      accepted_at: new Date().toISOString(),
    }).eq('id', rideId);
    setPendingRide(null);
  };

  const rejectRide = async (rideId: string) => {
    // Clear driver assignment, reset to searching so match-driver can retry
    await supabase.from('rides').update({
      driver_id: null,
      status: 'searching',
    }).eq('id', rideId);
    setPendingRide(null);

    // Re-trigger match-driver to find another driver
    supabase.functions.invoke('match-driver', {
      body: { ride_id: rideId },
    }).catch((err: any) => console.warn('re-match error:', err));
  };

  return { pendingRide, acceptRide, rejectRide };
}
