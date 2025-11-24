-- Migration: Create vehicles table
-- Created: 2025-11-24
-- Description: Table to store vehicle information

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  
  -- Vehicle details
  brand VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
  plate VARCHAR(20) NOT NULL UNIQUE,
  color VARCHAR(30),
  
  -- Vehicle status and metrics
  current_km INTEGER DEFAULT 0 CHECK (current_km >= 0),
  purchase_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  CONSTRAINT fk_vehicles_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);

-- Insert comments on table
COMMENT ON TABLE vehicles IS 'Stores vehicle information for each user';
COMMENT ON COLUMN vehicles.brand IS 'Vehicle brand/manufacturer';
COMMENT ON COLUMN vehicles.model IS 'Vehicle model name';
COMMENT ON COLUMN vehicles.year IS 'Manufacturing year';
COMMENT ON COLUMN vehicles.plate IS 'License plate (unique)';
COMMENT ON COLUMN vehicles.current_km IS 'Current odometer reading';
COMMENT ON COLUMN vehicles.is_active IS 'Whether vehicle is currently being tracked';