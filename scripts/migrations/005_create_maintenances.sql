-- Migration: Create maintenances table
-- Created: 2025-11-24
-- Description: Table to store vehicle maintenance records

-- Create maintenances table
CREATE TABLE IF NOT EXISTS maintenances (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL,
  service_provider_id INTEGER, -- nullable (can be DIY)
  
  -- Maintenance details
  type VARCHAR(50) NOT NULL,
  description TEXT,
  cost DECIMAL(10,2) DEFAULT 0.00 CHECK (cost >= 0),
  
  -- Service information
  km_at_service INTEGER CHECK (km_at_service >= 0),
  service_date DATE NOT NULL,
  next_service_km INTEGER CHECK (next_service_km >= 0),
  next_service_date DATE,
  
  -- Documentation
  invoice_number VARCHAR(50),
  warranty_until DATE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_maintenances_vehicle
    FOREIGN KEY (vehicle_id)
    REFERENCES vehicles(id)
    ON DELETE CASCADE,
    
  CONSTRAINT fk_maintenances_service_provider
    FOREIGN KEY (service_provider_id)
    REFERENCES service_providers(id)
    ON DELETE SET NULL,
    
  -- Business rules
  CHECK (service_date <= CURRENT_DATE),
  CHECK (next_service_date IS NULL OR next_service_date > service_date),
  CHECK (next_service_km IS NULL OR km_at_service IS NULL OR next_service_km > km_at_service),
  CHECK (warranty_until IS NULL OR warranty_until >= service_date)
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_maintenances_updated_at ON maintenances;
CREATE TRIGGER update_maintenances_updated_at
  BEFORE UPDATE ON maintenances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_maintenances_vehicle_id ON maintenances(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_service_provider_id ON maintenances(service_provider_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_service_date ON maintenances(service_date);
CREATE INDEX IF NOT EXISTS idx_maintenances_type ON maintenances(type);
CREATE INDEX IF NOT EXISTS idx_maintenances_next_service_date ON maintenances(next_service_date);

-- Insert comments
COMMENT ON TABLE maintenances IS 'Stores vehicle maintenance records';
COMMENT ON COLUMN maintenances.type IS 'Type of maintenance performed';
COMMENT ON COLUMN maintenances.km_at_service IS 'Odometer reading at the time of service';
COMMENT ON COLUMN maintenances.next_service_km IS 'Recommended odometer reading for next service';
COMMENT ON COLUMN maintenances.next_service_date IS 'Recommended date for next service';
COMMENT ON COLUMN maintenances.warranty_until IS 'Warranty expiration date for this service';