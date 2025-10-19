-- Fix video_generation_jobs.project_id to support both UUID and TEXT tab IDs
-- This allows the table to accept both:
-- 1. Real project UUIDs from saved projects
-- 2. Local tab IDs like "tab-1759902384467"

-- Drop existing foreign key constraint if it exists
ALTER TABLE video_generation_jobs
  DROP CONSTRAINT IF EXISTS video_generation_jobs_project_id_fkey;

-- Change project_id from UUID to TEXT
ALTER TABLE video_generation_jobs
  ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;

-- Add a comment to document the change
COMMENT ON COLUMN video_generation_jobs.project_id IS
  'Project identifier - can be either a saved project UUID or a local tab ID (e.g., "tab-1234567890")';

-- Recreate index with TEXT type
DROP INDEX IF EXISTS idx_video_jobs_project_id;
CREATE INDEX idx_video_jobs_project_id ON video_generation_jobs(project_id);

-- Update RLS policies to use TEXT comparison
-- No changes needed since we're already casting to TEXT in the existing policies
