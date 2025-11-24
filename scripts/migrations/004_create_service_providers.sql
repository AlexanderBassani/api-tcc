-- Migration: Create service_providers table
-- Created: 2025-11-24
-- Description: Table to store service providers (workshops, dealerships, etc.)

-- Create service_providers table
CREATE TABLE IF NOT EXISTS service_providers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  
  -- Provider details
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('oficina', 'concessionária', 'lava-jato', 'borracharia', 'outros')),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  
  -- Rating and preferences
  rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  CONSTRAINT fk_service_providers_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_service_providers_updated_at ON service_providers;
CREATE TRIGGER update_service_providers_updated_at
  BEFORE UPDATE ON service_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_providers_user_id ON service_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_type ON service_providers(type);
CREATE INDEX IF NOT EXISTS idx_service_providers_is_favorite ON service_providers(is_favorite);
CREATE INDEX IF NOT EXISTS idx_service_providers_rating ON service_providers(rating);

-- Insert comments
COMMENT ON TABLE service_providers IS 'Stores service providers (workshops, dealerships) for each user';
COMMENT ON COLUMN service_providers.name IS 'Name of the service provider';
COMMENT ON COLUMN service_providers.type IS 'Type of service provider (workshop, dealership, etc.)';
COMMENT ON COLUMN service_providers.rating IS 'User rating for this provider (0.0 to 5.0)';
COMMENT ON COLUMN service_providers.is_favorite IS 'Whether this is a favorite provider';