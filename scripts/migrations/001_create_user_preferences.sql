-- Migration: Create user_preferences table
-- Created: 2025-10-14
-- Description: Table to store user interface preferences including theme settings

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,

  -- Theme settings
  theme_mode VARCHAR(20) DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'system')),
  theme_color VARCHAR(30) DEFAULT 'blue',

  -- Additional UI preferences
  font_size VARCHAR(20) DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large', 'extra-large')),
  compact_mode BOOLEAN DEFAULT FALSE,
  animations_enabled BOOLEAN DEFAULT TRUE,

  -- Accessibility
  high_contrast BOOLEAN DEFAULT FALSE,
  reduce_motion BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraint
  CONSTRAINT fk_user_preferences_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_theme_mode ON user_preferences(theme_mode);

-- Insert comment on table
COMMENT ON TABLE user_preferences IS 'Stores user interface and theme preferences';
COMMENT ON COLUMN user_preferences.theme_mode IS 'Theme mode: light, dark, or system (follows OS preference)';
COMMENT ON COLUMN user_preferences.theme_color IS 'Primary theme color/accent color';
COMMENT ON COLUMN user_preferences.font_size IS 'Font size preference for UI';
COMMENT ON COLUMN user_preferences.compact_mode IS 'Enable compact/dense UI mode';
COMMENT ON COLUMN user_preferences.animations_enabled IS 'Enable/disable UI animations';
COMMENT ON COLUMN user_preferences.high_contrast IS 'Enable high contrast mode for better visibility';
COMMENT ON COLUMN user_preferences.reduce_motion IS 'Reduce animations for motion sensitivity';
