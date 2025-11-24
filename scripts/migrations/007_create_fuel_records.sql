-- Migration: Create fuel_records table
-- Created: 2025-11-24
-- Description: Table to store vehicle fuel/gas records

-- Create fuel_records table
CREATE TABLE IF NOT EXISTS fuel_records (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL,
  
  -- Fuel record details
  date DATE NOT NULL,
  km INTEGER NOT NULL CHECK (km >= 0),
  liters DECIMAL(6,2) NOT NULL CHECK (liters > 0),
  price_per_liter DECIMAL(6,3) NOT NULL CHECK (price_per_liter > 0),
  total_cost DECIMAL(10,2) NOT NULL CHECK (total_cost > 0),
  
  -- Fuel information
  fuel_type VARCHAR(30) NOT NULL DEFAULT 'gasoline' CHECK (fuel_type IN ('gasoline', 'ethanol', 'diesel', 'flex', 'gnv', 'electric')),
  is_full_tank BOOLEAN DEFAULT FALSE,
  gas_station VARCHAR(100),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  CONSTRAINT fk_fuel_records_vehicle
    FOREIGN KEY (vehicle_id)
    REFERENCES vehicles(id)
    ON DELETE CASCADE,
    
  -- Business rules
  CHECK (date <= CURRENT_DATE),
  CHECK (ABS(total_cost - (price_per_liter * liters)) < 0.01) -- Allow for rounding differences
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle_id ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_date ON fuel_records(date);
CREATE INDEX IF NOT EXISTS idx_fuel_records_km ON fuel_records(km);
CREATE INDEX IF NOT EXISTS idx_fuel_records_fuel_type ON fuel_records(fuel_type);
CREATE INDEX IF NOT EXISTS idx_fuel_records_is_full_tank ON fuel_records(is_full_tank);

-- Insert comments
COMMENT ON TABLE fuel_records IS 'Stores vehicle fuel/gas records for consumption tracking';
COMMENT ON COLUMN fuel_records.km IS 'Odometer reading at time of fueling';
COMMENT ON COLUMN fuel_records.liters IS 'Amount of fuel added';
COMMENT ON COLUMN fuel_records.price_per_liter IS 'Price per liter of fuel';
COMMENT ON COLUMN fuel_records.total_cost IS 'Total cost of fuel (liters * price_per_liter)';
COMMENT ON COLUMN fuel_records.fuel_type IS 'Type of fuel (gasoline, ethanol, diesel, etc.)';
COMMENT ON COLUMN fuel_records.is_full_tank IS 'Whether the tank was filled completely (for accurate consumption calculation)';
COMMENT ON COLUMN fuel_records.gas_station IS 'Name/location of the gas station';