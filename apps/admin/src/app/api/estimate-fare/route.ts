import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateFare, getTimeBasedSurge, DEFAULT_FARE_SETTINGS } from '@styl/shared';
import type { FareSettings, RideType } from '@styl/shared';

/**
 * Marketing fare estimator — single source of truth is platform_settings.
 * Rider app, marketing estimator, add-stop, and edit-dropoff all resolve
 * rates from the same table via shared calculateFare().
 *
 * Surge cascade: admin override (when source = 'admin') → time-of-day.
 * Demand-based surge is resolved per-request in the rider app via the
 * `get-surge` edge function (needs pickup coords).
 */

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

async function getConfig(): Promise<{ settings: FareSettings; surge: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { settings: {}, surge: getTimeBasedSurge() };

  try {
    const supabase = createClient(url, key);
    const { data } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', [
        'fare_base', 'fare_minimum', 'fare_per_mile', 'fare_per_minute',
        'booking_fee', 'stripe_fee_pct', 'stripe_fee_fixed', 'dispute_protection_fee',
        'surge_enabled', 'surge_max', 'current_surge', 'surge_source',
      ]);

    const raw: Record<string, any> = {};
    (data || []).forEach((r: any) => { raw[r.key] = r.value; });

    const settings: FareSettings = {
      base_fare: Number(raw.fare_base ?? DEFAULT_FARE_SETTINGS.base_fare),
      booking_fee: Number(raw.booking_fee ?? DEFAULT_FARE_SETTINGS.booking_fee),
      fare_per_mile: typeof raw.fare_per_mile === 'object' && raw.fare_per_mile !== null
        ? raw.fare_per_mile
        : DEFAULT_FARE_SETTINGS.fare_per_mile,
      fare_per_minute: Number(raw.fare_per_minute ?? DEFAULT_FARE_SETTINGS.fare_per_minute),
      fare_minimum: Number(raw.fare_minimum ?? DEFAULT_FARE_SETTINGS.fare_minimum),
      stripe_fee_pct: Number(raw.stripe_fee_pct ?? DEFAULT_FARE_SETTINGS.stripe_fee_pct),
      stripe_fee_flat: Number(raw.stripe_fee_fixed ?? DEFAULT_FARE_SETTINGS.stripe_fee_flat),
      dispute_protection_fee: Number(raw.dispute_protection_fee ?? DEFAULT_FARE_SETTINGS.dispute_protection_fee),
      surge_enabled: raw.surge_enabled !== false && raw.surge_enabled !== 'false',
      surge_max: Number(raw.surge_max ?? DEFAULT_FARE_SETTINGS.surge_max),
    };

    // Surge: admin override takes priority (when source = admin), else time-of-day fallback
    let surge = 1.0;
    if (settings.surge_enabled !== false) {
      const source = String(raw.surge_source ?? 'demand').replace(/"/g, '');
      if (source === 'admin' && raw.current_surge != null) {
        const admin = Number(raw.current_surge);
        if (!isNaN(admin) && admin > 1.0) surge = admin;
      }
      if (surge === 1.0) surge = getTimeBasedSurge();
    }

    return { settings, surge };
  } catch {
    return { settings: {}, surge: getTimeBasedSurge() };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pickup = searchParams.get('pickup');
    const dropoff = searchParams.get('dropoff');

    if (!pickup || !dropoff) {
      return NextResponse.json({ error: 'Pickup and dropoff are required.' }, { status: 400 });
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: 'Maps API not configured.' }, { status: 500 });
    }

    const { settings, surge } = await getConfig();

    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', pickup);
    url.searchParams.set('destination', dropoff);
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== 'OK' || !data.routes?.length) {
      return NextResponse.json(
        { error: data.status === 'ZERO_RESULTS' ? 'No route found between those locations.' : 'Could not calculate route.' },
        { status: 400 }
      );
    }

    const leg = data.routes[0].legs[0];
    const distanceKm = leg.distance.value / 1000;
    const durationMin = leg.duration.value / 60;
    const distanceMiles = distanceKm * 0.621371;
    const polyline = data.routes[0].overview_polyline?.points || '';

    const rideTypes = Object.keys(settings.fare_per_mile ?? DEFAULT_FARE_SETTINGS.fare_per_mile) as RideType[];
    const estimates = rideTypes.map((type) => {
      const est = calculateFare(distanceKm, durationMin, type, surge, settings);
      return { type, ...est };
    });

    return NextResponse.json({
      pickup: leg.start_address,
      dropoff: leg.end_address,
      pickup_location: leg.start_location,
      dropoff_location: leg.end_location,
      distance: `${distanceMiles.toFixed(1)} mi`,
      duration: `${Math.round(durationMin)} min`,
      distance_km: distanceKm,
      duration_min: durationMin,
      surge_multiplier: surge,
      polyline,
      estimates,
    });
  } catch (err) {
    console.error('Estimate fare error:', err);
    return NextResponse.json({ error: 'Failed to estimate fare.' }, { status: 500 });
  }
}
