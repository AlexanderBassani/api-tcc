-- Migration: Add is_completed and completed_at to maintenances table
-- Created: 2025-12-19
-- Description: Add fields to track maintenance completion status

-- Add is_completed column
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

-- Add completed_at column
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Add constraint to ensure completed_at is only set when is_completed is true
ALTER TABLE maintenances ADD CONSTRAINT check_completed_at_consistency
  CHECK (completed_at IS NULL OR is_completed = TRUE);

-- Create index for filtering completed/pending maintenances
CREATE INDEX IF NOT EXISTS idx_maintenances_is_completed ON maintenances(is_completed);

-- Add comments
COMMENT ON COLUMN maintenances.is_completed IS 'Whether the maintenance has been completed';
COMMENT ON COLUMN maintenances.completed_at IS 'Timestamp when the maintenance was marked as completed';
