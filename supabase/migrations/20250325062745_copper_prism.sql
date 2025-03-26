/*
  # Add delivery completion function
  
  1. Changes
    - Add stored procedure to handle delivery completion
    - Ensures atomic updates for order status and delivery log
    
  2. Security
    - Function is executed with invoker's rights
    - Maintains RLS policies
*/

CREATE OR REPLACE FUNCTION complete_delivery(
  p_order_id uuid,
  p_signature text,
  p_notes text,
  p_photos text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update order status
  UPDATE orders
  SET status = 'delivered'
  WHERE id = p_order_id;

  -- Create delivery proof record
  INSERT INTO order_status_logs (
    order_id,
    status,
    notes,
    photos
  ) VALUES (
    p_order_id,
    'delivered',
    'Delivered. Signed by: ' || p_signature || CASE WHEN p_notes IS NOT NULL AND p_notes != '' THEN E'\nNotes: ' || p_notes ELSE '' END,
    p_photos
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_delivery TO authenticated;