// ============================================================
// Styl — Shared Constants
// ============================================================

export const APP_NAME = 'Styl';

// No platform commission — drivers keep 100% of fares
// Only deductions: Stripe processing fee + dispute protection
export const STRIPE_FEE_PCT = 0.029;
export const STRIPE_FEE_FLAT = 0.30;
export const DISPUTE_PROTECTION_FEE = 0.50;

// Fare rates (per mile) — competitive pricing, drivers keep 100%
export const BASE_FARE = 2.00;
export const PER_MINUTE_RATE = 0.18;
export const PER_MILE_RATES: Record<string, number> = {
  standard: 1.20,
  xl: 1.80,
  luxury: 2.80,
  electric: 1.45,
};

// Ride matching
export const DEFAULT_SEARCH_RADIUS_KM = 10;
export const MAX_DRIVER_SEARCH_ATTEMPTS = 5;
export const DRIVER_RESPONSE_TIMEOUT_SEC = 20;
export const RIDE_SEARCH_TIMEOUT_MIN = 5;

// Location broadcasting
export const LOCATION_UPDATE_INTERVAL_MS = 3000;
export const LOCATION_STALE_THRESHOLD_MIN = 2;

// Ride stops
export const MAX_STOPS_PER_RIDE = 2;
export const STOP_WAIT_THRESHOLD_SEC = 300; // 5 minutes before full-fare cancel

// Tips
export const TIP_PRESETS = [5, 10, 15, 20] as const; // percentages

// Anti-abuse thresholds
export const ARRIVAL_RADIUS_METERS = 200; // must be within 200m to swipe "arrived"
export const PICKUP_RADIUS_METERS = 200;  // must be within 200m to swipe "picked up"
export const MIN_RIDE_DURATION_SEC = 120;  // < 2 min = suspicious
export const MIN_RIDE_DISTANCE_KM = 0.5;  // < 0.5 km = suspicious
export const MAX_IGNORED_REQUESTS = 4;     // 4 ignores → auto offline

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  weekly: { label: 'Weekly', price: 100.00 },
  monthly: { label: 'Monthly', price: 360.00 },
} as const;

// Theme colors — Styl glossy palette
export const COLORS = {
  // Primary
  orange: '#FF6B00',
  orangeLight: '#FF8C33',
  orangeDark: '#CC5500',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  offWhite: '#F5F5F5',
  offBlack: '#1A1A1A',

  // Glass / glossy
  glassDark: 'rgba(0, 0, 0, 0.6)',
  glassLight: 'rgba(255, 255, 255, 0.6)',
  glassOrange: 'rgba(255, 107, 0, 0.15)',

  // Semantic
  success: '#00C853',
  error: '#FF1744',
  warning: '#FFD600',
  info: '#2979FF',

  // Text
  textDark: '#FFFFFF',
  textLight: '#1A1A1A',
  textSecondaryDark: '#B0B0B0',
  textSecondaryLight: '#666666',
} as const;

// Ride status labels (for UI display)
export const RIDE_STATUS_LABELS: Record<string, string> = {
  searching: 'Finding your driver...',
  accepted: 'Driver accepted',
  driver_arriving: 'Driver is on the way',
  driver_arrived: 'Driver has arrived',
  in_progress: 'Ride in progress',
  completed: 'Ride completed',
  cancelled: 'Ride cancelled',
  no_drivers_found: 'No drivers available',
};
