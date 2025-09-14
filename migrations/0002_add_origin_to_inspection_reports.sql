-- Add origin column to inspection_reports to track creation source
ALTER TABLE inspection_reports ADD COLUMN IF NOT EXISTS origin TEXT;