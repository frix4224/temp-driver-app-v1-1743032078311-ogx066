/*
  # Add Coordinates to Orders Table
  
  1. Changes
    - Add latitude and longitude columns to orders table
    - Add index for coordinates to improve geospatial queries
    - Update existing orders with default coordinates (Amsterdam center)
    
  2. Notes
    - Uses text type for coordinates to maintain precision
    - Adds validation constraints for valid coordinate ranges
    - Creates index for better performance on location-based queries
*/

-- Add coordinate columns if they don't exist
DO $$ BEGIN
  ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS latitude text,
    ADD COLUMN IF NOT EXISTS longitude text;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Update existing orders with default coordinates (Amsterdam center)
UPDATE orders 
SET 
  latitude = '52.3676',
  longitude = '4.9041'
WHERE latitude IS NULL OR longitude IS NULL;

-- Add coordinate validation constraints
ALTER TABLE orders
  ADD CONSTRAINT valid_latitude CHECK (
    CAST(latitude AS numeric) BETWEEN -90 AND 90
  ),
  ADD CONSTRAINT valid_longitude CHECK (
    CAST(longitude AS numeric) BETWEEN -180 AND 180
  );

-- Create index for coordinates
CREATE INDEX IF NOT EXISTS idx_orders_coordinates 
ON orders (latitude, longitude);

-- Make coordinates required
ALTER TABLE orders
  ALTER COLUMN latitude SET NOT NULL,
  ALTER COLUMN longitude SET NOT NULL;