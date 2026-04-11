// ============================================================
// Styl — Shared Utilities
// ============================================================

import { PER_MILE_RATES, BASE_FARE, PER_MINUTE_RATE, STRIPE_FEE_PCT, STRIPE_FEE_FLAT } from './constants';
import type { FareEstimate, RideType, Coordinates } from './types';

/**
 * Calculate fare estimate (mirrors the DB function).
 */
export function calculateFare(
  distanceKm: number,
  durationMin: number,
  rideType: RideType = 'standard',
  surgeMultiplier: number = 1.0
): FareEstimate {
  const perMile = PER_MILE_RATES[rideType] ?? PER_MILE_RATES.standard;
  const distanceMiles = distanceKm * 0.621371;

  const subtotal = Math.round(
    (BASE_FARE + distanceMiles * perMile + durationMin * PER_MINUTE_RATE) * surgeMultiplier * 100
  ) / 100;

  // Styl takes zero commission — only Stripe processing fee passes through
  const stripeFee = Math.round((subtotal * STRIPE_FEE_PCT + STRIPE_FEE_FLAT) * 100) / 100;
  const driverEarnings = Math.round((subtotal - stripeFee) * 100) / 100;

  return {
    base_fare: BASE_FARE,
    distance_fare: Math.round(distanceMiles * perMile * 100) / 100,
    time_fare: Math.round(durationMin * PER_MINUTE_RATE * 100) / 100,
    surge_multiplier: surgeMultiplier,
    subtotal,
    platform_fee: stripeFee,
    driver_earnings: driverEarnings,
    total: subtotal,
  };
}

/**
 * Haversine distance between two coordinates (in km).
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
