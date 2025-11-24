-- Migration: Create sample data and initial configurations
-- Created: 2025-11-24
-- Description: Insert sample data for development and testing

-- Insert sample maintenance types if not already present
INSERT INTO maintenance_types (name, display_name, typical_interval_km, typical_interval_months, icon) VALUES
('injecao_eletronica', 'Injeção Eletrônica', 30000, NULL, 'engine'),
('cambio', 'Óleo do Câmbio', 50000, NULL, 'gearbox'),
('diferencial', 'Óleo do Diferencial', 60000, NULL, 'differential'),
('freio_estacionamento', 'Freio de Estacionamento', NULL, 12, 'handbrake'),
('limpador_parabrisa', 'Limpador de Para-brisa', NULL, 6, 'wiper'),
('farol', 'Lâmpadas dos Faróis', NULL, NULL, 'headlight'),
('documentacao', 'Renovação de Documentos', NULL, 12, 'document'),
('seguro', 'Renovação do Seguro', NULL, 12, 'insurance'),
('ipva', 'Pagamento do IPVA', NULL, 12, 'tax'),
('licenciamento', 'Licenciamento Anual', NULL, 12, 'license')
ON CONFLICT (name) DO NOTHING;

-- Function to create default reminders for new vehicles
CREATE OR REPLACE FUNCTION create_default_reminders_for_vehicle()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create reminders for active vehicles
  IF NEW.is_active = TRUE THEN
    
    -- Create default maintenance reminders based on maintenance_types
    INSERT INTO reminders (vehicle_id, type, title, description, remind_at_km, remind_at_date, is_recurring, recurrence_km, recurrence_months)
    SELECT 
      NEW.id,
      'maintenance',
      'Próxima ' || mt.display_name,
      'Lembrete automático baseado nos intervalos típicos de manutenção',
      CASE 
        WHEN mt.typical_interval_km IS NOT NULL 
        THEN NEW.current_km + mt.typical_interval_km 
        ELSE NULL 
      END,
      CASE 
        WHEN mt.typical_interval_months IS NOT NULL 
        THEN CURRENT_DATE + (mt.typical_interval_months || ' months')::INTERVAL 
        ELSE NULL 
      END,
      TRUE,
      mt.typical_interval_km,
      mt.typical_interval_months
    FROM maintenance_types mt
    WHERE mt.name IN ('troca_oleo', 'revisao', 'freios', 'filtro_ar')
    AND (mt.typical_interval_km IS NOT NULL OR mt.typical_interval_months IS NOT NULL);
    
    -- Create annual document reminders (starting from next year)
    INSERT INTO reminders (vehicle_id, type, title, description, remind_at_date, is_recurring, recurrence_months) VALUES
    (NEW.id, 'license', 'Renovar Licenciamento', 'Lembrete para renovação do licenciamento anual', 
     DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year 1 month', TRUE, 12),
    (NEW.id, 'tax', 'Pagamento do IPVA', 'Lembrete para pagamento do IPVA', 
     DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year 1 month', TRUE, 12),
    (NEW.id, 'inspection', 'Inspeção Veicular', 'Lembrete para inspeção veicular obrigatória', 
     DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year 6 months', TRUE, 12);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create default reminders for new vehicles
DROP TRIGGER IF EXISTS trigger_create_default_reminders ON vehicles;
CREATE TRIGGER trigger_create_default_reminders
  AFTER INSERT ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_reminders_for_vehicle();

-- Create a function to calculate vehicle age
CREATE OR REPLACE FUNCTION calculate_vehicle_age(purchase_date DATE, year INTEGER)
RETURNS TEXT AS $$
DECLARE
  age_years INTEGER;
  age_from_purchase INTEGER;
BEGIN
  -- Calculate age based on manufacturing year
  age_years := EXTRACT(YEAR FROM CURRENT_DATE) - year;
  
  -- Calculate age based on purchase date if available
  IF purchase_date IS NOT NULL THEN
    age_from_purchase := EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM purchase_date);
    RETURN age_from_purchase || ' anos (desde a compra)';
  ELSE
    RETURN age_years || ' anos (desde a fabricação)';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get next maintenance suggestion
CREATE OR REPLACE FUNCTION get_next_maintenance_suggestions(vehicle_id_param INTEGER)
RETURNS TABLE (
  maintenance_type VARCHAR(50),
  display_name VARCHAR(100),
  km_suggestion INTEGER,
  date_suggestion DATE,
  urgency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mt.name,
    mt.display_name,
    CASE 
      WHEN mt.typical_interval_km IS NOT NULL THEN
        -- Find last maintenance of this type and add interval
        COALESCE(
          (SELECT MAX(m.km_at_service) + mt.typical_interval_km 
           FROM maintenances m 
           WHERE m.vehicle_id = vehicle_id_param 
           AND m.type = mt.name),
          -- If no previous maintenance, use current km + interval
          (SELECT v.current_km + mt.typical_interval_km 
           FROM vehicles v 
           WHERE v.id = vehicle_id_param)
        )
      ELSE NULL
    END,
    CASE 
      WHEN mt.typical_interval_months IS NOT NULL THEN
        -- Find last maintenance of this type and add interval
        COALESCE(
          (SELECT MAX(m.service_date) + (mt.typical_interval_months || ' months')::INTERVAL 
           FROM maintenances m 
           WHERE m.vehicle_id = vehicle_id_param 
           AND m.type = mt.name),
          -- If no previous maintenance, use today + interval
          CURRENT_DATE + (mt.typical_interval_months || ' months')::INTERVAL
        )::DATE
      ELSE NULL
    END,
    CASE 
      WHEN mt.typical_interval_km IS NOT NULL THEN
        CASE 
          WHEN COALESCE(
            (SELECT MAX(m.km_at_service) + mt.typical_interval_km 
             FROM maintenances m 
             WHERE m.vehicle_id = vehicle_id_param 
             AND m.type = mt.name),
            (SELECT v.current_km + mt.typical_interval_km 
             FROM vehicles v 
             WHERE v.id = vehicle_id_param)
          ) <= (SELECT current_km FROM vehicles WHERE id = vehicle_id_param) THEN 'URGENTE'
          WHEN COALESCE(
            (SELECT MAX(m.km_at_service) + mt.typical_interval_km 
             FROM maintenances m 
             WHERE m.vehicle_id = vehicle_id_param 
             AND m.type = mt.name),
            (SELECT v.current_km + mt.typical_interval_km 
             FROM vehicles v 
             WHERE v.id = vehicle_id_param)
          ) <= (SELECT current_km + 1000 FROM vehicles WHERE id = vehicle_id_param) THEN 'EM BREVE'
          ELSE 'FUTURO'
        END
      WHEN mt.typical_interval_months IS NOT NULL THEN
        CASE 
          WHEN COALESCE(
            (SELECT MAX(m.service_date) + (mt.typical_interval_months || ' months')::INTERVAL 
             FROM maintenances m 
             WHERE m.vehicle_id = vehicle_id_param 
             AND m.type = mt.name),
            CURRENT_DATE + (mt.typical_interval_months || ' months')::INTERVAL
          ) <= CURRENT_DATE THEN 'URGENTE'
          WHEN COALESCE(
            (SELECT MAX(m.service_date) + (mt.typical_interval_months || ' months')::INTERVAL 
             FROM maintenances m 
             WHERE m.vehicle_id = vehicle_id_param 
             AND m.type = mt.name),
            CURRENT_DATE + (mt.typical_interval_months || ' months')::INTERVAL
          ) <= CURRENT_DATE + INTERVAL '30 days' THEN 'EM BREVE'
          ELSE 'FUTURO'
        END
      ELSE 'INDEFINIDO'
    END
  FROM maintenance_types mt
  WHERE mt.typical_interval_km IS NOT NULL 
     OR mt.typical_interval_months IS NOT NULL
  ORDER BY 
    CASE 
      WHEN COALESCE(
        (SELECT MAX(m.service_date) 
         FROM maintenances m 
         WHERE m.vehicle_id = vehicle_id_param 
         AND m.type = mt.name),
        '1900-01-01'::DATE
      ) < CURRENT_DATE - (COALESCE(mt.typical_interval_months, 12) || ' months')::INTERVAL THEN 0
      ELSE 1
    END,
    mt.typical_interval_km NULLS LAST,
    mt.typical_interval_months NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Insert comments for new functions
COMMENT ON FUNCTION create_default_reminders_for_vehicle() IS 'Automatically creates default maintenance and document reminders for new vehicles';
COMMENT ON FUNCTION calculate_vehicle_age(DATE, INTEGER) IS 'Calculates vehicle age based on purchase date or manufacturing year';
COMMENT ON FUNCTION get_next_maintenance_suggestions(INTEGER) IS 'Returns maintenance suggestions with urgency based on vehicle history';