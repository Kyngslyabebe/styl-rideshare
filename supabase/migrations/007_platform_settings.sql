-- ============================================================
-- Platform Settings — admin-configurable key/value store
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Allow service role full access; anon can read (apps need fare config)
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage settings"
  ON platform_settings FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- Seed default settings
-- ============================================================

INSERT INTO platform_settings (key, value) VALUES

-- Fare structure
('fare_base', '8.00'),
('fare_minimum', '8.00'),
('fare_per_mile', '{"standard": 1.93, "xl": 2.90, "luxury": 4.02, "electric": 2.25}'),
('fare_per_minute', '0.25'),
('booking_fee', '1.50'),

-- Deductions (passed through at cost — Styl takes $0 commission)
('stripe_fee_pct', '0.029'),
('stripe_fee_fixed', '0.30'),
('dispute_protection_fee', '0.30'),

-- Surge
('surge_max', '10.0'),
('surge_enabled', 'true'),
('current_surge', '1.0'),

-- Cancellation tiers: array of { maxMin, fee }
('cancel_tiers', '[{"maxMin": 3, "fee": 0}, {"maxMin": 6, "fee": 2.00}, {"maxMin": 999, "fee": 4.00}]'),

-- Subscriptions
('subscription_daily', '20.00'),
('subscription_weekly', '100.00'),
('subscription_monthly', '360.00'),
('subscription_skim_pct', '0.60'),

-- Ride types enabled
('ride_types', '["standard", "xl", "luxury", "electric"]'),

-- Compare markup (what "other platforms" charge, shown in UI)
('compare_markup', '1.30')

ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Updated calculate_fare() — reads from platform_settings
-- No commission model: driver gets 100% minus Stripe + dispute fees
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_fare(
  p_distance_km DECIMAL,
  p_duration_min INTEGER,
  p_ride_type TEXT DEFAULT 'standard',
  p_surge_multiplier DECIMAL DEFAULT 1.0
)
RETURNS JSONB AS $$
DECLARE
  v_base_fare DECIMAL;
  v_min_fare DECIMAL;
  v_per_mile JSONB;
  v_per_mile_rate DECIMAL;
  v_per_min DECIMAL;
  v_booking_fee DECIMAL;
  v_stripe_fee_pct DECIMAL;
  v_stripe_fee_fixed DECIMAL;
  v_dispute_fee DECIMAL;
  v_surge_max DECIMAL;
  v_distance_mi DECIMAL;
  v_subtotal DECIMAL;
  v_total_fare DECIMAL;
  v_stripe_fee DECIMAL;
  v_driver_earnings DECIMAL;
  v_capped_surge DECIMAL;
BEGIN
  -- Read settings (with fallback defaults)
  SELECT COALESCE((SELECT value::TEXT::DECIMAL FROM platform_settings WHERE key = 'fare_base'), 8.00) INTO v_base_fare;
  SELECT COALESCE((SELECT value::TEXT::DECIMAL FROM platform_settings WHERE key = 'fare_minimum'), 8.00) INTO v_min_fare;
  SELECT COALESCE((SELECT value FROM platform_settings WHERE key = 'fare_per_mile'), '{"standard":1.93,"xl":2.90,"luxury":4.02,"electric":2.25}'::JSONB) INTO v_per_mile;
  SELECT COALESCE((SELECT value::TEXT::DECIMAL FROM platform_settings WHERE key = 'fare_per_minute'), 0.25) INTO v_per_min;
  SELECT COALESCE((SELECT value::TEXT::DECIMAL FROM platform_settings WHERE key = 'booking_fee'), 1.50) INTO v_booking_fee;
  SELECT COALESCE((SELECT value::TEXT::DECIMAL FROM platform_settings WHERE key = 'stripe_fee_pct'), 0.029) INTO v_stripe_fee_pct;
  SELECT COALESCE((SELECT value::TEXT::DECIMAL FROM platform_settings WHERE key = 'stripe_fee_fixed'), 0.30) INTO v_stripe_fee_fixed;
  SELECT COALESCE((SELECT value::TEXT::DECIMAL FROM platform_settings WHERE key = 'dispute_protection_fee'), 0.30) INTO v_dispute_fee;
  SELECT COALESCE((SELECT value::TEXT::DECIMAL FROM platform_settings WHERE key = 'surge_max'), 10.0) INTO v_surge_max;

  -- Per-mile rate for the ride type
  v_per_mile_rate := COALESCE((v_per_mile ->> p_ride_type)::DECIMAL, (v_per_mile ->> 'standard')::DECIMAL, 1.93);

  -- Cap surge
  v_capped_surge := LEAST(p_surge_multiplier, v_surge_max);

  -- Convert km to miles
  v_distance_mi := p_distance_km * 0.621371;

  -- Calculate fare: base + (miles * rate) + (minutes * rate) + booking fee, then surge
  v_subtotal := (v_base_fare + (v_distance_mi * v_per_mile_rate) + (p_duration_min * v_per_min)) * v_capped_surge;
  v_total_fare := GREATEST(ROUND(v_subtotal + v_booking_fee, 2), v_min_fare);

  -- Deductions: Stripe processing + dispute protection (NO platform commission)
  v_stripe_fee := ROUND(v_total_fare * v_stripe_fee_pct + v_stripe_fee_fixed, 2);
  v_driver_earnings := v_total_fare - v_stripe_fee - v_dispute_fee;

  RETURN jsonb_build_object(
    'base_fare', v_base_fare,
    'booking_fee', v_booking_fee,
    'distance_fare', ROUND(v_distance_mi * v_per_mile_rate, 2),
    'time_fare', ROUND(p_duration_min * v_per_min, 2),
    'surge_multiplier', v_capped_surge,
    'subtotal', ROUND(v_subtotal, 2),
    'stripe_fee', v_stripe_fee,
    'dispute_protection_fee', v_dispute_fee,
    'styl_commission', 0.00,
    'driver_earnings', v_driver_earnings,
    'total', v_total_fare
  );
END;
$$ LANGUAGE plpgsql;
