-- Migration: Create utility functions and triggers
-- Created: 2025-11-24
-- Description: Create utility functions for vehicle maintenance system

-- Function to automatically update vehicle current_km when fuel record is added
CREATE OR REPLACE FUNCTION update_vehicle_current_km()
RETURNS TRIGGER AS $$
BEGIN
  -- Update vehicle current_km if the new fuel record has higher km
  UPDATE vehicles 
  SET current_km = GREATEST(current_km, NEW.km),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.vehicle_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update vehicle current_km when maintenance record is added
CREATE OR REPLACE FUNCTION update_vehicle_current_km_from_maintenance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update vehicle current_km if the new maintenance record has higher km
  IF NEW.km_at_service IS NOT NULL THEN
    UPDATE vehicles 
    SET current_km = GREATEST(current_km, NEW.km_at_service),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.vehicle_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create recurring reminders when one is completed
CREATE OR REPLACE FUNCTION create_recurring_reminder()
RETURNS TRIGGER AS $$
DECLARE
  vehicle_current_km INTEGER;
  new_remind_km INTEGER;
  new_remind_date DATE;
BEGIN
  -- Only process if status changed to 'completed' and reminder is recurring
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.is_recurring = TRUE THEN
    
    -- Get current vehicle km
    SELECT current_km INTO vehicle_current_km 
    FROM vehicles 
    WHERE id = NEW.vehicle_id;
    
    -- Calculate new reminder triggers
    new_remind_km := NULL;
    new_remind_date := NULL;
    
    IF NEW.recurrence_km IS NOT NULL THEN
      new_remind_km := COALESCE(vehicle_current_km, 0) + NEW.recurrence_km;
    END IF;
    
    IF NEW.recurrence_months IS NOT NULL THEN
      new_remind_date := CURRENT_DATE + (NEW.recurrence_months || ' months')::INTERVAL;
    END IF;
    
    -- Create new recurring reminder
    INSERT INTO reminders (
      vehicle_id,
      type,
      title,
      description,
      remind_at_km,
      remind_at_date,
      is_recurring,
      recurrence_km,
      recurrence_months,
      status
    ) VALUES (
      NEW.vehicle_id,
      NEW.type,
      NEW.title,
      NEW.description,
      new_remind_km,
      new_remind_date,
      NEW.is_recurring,
      NEW.recurrence_km,
      NEW.recurrence_months,
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate km sequence in fuel records
CREATE OR REPLACE FUNCTION validate_fuel_km_sequence()
RETURNS TRIGGER AS $$
DECLARE
  last_km INTEGER;
BEGIN
  -- Get the latest km for this vehicle (excluding current record if updating)
  SELECT MAX(km) INTO last_km
  FROM fuel_records 
  WHERE vehicle_id = NEW.vehicle_id 
    AND (TG_OP = 'INSERT' OR id != NEW.id);
  
  -- Allow if no previous records or if km is greater or equal to last (allow same km for corrections)
  IF last_km IS NULL OR NEW.km >= last_km THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Fuel record km (%) cannot be less than the latest km (%) for this vehicle', NEW.km, last_km;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers

-- Trigger to update vehicle current_km from fuel records
DROP TRIGGER IF EXISTS trigger_update_vehicle_km_fuel ON fuel_records;
CREATE TRIGGER trigger_update_vehicle_km_fuel
  AFTER INSERT OR UPDATE ON fuel_records
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_current_km();

-- Trigger to update vehicle current_km from maintenance records
DROP TRIGGER IF EXISTS trigger_update_vehicle_km_maintenance ON maintenances;
CREATE TRIGGER trigger_update_vehicle_km_maintenance
  AFTER INSERT OR UPDATE ON maintenances
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_current_km_from_maintenance();

-- Trigger to create recurring reminders
DROP TRIGGER IF EXISTS trigger_create_recurring_reminder ON reminders;
CREATE TRIGGER trigger_create_recurring_reminder
  AFTER UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION create_recurring_reminder();

-- Trigger to validate fuel record km sequence
DROP TRIGGER IF EXISTS trigger_validate_fuel_km_sequence ON fuel_records;
CREATE TRIGGER trigger_validate_fuel_km_sequence
  BEFORE INSERT OR UPDATE ON fuel_records
  FOR EACH ROW
  EXECUTE FUNCTION validate_fuel_km_sequence();

-- Create a view for pending alerts (reminders that should be shown to user)
CREATE OR REPLACE VIEW pending_reminders AS
SELECT 
  r.*,
  v.brand,
  v.model,
  v.plate,
  v.current_km,
  v.user_id,
  CASE 
    WHEN r.remind_at_km IS NOT NULL AND r.remind_at_km <= v.current_km THEN TRUE
    WHEN r.remind_at_date IS NOT NULL AND r.remind_at_date <= CURRENT_DATE THEN TRUE
    ELSE FALSE
  END AS should_notify,
  CASE
    WHEN r.remind_at_km IS NOT NULL THEN (r.remind_at_km - v.current_km)
    ELSE NULL
  END AS km_until_due,
  CASE
    WHEN r.remind_at_date IS NOT NULL THEN (r.remind_at_date - CURRENT_DATE)
    ELSE NULL
  END AS days_until_due
FROM reminders r
JOIN vehicles v ON r.vehicle_id = v.id
WHERE r.status = 'pending'
  AND v.is_active = TRUE;

-- Create a view for vehicle statistics
CREATE OR REPLACE VIEW vehicle_statistics AS
SELECT 
  v.id,
  v.user_id,
  v.brand,
  v.model,
  v.plate,
  v.current_km,
  v.purchase_date,
  
  -- Maintenance statistics
  COUNT(DISTINCT m.id) as total_maintenances,
  COALESCE(SUM(m.cost), 0) as total_maintenance_cost,
  MAX(m.service_date) as last_maintenance_date,
  
  -- Fuel statistics
  COUNT(DISTINCT f.id) as total_fuel_records,
  COALESCE(SUM(f.total_cost), 0) as total_fuel_cost,
  COALESCE(SUM(f.liters), 0) as total_liters,
  MAX(f.date) as last_fuel_date,
  
  -- Average consumption (calculated separately)
  (
    SELECT 
      CASE 
        WHEN COUNT(*) > 1 THEN
          ROUND(
            (MAX(km) - MIN(km))::NUMERIC / 
            NULLIF(SUM(liters), 0)
          , 2)
        ELSE NULL
      END
    FROM fuel_records f_sub
    WHERE f_sub.vehicle_id = v.id 
      AND f_sub.is_full_tank = TRUE
  ) as avg_consumption_kml,
  
  -- Reminders count
  COUNT(DISTINCT CASE WHEN r.status = 'pending' THEN r.id END) as pending_reminders,
  
  -- Total cost
  COALESCE(SUM(m.cost), 0) + COALESCE(SUM(f.total_cost), 0) as total_cost
  
FROM vehicles v
LEFT JOIN maintenances m ON v.id = m.vehicle_id
LEFT JOIN fuel_records f ON v.id = f.vehicle_id
LEFT JOIN reminders r ON v.id = r.vehicle_id
WHERE v.is_active = TRUE
GROUP BY v.id, v.user_id, v.brand, v.model, v.plate, v.current_km, v.purchase_date;

-- Insert comments
COMMENT ON FUNCTION update_vehicle_current_km() IS 'Automatically updates vehicle current_km when fuel records are added/updated';
COMMENT ON FUNCTION update_vehicle_current_km_from_maintenance() IS 'Automatically updates vehicle current_km when maintenance records are added/updated';
COMMENT ON FUNCTION create_recurring_reminder() IS 'Creates new recurring reminders when the previous one is completed';
COMMENT ON FUNCTION validate_fuel_km_sequence() IS 'Validates that fuel record km values are in ascending order';
COMMENT ON VIEW pending_reminders IS 'Shows all pending reminders with alert status and due calculations';
COMMENT ON VIEW vehicle_statistics IS 'Provides comprehensive statistics for each vehicle including costs and consumption';