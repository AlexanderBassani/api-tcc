-- Migration: Create reminders table
-- Created: 2025-11-24
-- Description: Table to store vehicle maintenance and service reminders

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL,
  
  -- Reminder details
  type VARCHAR(50) NOT NULL CHECK (type IN ('maintenance', 'insurance', 'license', 'inspection', 'tax', 'custom')),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Reminder triggers
  remind_at_km INTEGER CHECK (remind_at_km >= 0),
  remind_at_date DATE,
  
  -- Recurrence settings
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_km INTEGER CHECK (recurrence_km IS NULL OR recurrence_km > 0),
  recurrence_months INTEGER CHECK (recurrence_months IS NULL OR recurrence_months > 0),
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'completed', 'dismissed')),
  notified_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  CONSTRAINT fk_reminders_vehicle
    FOREIGN KEY (vehicle_id)
    REFERENCES vehicles(id)
    ON DELETE CASCADE,
    
  -- Business rules
  CHECK (remind_at_km IS NOT NULL OR remind_at_date IS NOT NULL), -- At least one trigger required
  CHECK (NOT is_recurring OR (recurrence_km IS NOT NULL OR recurrence_months IS NOT NULL)), -- Recurring reminders need interval
  CHECK (remind_at_date IS NULL OR remind_at_date >= CURRENT_DATE OR status != 'pending'), -- Future dates only for pending reminders
  CHECK (notified_at IS NULL OR status IN ('notified', 'completed', 'dismissed')),
  CHECK (completed_at IS NULL OR status = 'completed')
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_reminders_updated_at ON reminders;
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reminders_vehicle_id ON reminders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_type ON reminders(type);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at_date ON reminders(remind_at_date);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at_km ON reminders(remind_at_km);
CREATE INDEX IF NOT EXISTS idx_reminders_is_recurring ON reminders(is_recurring);

-- Create a composite index for efficient alert queries
CREATE INDEX IF NOT EXISTS idx_reminders_pending_alerts ON reminders(vehicle_id, status, remind_at_date, remind_at_km) 
WHERE status = 'pending';

-- Insert comments
COMMENT ON TABLE reminders IS 'Stores vehicle maintenance and service reminders with km/date triggers';
COMMENT ON COLUMN reminders.type IS 'Type of reminder (maintenance, insurance, license, etc.)';
COMMENT ON COLUMN reminders.remind_at_km IS 'Trigger reminder when vehicle reaches this odometer reading';
COMMENT ON COLUMN reminders.remind_at_date IS 'Trigger reminder on this date';
COMMENT ON COLUMN reminders.is_recurring IS 'Whether this reminder repeats automatically';
COMMENT ON COLUMN reminders.recurrence_km IS 'For recurring reminders, repeat every X kilometers';
COMMENT ON COLUMN reminders.recurrence_months IS 'For recurring reminders, repeat every X months';
COMMENT ON COLUMN reminders.status IS 'Current status of the reminder';
COMMENT ON COLUMN reminders.notified_at IS 'When the user was first notified about this reminder';
COMMENT ON COLUMN reminders.completed_at IS 'When the reminder was marked as completed';