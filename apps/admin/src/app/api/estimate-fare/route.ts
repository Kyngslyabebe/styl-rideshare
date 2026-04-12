import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Fare estimation — uses the EXACT same logic as @styl/shared calculateFare()
 * to ensure marketing estimates match in-app ride requests.
 *
 * Rates can be overridden from Admin → Marketing → Fare Estimator section.
 * Falls back to hardcoded defaults matching @styl/shared/constants.
 */

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Defaults — mirror @styl/shared/constants
const DEFAULT_BASE_FARE = 2.00;
const DEFAULT_PER_MINUTE_RATE = 0.18;
const DEFAULT_PER_MILE_RATES: Record<string, number> = {
  standard: 1.20,
  xl: 1.80,
  luxury: 2.80,
  electric: 1.45,
};
const DEFAULT_BOOKING_FEE = 1.25;
const DEFAULT_MINIMUM_FARE = 7.00;
const DEFAULT_STRIPE_FEE_PCT = 0.029;
const DEFAULT_STRIPE_FEE_FLAT = 0.30;

// Fetch fare config from Supabase CMS (cached per request)
async function getFareConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const supabase = createClient(url, key);
    const { data } = await supabase
      .from('marketing_content')
      .select('content')
      .eq('section', 'fare_estimator')
      .single();
    return data?.content || null;
  } catch {
    return null;
  }
}

// Surge pricing: simulated based on time of day + day of week
function getSurgeMultiplier(): number {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  if ((day === 5 || day === 6) && (hour >= 22 || hour < 2)) return 1.8;
  if (day >= 1 && day <= 5) {
    if (hour >= 7 && hour < 9) return 1.3;
    if (hour >= 17 && hour < 19) return 1.5;
  }
  if (hour >= 23 || hour < 5) return 1.2;
  return 1.0;
}

// Mirrors rider app RideTypeSelectScreen fare formula exactly
function calculateFare(
  distanceKm: number,
  durationMin: number,
  rideType: string,
  surgeMultiplier: number,
  baseFare: number,
  perMinuteRate: number,
  perMileRates: Record<string, number>,
  bookingFee: number,
  minimumFare: number,
  stripeFPct: number,
  stripeFFlat: number,
) {
  const perMile = perMileRates[rideType] ?? perMileRates.standard;
  const distanceMiles = distanceKm * 0.621371;

  const calculated = Math.round(
    (baseFare + distanceMiles * perMile + durationMin * perMinuteRate + bookingFee) * surgeMultiplier * 100
  ) / 100;

  const subtotal = Math.max(calculated, minimumFare);
  const stripeFee = Math.round((subtotal * stripeFPct + stripeFFlat) * 100) / 100;

  return {
    type: rideType,
    base_fare: baseFare,
    booking_fee: bookingFee,
    distance_fare: Math.round(distanceMiles * perMile * 100) / 100,
    time_fare: Math.round(durationMin * perMinuteRate * 100) / 100,
    surge_multiplier: surgeMultiplier,
    subtotal,
    platform_fee: stripeFee,
    total: subtotal,
  };
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

    // Load CMS overrides
    const config = await getFareConfig();
    const baseFare = config?.base_fare ? parseFloat(config.base_fare) : DEFAULT_BASE_FARE;
    const perMinuteRate = config?.per_minute_rate ? parseFloat(config.per_minute_rate) : DEFAULT_PER_MINUTE_RATE;
    const perMileRates = config?.per_mile_rates && typeof config.per_mile_rates === 'object'
      ? config.per_mile_rates
      : DEFAULT_PER_MILE_RATES;
    const bookingFee = config?.booking_fee ? parseFloat(config.booking_fee) : DEFAULT_BOOKING_FEE;
    const minimumFare = config?.minimum_fare ? parseFloat(config.minimum_fare) : DEFAULT_MINIMUM_FARE;
    const stripeFPct = config?.stripe_fee_pct ? parseFloat(config.stripe_fee_pct) : DEFAULT_STRIPE_FEE_PCT;
    const stripeFFlat = config?.stripe_fee_flat ? parseFloat(config.stripe_fee_flat) : DEFAULT_STRIPE_FEE_FLAT;

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
    const surgeMultiplier = getSurgeMultiplier();

    const polyline = data.routes[0].overview_polyline?.points || '';

    const estimates = Object.keys(perMileRates).map((type) =>
      calculateFare(distanceKm, durationMin, type, surgeMultiplier, baseFare, perMinuteRate, perMileRates, bookingFee, minimumFare, stripeFPct, stripeFFlat)
    );

    return NextResponse.json({
      pickup: leg.start_address,
      dropoff: leg.end_address,
      pickup_location: leg.start_location,
      dropoff_location: leg.end_location,
      distance: `${distanceMiles.toFixed(1)} mi`,
      duration: `${Math.round(durationMin)} min`,
      distance_km: distanceKm,
      duration_min: durationMin,
      surge_multiplier: surgeMultiplier,
      polyline,
      estimates,
    });
  } catch (err) {
    console.error('Estimate fare error:', err);
    return NextResponse.json({ error: 'Failed to estimate fare.' }, { status: 500 });
  }
}
