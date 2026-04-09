-- Add promo fields to rides table
ALTER TABLE rides ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS promo_discount DECIMAL(8,2);

-- RPC to safely increment promo used_count
CREATE OR REPLACE FUNCTION increment_promo_used_count(promo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE promo_codes
  SET used_count = COALESCE(used_count, 0) + 1
  WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
