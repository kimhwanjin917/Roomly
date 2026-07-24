-- Atomic stock adjustment to prevent race conditions on concurrent +1/-1 updates.
-- GREATEST(0, ...) ensures stock never goes negative.
CREATE OR REPLACE FUNCTION adjust_supply_stock(
  p_supply_id UUID,
  p_hotel_id  UUID,
  p_delta     INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_stock INTEGER;
BEGIN
  UPDATE supplies
  SET    stock = GREATEST(0, stock + p_delta)
  WHERE  id        = p_supply_id
    AND  hotel_id  = p_hotel_id
  RETURNING stock INTO v_new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'supply not found or access denied';
  END IF;

  RETURN v_new_stock;
END;
$$;
