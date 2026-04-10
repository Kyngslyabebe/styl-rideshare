// ============================================================
// Styl — Shared Types
// ============================================================

// --- Enums / Unions ---

export type RideStatus =
  | 'searching'
  | 'accepted'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_drivers_found';

export type UserRole = 'rider' | 'driver' | 'admin';
export type RideType = 'standard' | 'xl' | 'luxury' | 'electric';
export type PaymentMethod = 'card';
export type PaymentStatus = 'pending' | 'captured' | 'failed' | 'refunded';
export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled';
export type SubscriptionPlan = 'weekly' | 'monthly';
export type BackgroundCheckStatus = 'pending' | 'passed' | 'failed' | 'not_required';
export type PayoutStatus = 'pending' | 'paid' | 'instant_paid';
export type CancelledBy = 'rider' | 'driver' | 'system';

export type RideFlagType =
  | 'early_arrival_swipe'
  | 'fake_pickup'
  | 'short_ride'
  | 'gps_mismatch'
  | 'repeated_cancel'
  | 'suspicious_pattern';

export type StopStatus = 'pending_driver' | 'accepted' | 'declined';

export type NotificationType =
  | 'ride_request'
  | 'ride_accepted'
  | 'driver_arriving'
  | 'ride_started'
  | 'ride_completed'
  | 'payment_received'
  | 'subscription_reminder'
  | 'promo'
  | 'system';

// --- Core Models ---

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  license_number?: string;
  license_expiry?: string;
  license_image_url?: string;
  background_check_status: BackgroundCheckStatus;
  is_online: boolean;
  is_approved: boolean;
  current_lat?: number;
  current_lng?: number;
  heading?: number;
  rating: number;
  total_rides: number;
  total_earnings: number;
  stripe_account_id?: string;
  subscription_status: SubscriptionStatus;
  subscription_expires_at?: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  vehicle_type: RideType;
  seats: number;
  image_url?: string;
  is_active: boolean;
  insurance_expiry?: string;
  created_at: string;
}

export interface RideStop {
  id: string;
  ride_id: string;
  stop_order: 1 | 2;
  address: string;
  lat: number;
  lng: number;
  arrived_at?: string;
  completed_at?: string;
  wait_started_at?: string;
  status: StopStatus;
  additional_fare?: number;
  added_at: string;
  added_by: 'rider' | 'driver';
}

export interface Ride {
  id: string;
  rider_id: string;
  driver_id?: string;
  vehicle_id?: string;
  status: RideStatus;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  estimated_fare?: number;
  final_fare?: number;
  base_fare?: number;
  distance_fare?: number;
  surge_multiplier: number;
  platform_fee?: number;
  driver_earnings?: number;
  estimated_distance_km?: number;
  actual_distance_km?: number;
  estimated_duration_min?: number;
  actual_duration_min?: number;
  ride_type: RideType;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_intent_id?: string;
  stops?: RideStop[];
  requested_at: string;
  accepted_at?: string;
  driver_arrived_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancelled_by?: CancelledBy;
  cancellation_reason?: string;
  rider_notes?: string;
  tip_amount?: number;
  tip_pct?: number;
  created_at: string;
}

export interface DriverLocation {
  id: string;
  driver_id: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  is_online: boolean;
  updated_at: string;
}

export interface Rating {
  id: string;
  ride_id: string;
  rated_by: string;
  rated_user: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  ride_id: string;
  rider_id: string;
  driver_id: string;
  amount: number;
  platform_fee: number;
  driver_payout: number;
  currency: string;
  stripe_payment_intent_id?: string;
  stripe_transfer_id?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  created_at: string;
}

export interface DriverEarning {
  id: string;
  driver_id: string;
  ride_id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  tip_amount: number;
  payout_status: PayoutStatus;
  payout_type: 'standard' | 'instant';
  instant_fee: number;
  created_at: string;
}

export interface DriverSubscription {
  id: string;
  driver_id: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  plan: SubscriptionPlan;
  price: number;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  current_period_start?: string;
  current_period_end?: string;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_uses?: number;
  used_count: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  is_read: boolean;
  sent_at: string;
}

// --- API Response Types ---

export interface FareEstimate {
  base_fare: number;
  distance_fare: number;
  time_fare: number;
  surge_multiplier: number;
  subtotal: number;
  platform_fee: number;
  driver_earnings: number;
  total: number;
}

export interface NearbyDriver {
  driver_id: string;
  full_name: string;
  rating: number;
  distance_km: number;
  lat: number;
  lng: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  license_plate: string;
}

export interface FavoriteDriver {
  id: string;
  rider_id: string;
  driver_id: string;
  created_at: string;
}

export interface RideFlag {
  id: string;
  ride_id: string;
  driver_id?: string;
  rider_id?: string;
  flag_type: RideFlagType;
  description?: string;
  driver_lat?: number;
  driver_lng?: number;
  expected_lat?: number;
  expected_lng?: number;
  distance_meters?: number;
  ride_duration_sec?: number;
  ride_distance_km?: number;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
}
