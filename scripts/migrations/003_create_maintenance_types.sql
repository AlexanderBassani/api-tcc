-- Migration: Create maintenance_types table
-- Created: 2025-11-24
-- Description: Auxiliary table to standardize maintenance types

-- Create maintenance_types table
CREATE TABLE IF NOT EXISTS maintenance_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  typical_interval_km INTEGER,
  typical_interval_months INTEGER,
  icon VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CHECK (typical_interval_km IS NULL OR typical_interval_km > 0),
  CHECK (typical_interval_months IS NULL OR typical_interval_months > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_types_name ON maintenance_types(name);

-- Insert pre-populated data
INSERT INTO maintenance_types (name, display_name, typical_interval_km, typical_interval_months, icon) VALUES
('troca_oleo', 'Troca de Óleo', 10000, 6, 'oil'),
('revisao', 'Revisão Geral', 10000, 12, 'wrench'),
('freios', 'Pastilhas de Freio', 40000, NULL, 'brake'),
('pneus', 'Rodízio de Pneus', 10000, NULL, 'tire'),
('alinhamento', 'Alinhamento e Balanceamento', 10000, NULL, 'alignment'),
('filtro_ar', 'Filtro de Ar', 15000, NULL, 'filter'),
('bateria', 'Bateria', NULL, 24, 'battery'),
('velas', 'Velas de Ignição', 30000, NULL, 'spark'),
('correia', 'Correia Dentada', 60000, NULL, 'belt'),
('amortecedor', 'Amortecedores', 80000, NULL, 'shock'),
('embreagem', 'Embreagem', 100000, NULL, 'clutch'),
('radiador', 'Radiador', NULL, 24, 'radiator'),
('ar_condicionado', 'Ar Condicionado', NULL, 12, 'ac'),
('escapamento', 'Escapamento', NULL, NULL, 'exhaust'),
('suspensao', 'Suspensão', 80000, NULL, 'suspension')
ON CONFLICT (name) DO NOTHING;

-- Insert comments
COMMENT ON TABLE maintenance_types IS 'Standardized maintenance types with suggested intervals';
COMMENT ON COLUMN maintenance_types.name IS 'Internal name for the maintenance type';
COMMENT ON COLUMN maintenance_types.display_name IS 'User-friendly display name';
COMMENT ON COLUMN maintenance_types.typical_interval_km IS 'Typical kilometer interval for this maintenance';
COMMENT ON COLUMN maintenance_types.typical_interval_months IS 'Typical month interval for this maintenance';
COMMENT ON COLUMN maintenance_types.icon IS 'Icon identifier for UI';