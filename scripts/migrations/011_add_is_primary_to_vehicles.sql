-- Migration: Add is_primary field to vehicles table
-- Created: 2025-01-10
-- Description: Adds is_primary boolean field to identify the user's primary vehicle

-- Add is_primary column
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- Create unique partial index to ensure only one primary vehicle per user
-- The WHERE clause makes this index only apply to rows where is_primary = TRUE
DROP INDEX IF EXISTS idx_vehicles_user_primary;
CREATE UNIQUE INDEX idx_vehicles_user_primary
  ON vehicles(user_id)
  WHERE is_primary = TRUE;

-- Add comment
COMMENT ON COLUMN vehicles.is_primary IS 'Indicates if this is the user''s primary/default vehicle (only one per user)';
