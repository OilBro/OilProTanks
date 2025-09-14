-- Migration: Add performance indexes for inspection_reports filtering & sorting
-- Rationale: Common access pattern uses WHERE origin = ? ORDER BY updated_at DESC LIMIT/OFFSET
-- and status aggregations / filtering.

BEGIN;

-- Composite index to accelerate origin filter + recent ordering
CREATE INDEX IF NOT EXISTS idx_inspection_reports_origin_updated_at
  ON inspection_reports (origin, updated_at DESC);

-- Status filter (optional) for dashboards / stats grouping
CREATE INDEX IF NOT EXISTS idx_inspection_reports_status
  ON inspection_reports (status);

-- Updated_at standalone index (if future sorts without origin occur)
CREATE INDEX IF NOT EXISTS idx_inspection_reports_updated_at
  ON inspection_reports (updated_at DESC);

COMMIT;
