-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Styl Rideshare
-- Run AFTER 001_schema.sql in Supabase SQL Editor
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- DRIVERS
-- ============================================================
CREATE POLICY "Drivers see own record"
  ON drivers FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "Riders see driver during active ride"
  ON drivers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.driver_id = drivers.id
        AND rides.rider_id = auth.uid()
        AND rides.status IN ('accepted', 'driver_arriving', 'driver_arrived', 'in_progress')
    )
  );

CREATE POLICY "Admins manage all drivers"
  ON drivers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE POLICY "Drivers manage own vehicles"
  ON vehicles FOR ALL
  USING (driver_id = auth.uid());

CREATE POLICY "Riders see vehicle during active ride"
  ON vehicles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.vehicle_id = vehicles.id
        AND rides.rider_id = auth.uid()
        AND rides.status IN ('accepted', 'driver_arriving', 'driver_arrived', 'in_progress')
    )
  );

CREATE POLICY "Admins manage all vehicles"
  ON vehicles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- RIDES
-- ============================================================
CREATE POLICY "Riders see own rides"
  ON rides FOR SELECT
  USING (rider_id = auth.uid());

CREATE POLICY "Drivers see assigned rides"
  ON rides FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "Riders can create rides"
  ON rides FOR INSERT
  WITH CHECK (rider_id = auth.uid());

CREATE POLICY "Driver or rider can update ride"
  ON rides FOR UPDATE
  USING (driver_id = auth.uid() OR rider_id = auth.uid());

CREATE POLICY "Admins manage all rides"
  ON rides FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- RIDE STOPS
-- ============================================================
CREATE POLICY "Rider can manage stops"
  ON ride_stops FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_stops.ride_id AND rides.rider_id = auth.uid()
    )
  );

CREATE POLICY "Driver can view stops"
  ON ride_stops FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_stops.ride_id AND rides.driver_id = auth.uid()
    )
  );

-- ============================================================
-- DRIVER LOCATIONS
-- ============================================================
CREATE POLICY "Anyone can read online driver locations"
  ON driver_locations FOR SELECT
  USING (is_online = TRUE);

CREATE POLICY "Drivers update own location"
  ON driver_locations FOR ALL
  USING (driver_id = auth.uid());

-- ============================================================
-- RATINGS
-- ============================================================
CREATE POLICY "Users can create ratings for their rides"
  ON ratings FOR INSERT
  WITH CHECK (rated_by = auth.uid());

CREATE POLICY "Users can view ratings they gave or received"
  ON ratings FOR SELECT
  USING (rated_by = auth.uid() OR rated_user = auth.uid());

CREATE POLICY "Admins manage all ratings"
  ON ratings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE POLICY "Riders see own payments"
  ON payments FOR SELECT
  USING (rider_id = auth.uid());

CREATE POLICY "Drivers see own payouts"
  ON payments FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "Admins manage all payments"
  ON payments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- DRIVER EARNINGS
-- ============================================================
CREATE POLICY "Drivers see own earnings"
  ON driver_earnings FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "Admins manage all earnings"
  ON driver_earnings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- DRIVER SUBSCRIPTIONS
-- ============================================================
CREATE POLICY "Drivers see own subscription"
  ON driver_subscriptions FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "Admins manage all subscriptions"
  ON driver_subscriptions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================
-- PROMO CODES
-- ============================================================
CREATE POLICY "Anyone can read active promo codes"
  ON promo_codes FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins manage promo codes"
  ON promo_codes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
