-- Security hardening migration

-- 1. Tighten driver_locations: only drivers can write their own location
DROP POLICY IF EXISTS "Drivers can update own location" ON driver_locations;
CREATE POLICY "Drivers can update own location"
  ON driver_locations FOR UPDATE
  USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can insert own location" ON driver_locations;
CREATE POLICY "Drivers can insert own location"
  ON driver_locations FOR INSERT
  WITH CHECK (driver_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage driver locations" ON driver_locations;
CREATE POLICY "Admins manage driver locations"
  ON driver_locations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Add missing subscription tracking columns on drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS subscription_collected DECIMAL(8,2) DEFAULT 0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS subscription_target DECIMAL(8,2) DEFAULT 0;

-- 3. Add ride_credit column to profiles for rewards redemption
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ride_credit DECIMAL(8,2) DEFAULT 0;
