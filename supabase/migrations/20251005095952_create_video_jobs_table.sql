-- Create extension for UUID generation (if not exists)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create video generation jobs table
CREATE TABLE IF NOT EXISTS video_generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NULL,

  prompt TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  color_count INTEGER NOT NULL,
  fps INTEGER NOT NULL CHECK (fps IN (12, 24, 30)),
  duration NUMERIC NOT NULL DEFAULT 5.0,

  luma_generation_id TEXT NULL,
  luma_video_url TEXT NULL,

  status TEXT NOT NULL CHECK (status IN (
    'pending', 'queued', 'dreaming', 'processing', 'completed', 'failed'
  )) DEFAULT 'pending',

  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  progress_message TEXT NULL,

  error_code TEXT NULL,
  error_message TEXT NULL,
  error_details JSONB NULL,

  total_frames INTEGER NULL,
  frame_storage_urls TEXT[] NULL,
  frame_data JSONB NULL,

  processing_time_ms INTEGER NULL,
  luma_processing_time_ms INTEGER NULL,
  frame_processing_time_ms INTEGER NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_video_jobs_user_id
  ON video_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status
  ON video_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_luma_id
  ON video_generation_jobs(luma_generation_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_created
  ON video_generation_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE video_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own video jobs"
  ON video_generation_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own video jobs"
  ON video_generation_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update video jobs"
  ON video_generation_jobs
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_video_jobs_updated_at
  BEFORE UPDATE ON video_generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
