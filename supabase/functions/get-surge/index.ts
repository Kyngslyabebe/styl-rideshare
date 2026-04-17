// ============================================================
// get-surge — returns the current surge multiplier for a location.
// Counts pending rides vs online drivers within a radius, applies
// the ratio to a banded multiplier. Caches snapshots in surge_zones.
//
// Priority for callers (the rider app cascades these itself):
//   1. This function — demand-based
//   2. platform_settings.current_surge — admin override
//   3. shared getTimeBasedSurge() — time-of-day fallback
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { lat, lng } = await req.json();
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return json({ error: 'lat/lng required' }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Read surge config
    const { data: settingRows } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['surge_enabled', 'surge_max', 'surge_source', 'surge_zone_radius_km', 'surge_cache_seconds']);

    const cfg: Record<string, any> = {};
    (settingRows || []).forEach((r: any) => { cfg[r.key] = r.value; });

    const surgeEnabled = cfg.surge_enabled !== false && cfg.surge_enabled !== 'false';
    const surgeMax = Number(cfg.surge_max ?? 3.0);
    const radiusKm = Number(cfg.surge_zone_radius_km ?? 3.0);
    const cacheSec = Number(cfg.surge_cache_seconds ?? 120);

    if (!surgeEnabled) return json({ multiplier: 1.0, source: 'disabled' });

    // Cache: if a recent zone snapshot exists nearby, reuse it
    const { data: cached } = await supabase
      .from('surge_zones')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .limit(50);

    if (cached) {
      for (const z of cached) {
        const d = haversineKm(lat, lng, Number(z.center_lat), Number(z.center_lng));
        if (d < radiusKm / 2) {
          return json({
            multiplier: Number(z.multiplier),
            source: 'cache',
            pending_rides: z.pending_rides,
            online_drivers: z.online_drivers,
          });
        }
      }
    }

    // Count pending rides within radius
    const { data: pendingRides } = await supabase
      .from('rides')
      .select('pickup_lat, pickup_lng')
      .eq('status', 'searching');

    const pending = (pendingRides || []).filter((r: any) =>
      haversineKm(lat, lng, Number(r.pickup_lat), Number(r.pickup_lng)) <= radiusKm,
    ).length;

    // Count online drivers within radius
    const { data: onlineDrivers } = await supabase
      .from('driver_locations')
      .select('lat, lng')
      .eq('is_online', true);

    const drivers = (onlineDrivers || []).filter((d: any) =>
      haversineKm(lat, lng, Number(d.lat), Number(d.lng)) <= radiusKm,
    ).length;

    const multiplier = computeMultiplier(pending, drivers, surgeMax);

    // Cache snapshot
    await supabase.from('surge_zones').insert({
      center_lat: lat,
      center_lng: lng,
      radius_km: radiusKm,
      pending_rides: pending,
      online_drivers: drivers,
      multiplier,
      expires_at: new Date(Date.now() + cacheSec * 1000).toISOString(),
    });

    return json({ multiplier, source: 'demand', pending_rides: pending, online_drivers: drivers });
  } catch (err) {
    return json({ error: String(err), multiplier: 1.0 }, 500);
  }
});

// Band the demand ratio into sensible multipliers.
// Drivers earn more; riders still see reasonable caps (enforced by surge_max).
function computeMultiplier(pending: number, drivers: number, surgeMax: number): number {
  if (pending === 0) return 1.0;
  if (drivers === 0) return Math.min(2.5, surgeMax); // strong shortage
  const ratio = pending / drivers;
  let m = 1.0;
  if (ratio >= 3) m = 2.5;
  else if (ratio >= 2) m = 2.0;
  else if (ratio >= 1.5) m = 1.7;
  else if (ratio >= 1.0) m = 1.4;
  else if (ratio >= 0.5) m = 1.2;
  return Math.min(m, surgeMax);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
