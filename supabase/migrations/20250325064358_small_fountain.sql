/*
  # Delivery Completion Function
  
  1. Changes
    - Create a secure function to handle delivery completion
    - Function handles both order status update and proof logging
    - Ensures atomic transaction for delivery completion
    
  2. Security
    - Function runs with SECURITY DEFINER to ensure proper access
    - Only authenticated users can execute the function
    - All operations happen in a single transaction
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
  -- Validate order exists and is in valid state
  IF NOT EXISTS (
    SELECT 1 FROM orders 
    WHERE id = p_order_id 
    AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'Invalid order or order already completed';
  END IF;

  -- Start transaction
  BEGIN
    -- Update order status
    UPDATE orders
    SET 
      status = 'delivered',
      updated_at = now()
    WHERE id = p_order_id;

    -- Create delivery proof record
    INSERT INTO order_status_logs (
      order_id,
      status,
      notes,
      photos,
      created_at
    ) VALUES (
      p_order_id,
      'delivered',
      'Delivered. Signed by: ' || p_signature || 
      CASE 
        WHEN p_notes IS NOT NULL AND p_notes != '' 
        THEN E'\nNotes: ' || p_notes 
        ELSE '' 
      END,
      p_photos,
      now()
    );

    -- If any error occurs, the entire transaction will be rolled back
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_delivery TO authenticated;

-- Add comment explaining function usage
COMMENT ON FUNCTION complete_delivery IS 'Completes a delivery by updating order status and creating proof record. Must be called by authenticated users.';