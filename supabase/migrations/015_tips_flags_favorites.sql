-- Migration 015: Tips, Ride Flags, Favorite Drivers, Anti-Abuse

-- 1. Add tip columns to rides table
ALTER TABLE rides ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(8,2) DEFAULT 0;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS tip_pct INTEGER; -- null = custom amount, else 5/10/15/20

-- 2. Add tip to driver_earnings ledger
ALTER TABLE driver_earnings ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(8,2) DEFAULT 0;

-- 3. Add stop_wait_started_at to ride_stops (tracks when driver arrived at stop)
ALTER TABLE ride_stops ADD COLUMN IF NOT EXISTS wait_started_at TIMESTAMPTZ;
-- status of a mid-trip added stop: pending_driver (awaiting driver accept), accepted, declined
ALTER TABLE ride_stops ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'accepted'
  CHECK (status IN ('pending_driver', 'accepted', 'declined'));
-- Additional fare for mid-trip added stop
ALTER TABLE ride_stops ADD COLUMN IF NOT EXISTS additional_fare DECIMAL(8,2);

-- 4. Favorite drivers
CREATE TABLE IF NOT EXISTS favorite_drivers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rider_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rider_id, driver_id)
);

-- 5. Ride flags (anti-abuse)
CREATE TABLE IF NOT EXISTS ride_flags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id),
  rider_id UUID REFERENCES profiles(id),
  flag_type TEXT NOT NULL CHECK (flag_type IN (
    'early_arrival_swipe',
    'fake_pickup',
    'short_ride',
    'gps_mismatch',
    'repeated_cancel',
    'suspicious_pattern'
  )),
  description TEXT,
  driver_lat DECIMAL(10,8),
  driver_lng DECIMAL(11,8),
  expected_lat DECIMAL(10,8),
  expected_lng DECIMAL(11,8),
  distance_meters DECIMAL(10,2),
  ride_duration_sec INTEGER,
  ride_distance_km DECIMAL(8,2),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Driver ignore counter (tracks consecutive ignored ride requests)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS consecutive_ignores INTEGER DEFAULT 0;

-- 7. Add search_radius_km to platform_settings (admin configurable)
-- Check if platform_settings table exists from migration 007
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_settings') THEN
    EXECUTE 'ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS search_radius_km DECIMAL(5,1) DEFAULT 24.0';
    -- 24 km ≈ 15 miles
  END IF;
END $$;

-- 8. RLS policies for new tables
ALTER TABLE favorite_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_flags ENABLE ROW LEVEL SECURITY;

-- Riders can manage their own favorites
CREATE POLICY "Riders manage own favorites"
  ON favorite_drivers FOR ALL
  USING (rider_id = auth.uid());

-- Admins can view all flags
CREATE POLICY "Admins view all flags"
  ON ride_flags FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- System/service role can insert flags (edge functions use service role)
CREATE POLICY "Service can insert flags"
  ON ride_flags FOR INSERT
  WITH CHECK (true);

-- Admins can update flags (resolve)
CREATE POLICY "Admins resolve flags"
  ON ride_flags FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_favorite_drivers_rider ON favorite_drivers(rider_id);
CREATE INDEX IF NOT EXISTS idx_favorite_drivers_driver ON favorite_drivers(driver_id);
CREATE INDEX IF NOT EXISTS idx_ride_flags_driver ON ride_flags(driver_id);
CREATE INDEX IF NOT EXISTS idx_ride_flags_resolved ON ride_flags(resolved);
CREATE INDEX IF NOT EXISTS idx_ride_flags_type ON ride_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_rides_tip ON rides(tip_amount) WHERE tip_amount > 0;
