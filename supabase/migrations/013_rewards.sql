-- Rider rewards / loyalty points system
-- 1 point per mile ridden, 2x on weekends
-- Points can be redeemed for ride credit

CREATE TABLE IF NOT EXISTS rider_rewards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES rides(id),
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'bonus', 'expired')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_rewards_rider ON rider_rewards(rider_id, created_at DESC);

ALTER TABLE rider_rewards ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access to rider_rewards"
ON rider_rewards FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Riders can view their own rewards
CREATE POLICY "Riders can view own rewards"
ON rider_rewards FOR SELECT
TO authenticated
USING (rider_id = auth.uid());

-- Add total points column to profiles for quick lookup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 0;

-- RPC to redeem points for ride credit
-- 100 points = $1.00 ride credit
CREATE OR REPLACE FUNCTION redeem_reward_points(p_rider_id UUID, p_points INTEGER)
RETURNS JSON AS $$
DECLARE
  current_points INTEGER;
  credit_amount DECIMAL(8,2);
BEGIN
  SELECT reward_points INTO current_points FROM profiles WHERE id = p_rider_id;

  IF current_points IS NULL OR current_points < p_points THEN
    RETURN json_build_object('error', 'Insufficient points');
  END IF;

  IF p_points < 100 THEN
    RETURN json_build_object('error', 'Minimum redemption is 100 points');
  END IF;

  credit_amount := ROUND(p_points / 100.0, 2);

  -- Deduct points
  UPDATE profiles
  SET reward_points = reward_points - p_points,
      ride_credit = COALESCE(ride_credit, 0) + credit_amount
  WHERE id = p_rider_id;

  -- Record redemption
  INSERT INTO rider_rewards (rider_id, points, type, description)
  VALUES (p_rider_id, -p_points, 'redeemed', 'Redeemed ' || p_points || ' points for $' || credit_amount || ' ride credit');

  RETURN json_build_object('success', true, 'credit_added', credit_amount, 'remaining_points', current_points - p_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple increment helper for process-payment edge function
CREATE OR REPLACE FUNCTION increment_reward_points(p_rider_id UUID, p_points INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET reward_points = COALESCE(reward_points, 0) + p_points
  WHERE id = p_rider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
