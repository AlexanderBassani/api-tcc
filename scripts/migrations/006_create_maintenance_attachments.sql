-- Migration: Create maintenance_attachments table
-- Created: 2025-11-24
-- Description: Table to store file attachments for maintenance records

-- Create maintenance_attachments table
CREATE TABLE IF NOT EXISTS maintenance_attachments (
  id SERIAL PRIMARY KEY,
  maintenance_id INTEGER NOT NULL,
  
  -- File details
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'image/heic')),
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  
  -- Metadata
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  CONSTRAINT fk_maintenance_attachments_maintenance
    FOREIGN KEY (maintenance_id)
    REFERENCES maintenances(id)
    ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_attachments_maintenance_id ON maintenance_attachments(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_attachments_file_type ON maintenance_attachments(file_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_attachments_uploaded_at ON maintenance_attachments(uploaded_at);

-- Insert comments
COMMENT ON TABLE maintenance_attachments IS 'Stores file attachments (photos, invoices, receipts) for maintenance records';
COMMENT ON COLUMN maintenance_attachments.file_name IS 'Original filename';
COMMENT ON COLUMN maintenance_attachments.file_path IS 'Storage path for the file';
COMMENT ON COLUMN maintenance_attachments.file_type IS 'MIME type of the file';
COMMENT ON COLUMN maintenance_attachments.file_size IS 'File size in bytes';