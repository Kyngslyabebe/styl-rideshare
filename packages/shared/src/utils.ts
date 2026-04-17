// ============================================================
// Styl — Shared Utilities
// ============================================================

import { DEFAULT_FARE_SETTINGS, SURGE_TIME_BASED } from './constants';
import type { FareEstimate, RideType, Coordinates } from './types';

// Fare settings — mirrors platform_settings DB keys. All fields optional; missing
// ones fall back to DEFAULT_FARE_SETTINGS so any caller can pass a partial object.
export interface FareSettings {
  base_fare?: number;
  booking_fee?: number;
  fare_per_mile?: Record<string, number>;
  fare_per_minute?: number;
  fare_minimum?: number;
  stripe_fee_pct?: number;
  stripe_fee_flat?: number;
  dispute_protection_fee?: number;
  surge_enabled?: boolean;
  surge_max?: number;
}

/**
 * Calculate fare estimate — single source of truth across rider app, driver app,
 * marketing estimator, and add-stop / edit-dropoff flows.
 *
 * Formula: (base + miles*rate + mins*rate + bookingFee) * surge, floored by minimum.
 * Passes through Stripe + dispute fees; driver keeps the rest (no platform commission).
 */
export function calculateFare(
  distanceKm: number,
  durationMin: number,
  rideType: RideType = 'standard',
  surgeMultiplier: number = 1.0,
  settings: FareSettings = {},
): FareEstimate {
  const s = { ...DEFAULT_FARE_SETTINGS, ...settings };
  const perMile = s.fare_per_mile[rideType] ?? s.fare_per_mile.standard;
  const distanceMiles = distanceKm * 0.621371;

  const effectiveSurge = s.surge_enabled === false ? 1.0 : Math.min(surgeMultiplier, s.surge_max);

  const raw = (s.base_fare + distanceMiles * perMile + durationMin * s.fare_per_minute + s.booking_fee) * effectiveSurge;
  const calculated = Math.round(raw * 100) / 100;
  const subtotal = Math.max(calculated, s.fare_minimum);

  const stripeFee = Math.round((subtotal * s.stripe_fee_pct + s.stripe_fee_flat) * 100) / 100;
  const driverEarnings = Math.round((subtotal - stripeFee - s.dispute_protection_fee) * 100) / 100;

  return {
    base_fare: s.base_fare,
    booking_fee: s.booking_fee,
    distance_fare: Math.round(distanceMiles * perMile * 100) / 100,
    time_fare: Math.round(durationMin * s.fare_per_minute * 100) / 100,
    surge_multiplier: effectiveSurge,
    subtotal,
    platform_fee: stripeFee,
    driver_earnings: driverEarnings,
    total: subtotal,
  };
}

/**
 * Time-of-day surge fallback — used when live demand data isn't available.
 * Matches the multipliers in marketing/estimate-fare API.
 */
export function getTimeBasedSurge(now: Date = new Date()): number {
  const hour = now.getHours();
  const day = now.getDay();
  if ((day === 5 || day === 6) && (hour >= 22 || hour < 2)) return SURGE_TIME_BASED.weekend_late_night;
  if (day >= 1 && day <= 5) {
    if (hour >= 7 && hour < 9) return SURGE_TIME_BASED.weekday_morning_rush;
    if (hour >= 17 && hour < 19) return SURGE_TIME_BASED.weekday_evening_rush;
  }
  if (hour >= 23 || hour < 5) return SURGE_TIME_BASED.late_night;
  return SURGE_TIME_BASED.normal;
}

/**
 * Fetch actual road-route distance + duration from Google Directions API.
 * Returns null on failure — callers should fall back to haversine.
 * Can be used from any JS runtime (Node, browser, React Native).
 */
export async function getRouteDistance(
  origin: Coordinates,
  destination: Coordinates,
  apiKey: string,
): Promise<{ distanceKm: number; durationMin: number; polyline: string } | null> {
  if (!apiKey) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${apiKey}`;
    const res = await fetch(url);
    const json = await res.json();
    const leg = json.routes?.[0]?.legs?.[0];
    if (!leg) return null;
    return {
      distanceKm: leg.distance.value / 1000,
      durationMin: Math.round(leg.duration.value / 60),
      polyline: json.routes[0].overview_polyline?.points || '',
    };
  } catch {
    return null;
  }
}

/**
 * Haversine distance between two coordinates (in km).
 * Fallback when Directions API is unavailable.
 */
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Estimate duration from straight-line distance (rough fallback).
 * Assumes ~24mph average in urban traffic.
 */
export function estimateDurationFromDistance(distanceKm: number): number {
  return Math.max(Math.round(distanceKm * 2.5), 3);
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Format currency (USD).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format distance for display.
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Format duration for display.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
