-- 0006_add_import_logs.sql
CREATE TABLE IF NOT EXISTS import_logs (
  id serial PRIMARY KEY,
  created_at timestamp DEFAULT now(),
  origin text,
  filename text,
  status text,
  report_number text,
  error_message text,
  processing_ms integer
);

CREATE INDEX IF NOT EXISTS import_logs_created_at_idx ON import_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS import_logs_status_idx ON import_logs(status);