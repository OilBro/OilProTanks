-- 0005_add_image_analysis_fks.sql
-- Add foreign key constraints now that lifecycle considered stable
-- (Note: Existing rows must already comply; if not, adjust or clean before applying.)

ALTER TABLE image_analyses
  ADD CONSTRAINT fk_image_analyses_attachment
    FOREIGN KEY (attachment_id) REFERENCES report_attachments(id)
    ON DELETE CASCADE;

ALTER TABLE image_analyses
  ADD CONSTRAINT fk_image_analyses_report
    FOREIGN KEY (report_id) REFERENCES inspection_reports(id)
    ON DELETE CASCADE;

ALTER TABLE image_labels
  ADD CONSTRAINT fk_image_labels_analysis
    FOREIGN KEY (analysis_id) REFERENCES image_analyses(id)
    ON DELETE CASCADE;

ALTER TABLE image_regions
  ADD CONSTRAINT fk_image_regions_analysis
    FOREIGN KEY (analysis_id) REFERENCES image_analyses(id)
    ON DELETE CASCADE;

-- Helpful composite index combining attachment + status for queued processing funnels
CREATE INDEX IF NOT EXISTS idx_image_analyses_attachment_status ON image_analyses(attachment_id, status);
