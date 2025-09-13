-- Migration: add extended report domain tables
-- Date: 2025-09-13

CREATE TABLE IF NOT EXISTS report_components (
  id SERIAL PRIMARY KEY,
  report_id INTEGER,
  component_id TEXT,
  description TEXT,
  component_type TEXT,
  nominal_thickness NUMERIC(10,3),
  actual_thickness NUMERIC(10,3),
  previous_thickness NUMERIC(10,3),
  corrosion_rate NUMERIC(10,4),
  remaining_life NUMERIC(10,2),
  governing BOOLEAN,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS report_nozzles (
  id SERIAL PRIMARY KEY,
  report_id INTEGER,
  nozzle_tag TEXT,
  size TEXT,
  service TEXT,
  elevation TEXT,
  orientation TEXT,
  nominal_thickness NUMERIC(10,3),
  actual_thickness NUMERIC(10,3),
  previous_thickness NUMERIC(10,3),
  corrosion_rate NUMERIC(10,4),
  remaining_life NUMERIC(10,2),
  tmin_practical NUMERIC(10,3),
  tmin_user NUMERIC(10,3),
  status TEXT,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS cml_points (
  id SERIAL PRIMARY KEY,
  report_id INTEGER,
  parent_type TEXT,
  parent_id INTEGER,
  cml_number INTEGER,
  point_1 NUMERIC(10,3),
  point_2 NUMERIC(10,3),
  point_3 NUMERIC(10,3),
  point_4 NUMERIC(10,3),
  point_5 NUMERIC(10,3),
  point_6 NUMERIC(10,3),
  governing_point NUMERIC(10,3),
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS report_shell_courses (
  id SERIAL PRIMARY KEY,
  report_id INTEGER,
  course_number INTEGER,
  course_height NUMERIC(10,3),
  nominal_thickness NUMERIC(10,3),
  actual_thickness NUMERIC(10,3),
  previous_thickness NUMERIC(10,3),
  corrosion_rate NUMERIC(10,4),
  remaining_life NUMERIC(10,2),
  joint_efficiency NUMERIC(5,3),
  stress NUMERIC(10,0),
  alt_stress NUMERIC(10,0),
  tmin_calc NUMERIC(10,3),
  tmin_alt NUMERIC(10,3),
  fill_height NUMERIC(10,3),
  governing BOOLEAN,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS report_appendices (
  id SERIAL PRIMARY KEY,
  report_id INTEGER,
  appendix_code TEXT,
  subject TEXT,
  default_text TEXT,
  user_text TEXT,
  applicable BOOLEAN,
  order_index INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS report_writeup (
  id SERIAL PRIMARY KEY,
  report_id INTEGER,
  executive_summary TEXT,
  ut_results_summary TEXT,
  recommendations_summary TEXT,
  next_internal_years INTEGER,
  next_external_years INTEGER,
  governing_component TEXT,
  frozen_narrative BOOLEAN,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS report_practical_tmin_overrides (
  id SERIAL PRIMARY KEY,
  report_id INTEGER,
  reference_type TEXT,
  reference_id TEXT,
  default_tmin NUMERIC(10,3),
  override_tmin NUMERIC(10,3),
  reason TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_components_report_id ON report_components(report_id);
CREATE INDEX IF NOT EXISTS idx_report_nozzles_report_id ON report_nozzles(report_id);
CREATE INDEX IF NOT EXISTS idx_cml_points_report_id ON cml_points(report_id);
CREATE INDEX IF NOT EXISTS idx_report_shell_courses_report_id ON report_shell_courses(report_id);
CREATE INDEX IF NOT EXISTS idx_report_appendices_report_id ON report_appendices(report_id);
CREATE INDEX IF NOT EXISTS idx_report_writeup_report_id ON report_writeup(report_id);
CREATE INDEX IF NOT EXISTS idx_report_practical_tmin_overrides_report_id ON report_practical_tmin_overrides(report_id);
