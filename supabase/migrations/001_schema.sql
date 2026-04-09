-- Run this first in your Supabase SQL Editor
-- Project: RideShare App
-- Description: Full schema — profiles, drivers, vehicles, rides, stops, locations, payments, earnings

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: PostGIS may not be available on Supabase free tier.
-- If CREATE EXTENSION postgis fails, remove it and use DECIMAL lat/lng columns instead (already included as fallback).

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('rider', 'driver', 'admin')) DEFAULT 'rider',
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT UNIQUE,
  email TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DRIVERS
CREATE TABLE IF NOT EXISTS drivers (
  id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  license_number TEXT,
  license_expiry DATE,
  license_image_url TEXT,
  background_check_status TEXT DEFAULT 'pending'
    CHECK (background_check_status IN ('pending', 'passed', 'failed', 'not_required')),
  is_online BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  current_location_updated_at TIMESTAMPTZ,
  heading FLOAT,
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_rides INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  stripe_account_id TEXT,
  subscription_status TEXT DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled')),
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'standard'
    CHECK (vehicle_type IN ('standard', 'xl', 'luxury', 'electric')),
  seats INTEGER DEFAULT 4,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  insurance_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RIDES
CREATE TABLE IF NOT EXISTS rides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rider_id UUID REFERENCES profiles(id),
  driver_id UUID REFERENCES drivers(id),
  vehicle_id UUID REFERENCES vehicles(id),
  status TEXT NOT NULL DEFAULT 'searching'
    CHECK (status IN ('searching','accepted','driver_arriving','driver_arrived','in_progress','completed','cancelled','no_drivers_found')),
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10, 8) NOT NULL,
  pickup_lng DECIMAL(11, 8) NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_lat DECIMAL(10, 8) NOT NULL,
  dropoff_lng DECIMAL(11, 8) NOT NULL,
  estimated_fare DECIMAL(8,2),
  final_fare DECIMAL(8,2),
  base_fare DECIMAL(8,2),
  distance_fare DECIMAL(8,2),
  surge_multiplier DECIMAL(3,2) DEFAULT 1.0,
  platform_fee DECIMAL(8,2),
  driver_earnings DECIMAL(8,2),
  estimated_distance_km DECIMAL(8,2),
  actual_distance_km DECIMAL(8,2),
  estimated_duration_min INTEGER,
  actual_duration_min INTEGER,
  ride_type TEXT DEFAULT 'standard'
    CHECK (ride_type IN ('standard', 'xl', 'luxury', 'electric')),
  payment_method TEXT DEFAULT 'card' CHECK (payment_method IN ('card', 'cash')),
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'captured', 'failed', 'refunded')),
  payment_intent_id TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  driver_arrived_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT CHECK (cancelled_by IN ('rider', 'driver', 'system')),
  cancellation_reason TEXT,
  rider_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RIDE STOPS
CREATE TABLE IF NOT EXISTS ride_stops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL CHECK (stop_order IN (1, 2)),
  address TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by TEXT DEFAULT 'rider' CHECK (added_by IN ('rider', 'driver'))
);

-- DRIVER LOCATIONS (real-time, one row per driver, upserted every 3s)
CREATE TABLE IF NOT EXISTS driver_locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE UNIQUE,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  heading FLOAT,
  speed FLOAT,
  is_online BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RATINGS
CREATE TABLE IF NOT EXISTS ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE UNIQUE,
  rated_by UUID REFERENCES profiles(id),
  rated_user UUID REFERENCES profiles(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ride_id UUID REFERENCES rides(id),
  rider_id UUID REFERENCES profiles(id),
  driver_id UUID REFERENCES drivers(id),
  amount DECIMAL(8,2) NOT NULL,
  platform_fee DECIMAL(8,2),
  driver_payout DECIMAL(8,2),
  currency TEXT DEFAULT 'usd',
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DRIVER EARNINGS LEDGER
CREATE TABLE IF NOT EXISTS driver_earnings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES rides(id),
  gross_amount DECIMAL(8,2),
  platform_fee DECIMAL(8,2),
  net_amount DECIMAL(8,2),
  payout_status TEXT DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'paid', 'instant_paid')),
  payout_type TEXT DEFAULT 'standard' CHECK (payout_type IN ('standard', 'instant')),
  instant_fee DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DRIVER SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS driver_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  plan TEXT DEFAULT 'monthly' CHECK (plan IN ('weekly', 'monthly')),
  price DECIMAL(6,2),
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROMO CODES
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value DECIMAL(8,2) NOT NULL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'ride_request','ride_accepted','driver_arriving',
    'ride_started','ride_completed','payment_received',
    'subscription_reminder','promo','system'
  )),
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_rides_rider_id ON rides(rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_ride_stops_ride_id ON ride_stops(ride_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id ON driver_earnings(driver_id);
