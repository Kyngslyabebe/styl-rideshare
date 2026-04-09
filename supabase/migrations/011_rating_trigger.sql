-- Auto-update driver avg rating when a new rating is inserted
CREATE OR REPLACE FUNCTION update_driver_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE drivers
  SET rating = (
    SELECT ROUND(AVG(r.rating)::numeric, 2)
    FROM ratings r
    JOIN rides ri ON ri.id = r.ride_id
    WHERE ri.driver_id = (SELECT driver_id FROM rides WHERE id = NEW.ride_id)
  )
  WHERE id = (SELECT driver_id FROM rides WHERE id = NEW.ride_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_driver_rating ON ratings;
CREATE TRIGGER trg_update_driver_rating
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_avg_rating();
