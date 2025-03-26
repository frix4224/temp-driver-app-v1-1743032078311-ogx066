/*
  # Order Workflow Management
  
  1. New Columns
    - is_pickup_completed: Tracks if driver has picked up the order
    - is_facility_processing: Tracks if facility is processing the order
    - is_dropoff_completed: Tracks if driver has completed delivery
    
  2. Changes
    - Add new boolean columns with default false
    - Add constraints to ensure valid state transitions
    - Update existing orders to have valid states
    
  3. Security
    - Ensure data consistency through constraints
    - Prevent invalid state combinations
*/

-- Add new columns with default values
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_pickup_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_facility_processing boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_dropoff_completed boolean DEFAULT false;

-- Update existing orders to have valid states based on their current status
UPDATE orders
SET
  is_pickup_completed = CASE 
    WHEN status IN ('processing', 'shipped', 'delivered') THEN true 
    ELSE false 
  END,
  is_facility_processing = CASE 
    WHEN status = 'processing' THEN true 
    ELSE false 
  END,
  is_dropoff_completed = CASE 
    WHEN status = 'delivered' THEN true 
    ELSE false 
  END;

-- Add constraints to ensure valid state transitions
ALTER TABLE orders
  ADD CONSTRAINT valid_pickup_state 
    CHECK (
      -- Can't be processing in facility without pickup
      (NOT is_facility_processing OR is_pickup_completed) AND
      -- Can't be dropped off without pickup
      (NOT is_dropoff_completed OR is_pickup_completed)
    ),
  ADD CONSTRAINT valid_processing_state
    CHECK (
      -- Can't be dropped off while still processing
      (NOT is_dropoff_completed OR NOT is_facility_processing)
    );

-- Create function to handle order state transitions
CREATE OR REPLACE FUNCTION handle_order_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- When pickup is completed, update status to processing if not already
  IF NEW.is_pickup_completed AND NOT OLD.is_pickup_completed THEN
    NEW.status = 'processing';
  END IF;

  -- When facility processing starts
  IF NEW.is_facility_processing AND NOT OLD.is_facility_processing THEN
    NEW.status = 'processing';
  END IF;

  -- When facility processing ends and dropoff is completed
  IF NEW.is_dropoff_completed AND NOT OLD.is_dropoff_completed THEN
    NEW.status = 'delivered';
    NEW.is_facility_processing = false; -- Ensure processing is marked as complete
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for state transitions
DROP TRIGGER IF EXISTS order_state_transition_trigger ON orders;

CREATE TRIGGER order_state_transition_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_state_transition();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_workflow_state
  ON orders (is_pickup_completed, is_facility_processing, is_dropoff_completed);

-- Add comment explaining the workflow columns
COMMENT ON COLUMN orders.is_pickup_completed IS 'Indicates if the driver has picked up the order from the customer';
COMMENT ON COLUMN orders.is_facility_processing IS 'Indicates if the facility is currently processing the order';
COMMENT ON COLUMN orders.is_dropoff_completed IS 'Indicates if the driver has completed the delivery back to the customer';