import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DEFAULT_SEARCH_RADIUS_KM = 24; // ~15 miles fallback
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const MAX_IGNORED_REQUESTS = 4;

serve(async (req) => {
  try {
    const { ride_id } = await req.json();
    if (!ride_id) {
      return new Response(JSON.stringify({ error: 'ride_id required' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth: verify caller is the rider who booked this ride
    const authHeader = req.headers.get('Authorization');
    let callerId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) callerId = user.id;
    }

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', ride_id)
      .single();

    if (rideError || !ride) {
      return new Response(JSON.stringify({ error: 'Ride not found' }), { status: 404 });
    }

    if (callerId && callerId !== ride.rider_id) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    if (ride.status !== 'searching') {
      return new Response(JSON.stringify({ error: 'Ride is not in searching status' }), { status: 400 });
    }

    // Get admin-configured search radius
    let searchRadiusKm = DEFAULT_SEARCH_RADIUS_KM;
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('search_radius_km')
      .limit(1)
      .single();
    if (settings?.search_radius_km) {
      searchRadiusKm = Number(settings.search_radius_km);
    }

    // Get rider's favorite drivers
    const { data: favorites } = await supabase
      .from('favorite_drivers')
      .select('driver_id')
      .eq('rider_id', ride.rider_id);
    const favoriteIds = new Set((favorites || []).map((f: any) => f.driver_id));

    const pickupLat = Number(ride.pickup_lat);
    const pickupLng = Number(ride.pickup_lng);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const { data: nearbyDrivers } = await supabase
        .from('driver_locations')
        .select('driver_id, lat, lng')
        .eq('is_online', true);

      if (!nearbyDrivers || nearbyDrivers.length === 0) {
        if (attempt < MAX_RETRIES - 1) { await delay(RETRY_DELAY_MS); continue; }
        break;
      }

      // Filter by search radius
      const driversInRange = nearbyDrivers.filter((d: any) => {
        return haversineKm(pickupLat, pickupLng, Number(d.lat), Number(d.lng)) <= searchRadiusKm;
      });

      if (driversInRange.length === 0) {
        if (attempt < MAX_RETRIES - 1) { await delay(RETRY_DELAY_MS); continue; }
        break;
      }

      const driverIds = driversInRange.map((d: any) => d.driver_id);

      // Must have matching vehicle type
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('driver_id')
        .in('driver_id', driverIds)
        .eq('is_active', true)
        .eq('vehicle_type', ride.ride_type || 'standard');

      const eligibleIds = new Set((vehicles || []).map((v: any) => v.driver_id));

      // Must be approved
      const { data: approved } = await supabase
        .from('drivers')
        .select('id')
        .in('id', Array.from(eligibleIds))
        .eq('is_approved', true)
        .eq('is_online', true);

      const approvedIds = (approved || []).map((d: any) => d.id);
      if (approvedIds.length === 0) {
        if (attempt < MAX_RETRIES - 1) { await delay(RETRY_DELAY_MS); continue; }
        break;
      }

      // Filter out busy drivers
      const { data: busyRides } = await supabase
        .from('rides')
        .select('driver_id, status, id')
        .in('driver_id', approvedIds)
        .in('status', ['accepted', 'driver_arriving', 'driver_arrived', 'in_progress']);

      const busySet = new Set((busyRides || []).map((r: any) => r.driver_id));
      let available = approvedIds.filter((id: string) => !busySet.has(id));

      // En-route matching: if no free drivers, consider drivers on their final leg
      if (available.length === 0) {
        const inProgressRides = (busyRides || []).filter((r: any) => r.status === 'in_progress');
        for (const activeRide of inProgressRides) {
          // Check if this driver already has a queued ride (avoid double-queuing)
          const { data: queuedRides } = await supabase
            .from('rides')
            .select('id')
            .eq('driver_id', activeRide.driver_id)
            .eq('status', 'accepted')
            .neq('id', activeRide.id)
            .limit(1);
          if (queuedRides && queuedRides.length > 0) continue;

          // Check ride_stops — only eligible if all stops are completed (driver is on final leg)
          const { data: pendingStops } = await supabase
            .from('ride_stops')
            .select('id')
            .eq('ride_id', activeRide.id)
            .eq('status', 'accepted')
            .is('completed_at', null)
            .limit(1);
          if (pendingStops && pendingStops.length > 0) continue;

          // Driver is on final leg — eligible for en-route matching
          available.push(activeRide.driver_id);
        }
      }

      if (available.length === 0) {
        if (attempt < MAX_RETRIES - 1) { await delay(RETRY_DELAY_MS); continue; }
        break;
      }

      // Sort: favorite drivers first, then by distance
      const availableWithDistance = driversInRange
        .filter((d: any) => available.includes(d.driver_id))
        .map((d: any) => ({
          ...d,
          distance: haversineKm(pickupLat, pickupLng, Number(d.lat), Number(d.lng)),
          isFavorite: favoriteIds.has(d.driver_id),
        }))
        .sort((a: any, b: any) => {
          // Favorites first
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          // Then by distance
          return a.distance - b.distance;
        });

      const closest = availableWithDistance[0];
      if (!closest) {
        if (attempt < MAX_RETRIES - 1) { await delay(RETRY_DELAY_MS); continue; }
        break;
      }

      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('driver_id', closest.driver_id)
        .eq('is_active', true)
        .eq('vehicle_type', ride.ride_type || 'standard')
        .limit(1)
        .single();

      const { error: updateError } = await supabase
        .from('rides')
        .update({
          driver_id: closest.driver_id,
          vehicle_id: vehicle?.id || null,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', ride_id);

      if (updateError) {
        return new Response(JSON.stringify({ error: 'Failed to assign driver' }), { status: 500 });
      }

      // Reset driver's consecutive_ignores on successful match
      await supabase.from('drivers').update({ consecutive_ignores: 0 }).eq('id', closest.driver_id);

      // Notify driver
      await notifyUser(supabase, closest.driver_id, 'New Ride Request',
        `Pickup: ${ride.pickup_address?.split(',')[0]}`,
        { type: 'ride_request', rideId: ride_id });

      // Notify rider
      await notifyUser(supabase, ride.rider_id, 'Driver Found!',
        closest.isFavorite ? 'Your favorite driver is on the way!' : 'Your driver is on the way',
        { type: 'driver_accepted', rideId: ride_id });

      return new Response(JSON.stringify({
        success: true,
        driver_id: closest.driver_id,
        is_favorite: closest.isFavorite,
      }), { status: 200 });
    }

    // No driver found
    await supabase.from('rides').update({ status: 'no_drivers_found' }).eq('id', ride_id);
    return new Response(JSON.stringify({ error: 'No drivers available' }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function notifyUser(supabase: any, userId: string, title: string, body: string, data: Record<string, string>) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', userId)
    .single();
  if (!profile?.expo_push_token) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: profile.expo_push_token, title, body, data, sound: 'default' }),
  }).catch(() => {});
}
