-- ============================================================
-- DATABASE FUNCTIONS & TRIGGERS — Styl Rideshare
-- Run AFTER 002_rls.sql in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'rider'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: auto-create driver record when role = driver
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_driver_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'driver' AND NOT EXISTS (SELECT 1 FROM drivers WHERE id = NEW.id) THEN
    INSERT INTO drivers (id) VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_driver_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_driver_profile();

-- ============================================================
-- TRIGGER: auto-update updated_at on profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- FUNCTION: Find nearby available drivers (lat/lng fallback, no PostGIS)
-- ============================================================
CREATE OR REPLACE FUNCTION find_nearby_drivers(
  p_pickup_lat DECIMAL,
  p_pickup_lng DECIMAL,
  p_radius_km DECIMAL DEFAULT 10,
  p_ride_type TEXT DEFAULT 'standard'
)
RETURNS TABLE (
  driver_id UUID,
  full_name TEXT,
  rating DECIMAL,
  distance_km FLOAT,
  lat DECIMAL,
  lng DECIMAL,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  license_plate TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS driver_id,
    p.full_name,
    d.rating,
    -- Haversine formula (no PostGIS needed)
    (6371 * acos(
      cos(radians(p_pickup_lat)) * cos(radians(dl.lat))
      * cos(radians(dl.lng) - radians(p_pickup_lng))
      + sin(radians(p_pickup_lat)) * sin(radians(dl.lat))
    ))::FLOAT AS distance_km,
    dl.lat,
    dl.lng,
    v.make AS vehicle_make,
    v.model AS vehicle_model,
    v.color AS vehicle_color,
    v.license_plate
  FROM drivers d
  JOIN profiles p ON p.id = d.id
  JOIN driver_locations dl ON dl.driver_id = d.id
  LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
  WHERE
    d.is_online = TRUE
    AND d.is_approved = TRUE
    AND d.subscription_status = 'active'
    AND dl.is_online = TRUE
    AND dl.updated_at > NOW() - INTERVAL '2 minutes'
    -- No active ride
    AND NOT EXISTS (
      SELECT 1 FROM rides r
      WHERE r.driver_id = d.id
        AND r.status IN ('accepted', 'driver_arriving', 'driver_arrived', 'in_progress')
    )
    -- Within radius (Haversine)
    AND (6371 * acos(
      cos(radians(p_pickup_lat)) * cos(radians(dl.lat))
      * cos(radians(dl.lng) - radians(p_pickup_lng))
      + sin(radians(p_pickup_lat)) * sin(radians(dl.lat))
    )) <= p_radius_km
  ORDER BY distance_km ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Calculate fare estimate
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_fare(
  p_distance_km DECIMAL,
  p_duration_min INTEGER,
  p_ride_type TEXT DEFAULT 'standard',
  p_surge_multiplier DECIMAL DEFAULT 1.0
)
RETURNS JSONB AS $$
DECLARE
  v_base_fare DECIMAL := 2.50;
  v_per_km DECIMAL;
  v_per_min DECIMAL := 0.25;
  v_platform_fee_pct DECIMAL := 0.04; -- 4% platform fee
  v_total_fare DECIMAL;
  v_platform_fee DECIMAL;
  v_driver_earnings DECIMAL;
BEGIN
  -- Per-km rate by ride type
  v_per_km := CASE p_ride_type
    WHEN 'standard' THEN 1.20
    WHEN 'xl'       THEN 1.80
    WHEN 'luxury'   THEN 2.50
    WHEN 'electric' THEN 1.40
    ELSE 1.20
  END;

  v_total_fare := (v_base_fare + (p_distance_km * v_per_km) + (p_duration_min * v_per_min)) * p_surge_multiplier;
  v_total_fare := ROUND(v_total_fare, 2);
  v_platform_fee := ROUND(v_total_fare * v_platform_fee_pct, 2);
  v_driver_earnings := v_total_fare - v_platform_fee;

  RETURN jsonb_build_object(
    'base_fare', v_base_fare,
    'distance_fare', ROUND(p_distance_km * v_per_km, 2),
    'time_fare', ROUND(p_duration_min * v_per_min, 2),
    'surge_multiplier', p_surge_multiplier,
    'subtotal', v_total_fare,
    'platform_fee', v_platform_fee,
    'driver_earnings', v_driver_earnings,
    'total', v_total_fare
  );
END;
$$ LANGUAGE plpgsql;
