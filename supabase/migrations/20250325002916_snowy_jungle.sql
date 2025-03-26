/*
  # Order Type Management System

  1. Changes
    - Add type column if not exists
    - Update existing orders to have valid types
    - Add trigger for automatic type management
    - Add constraint after data is valid

  2. Security
    - Ensure data consistency
    - Validate order types
    - Maintain data integrity during transitions
*/

-- First ensure the type column exists
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS type text;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Update existing orders to have valid types before adding constraint
UPDATE orders 
SET type = 'pickup' 
WHERE type IS NULL OR type NOT IN ('pickup', 'dropoff');

-- Function to handle order type transitions
CREATE OR REPLACE FUNCTION handle_order_type_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure all new orders start as pickup
  IF TG_OP = 'INSERT' THEN
    NEW.type = 'pickup';
  END IF;

  -- When order is marked as 'finished' by facility, change type to 'dropoff'
  IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
    NEW.type = 'dropoff';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS order_type_transition_trigger ON orders;

-- Create trigger for order type transitions
CREATE TRIGGER order_type_transition_trigger
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION handle_order_type_transition();

-- Now that all data is valid, add the constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS valid_order_type;

ALTER TABLE orders
ADD CONSTRAINT valid_order_type
CHECK (type IN ('pickup', 'dropoff'));