/*
  # Add delivery photos support
  
  1. Changes
    - Add photos column to order_status_logs table to store delivery photo URLs
    
  2. Notes
    - Uses text[] to store multiple photo URLs
    - Photos will be stored in Supabase Storage and referenced by URL
*/

-- Add photos column to order_status_logs
ALTER TABLE order_status_logs 
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';