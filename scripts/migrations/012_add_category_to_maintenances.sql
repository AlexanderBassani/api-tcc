-- Migration: Add category field to maintenances table
-- Created: 2025-12-17
-- Description: Adds category field to classify maintenances (preventive, corrective, inspection, etc)

-- Add category column with default value
ALTER TABLE maintenances
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'other';

-- Update category to NOT NULL after adding default
ALTER TABLE maintenances
ALTER COLUMN category SET NOT NULL;

-- Add check constraint for valid categories
ALTER TABLE maintenances
ADD CONSTRAINT chk_maintenance_category
CHECK (category IN (
  'preventive',    -- Manutenção preventiva (troca de óleo, filtros, etc)
  'corrective',    -- Manutenção corretiva (conserto de defeitos)
  'inspection',    -- Inspeção/Revisão programada
  'upgrade',       -- Melhoria/Upgrade (instalação de acessórios, etc)
  'warranty',      -- Manutenção em garantia
  'recall',        -- Recall do fabricante
  'other'          -- Outras manutenções
));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_maintenances_category ON maintenances(category);

-- Add comments
COMMENT ON COLUMN maintenances.category IS 'Category of maintenance: preventive, corrective, inspection, upgrade, warranty, recall, or other';

-- Update existing records to have a default category
-- You may want to update this based on your business logic
UPDATE maintenances
SET category = 'other'
WHERE category IS NULL;
