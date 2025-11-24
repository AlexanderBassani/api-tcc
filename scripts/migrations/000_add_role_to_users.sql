-- Migration: Add role column to users table
-- Created: 2025-11-24
-- Description: Adds role-based access control (RBAC) to users table

-- Add role column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'
CHECK (role IN ('admin', 'user'));

-- Update existing admin user (if any exists)
UPDATE users
SET role = 'admin'
WHERE username = 'admin' OR email = 'admin@sistema.com';

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Insert comments
COMMENT ON COLUMN users.role IS 'User role for RBAC: admin or user';

-- Log completion message
DO $$
BEGIN
  RAISE NOTICE 'Migration 000_add_role_to_users completed successfully!';
END $$;