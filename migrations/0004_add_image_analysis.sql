-- 0004_add_image_analysis.sql
-- Image analysis tables for AI-driven defect detection scaffold

CREATE TABLE IF NOT EXISTS image_analyses (
  id SERIAL PRIMARY KEY,
  attachment_id INTEGER,
  report_id INTEGER,
  status TEXT, -- queued, processing, completed, failed
  model_version TEXT,
  summary JSONB,
  error TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS image_labels (
  id SERIAL PRIMARY KEY,
  analysis_id INTEGER,
  label TEXT,
  confidence NUMERIC(5,4), -- 0-1
  category TEXT, -- defect, component, metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS image_regions (
  id SERIAL PRIMARY KEY,
  analysis_id INTEGER,
  label TEXT,
  confidence NUMERIC(5,4),
  x NUMERIC(10,4),
  y NUMERIC(10,4),
  width NUMERIC(10,4),
  height NUMERIC(10,4),
  polygon JSONB,
  defect_severity TEXT, -- info, minor, moderate, major, critical
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes to accelerate lookups
CREATE INDEX IF NOT EXISTS idx_image_analyses_attachment ON image_analyses(attachment_id);
CREATE INDEX IF NOT EXISTS idx_image_analyses_report ON image_analyses(report_id);
CREATE INDEX IF NOT EXISTS idx_image_analyses_status ON image_analyses(status);
CREATE INDEX IF NOT EXISTS idx_image_labels_analysis ON image_labels(analysis_id);
CREATE INDEX IF NOT EXISTS idx_image_regions_analysis ON image_regions(analysis_id);
