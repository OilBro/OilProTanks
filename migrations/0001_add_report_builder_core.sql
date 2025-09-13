-- Migration 0001: Add core Report Builder tables
-- NOTE: Adjust types/indexes as needed; id columns use SERIAL for simplicity.

BEGIN;

CREATE TABLE IF NOT EXISTS report_components (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES inspection_reports(id) ON DELETE CASCADE,
  component_code TEXT,             -- e.g. SHELL_CRS1, ROOF, BOTTOM, ANNULAR
  description TEXT,
  category TEXT,                   -- shell, bottom, roof, nozzle_support, internal, external
  nominal_thickness NUMERIC(10,3),
  original_thickness NUMERIC(10,3),
  actual_thickness NUMERIC(10,3),
  previous_thickness NUMERIC(10,3),
  corrosion_rate NUMERIC(10,4),
  remaining_life NUMERIC(10,2),
  status TEXT,                     -- acceptable, monitor, action_required
  position_ref TEXT,               -- optional location descriptor
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_nozzles (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES inspection_reports(id) ON DELETE CASCADE,
  nozzle_code TEXT,          -- N1, N2, MW24, etc.
  size TEXT,                 -- 2, 4, 6 ...
  service TEXT,
  location_tag TEXT,         -- A, B, C or custom
  nominal_thickness NUMERIC(10,3),
  original_thickness NUMERIC(10,3),
  actual_thickness NUMERIC(10,3),
  previous_thickness NUMERIC(10,3),
  corrosion_rate NUMERIC(10,4),
  remaining_life NUMERIC(10,2),
  practical_tmin NUMERIC(10,3),
  user_defined_tmin NUMERIC(10,3),
  status TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cml_points (
  id SERIAL PRIMARY KEY,
  parent_type TEXT NOT NULL,    -- component or nozzle
  parent_id INTEGER NOT NULL,   -- FK to report_components or report_nozzles (enforced app side)
  point_index INTEGER NOT NULL, -- 1..6 or 1..4
  reading NUMERIC(10,3),
  is_governing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cml_points_parent ON cml_points(parent_type, parent_id);

CREATE TABLE IF NOT EXISTS report_shell_courses (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES inspection_reports(id) ON DELETE CASCADE,
  course_number INTEGER,
  nominal_thickness NUMERIC(10,3),
  actual_thickness NUMERIC(10,3),
  height_ft NUMERIC(10,2),
  joint_efficiency NUMERIC(10,3),
  material_stress NUMERIC(10,0),
  fill_height_ft NUMERIC(10,2),
  calculated_tmin NUMERIC(10,3),
  alt_tmin NUMERIC(10,3),
  corrosion_rate NUMERIC(10,4),
  remaining_life NUMERIC(10,2),
  governing BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_appendices (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES inspection_reports(id) ON DELETE CASCADE,
  appendix_code TEXT,         -- A, B, C ... H
  applicable BOOLEAN DEFAULT TRUE,
  subject TEXT,
  body_text TEXT,
  sort_order INTEGER,
  locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_report_appendices_report ON report_appendices(report_id, appendix_code);

CREATE TABLE IF NOT EXISTS report_writeup (
  id SERIAL PRIMARY KEY,
  report_id INTEGER UNIQUE REFERENCES inspection_reports(id) ON DELETE CASCADE,
  executive_summary TEXT,
  ut_results_summary TEXT,
  recommendations_summary TEXT,
  next_internal_years INTEGER,
  next_external_years INTEGER,
  governing_component TEXT,
  frozen_cover_text BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_practical_tmin_overrides (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES inspection_reports(id) ON DELETE CASCADE,
  ref_type TEXT,              -- component or nozzle
  ref_code TEXT,              -- component_code or nozzle_code
  original_practical_tmin NUMERIC(10,3),
  override_tmin NUMERIC(10,3),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tmin_overrides_report ON report_practical_tmin_overrides(report_id, ref_type, ref_code);

COMMIT;
