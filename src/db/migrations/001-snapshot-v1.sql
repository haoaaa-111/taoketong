-- Migration 001: Snapshot v1 schema upgrade
-- Adds snapshot_version column, prepares for v1 data structure

ALTER TABLE course_memory ADD COLUMN snapshot_version INTEGER DEFAULT 1;

-- Update existing records
UPDATE course_memory SET snapshot_version = 1;

-- Create index on snapshot_version for efficient queries
CREATE INDEX IF NOT EXISTS idx_course_memory_snapshot_version
    ON course_memory(snapshot_version);
