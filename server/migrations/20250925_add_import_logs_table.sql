CREATE TABLE IF NOT EXISTS import_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT now(),
    origin TEXT,
    filename TEXT,
    status TEXT,
    report_number TEXT,
    error_message TEXT,
    processing_ms INTEGER
);

CREATE INDEX IF NOT EXISTS import_logs_status_idx ON import_logs (status);
CREATE INDEX IF NOT EXISTS import_logs_created_at_idx ON import_logs (created_at DESC);
