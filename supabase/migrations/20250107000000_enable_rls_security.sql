-- Enable RLS on all public tables and create appropriate policies
-- This migration fixes the Security Advisor warnings
-- Fixed: Handle both TEXT and UUID user_id columns safely

-- ============================================
-- 1. NextAuth Tables (read-only for service role)
-- ============================================

-- Enable RLS on NextAuth tables
ALTER TABLE IF EXISTS public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.verification_tokens ENABLE ROW LEVEL SECURITY;

-- NextAuth tables should only be accessible by the service role
-- Users should not directly access these tables

-- Accounts: Only service role can access
DROP POLICY IF EXISTS "Service role can manage accounts" ON public.accounts;
CREATE POLICY "Service role can manage accounts" ON public.accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Sessions: Only service role can access
DROP POLICY IF EXISTS "Service role can manage sessions" ON public.sessions;
CREATE POLICY "Service role can manage sessions" ON public.sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users: Only service role can access
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
CREATE POLICY "Service role can manage users" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verification Tokens: Only service role can access
DROP POLICY IF EXISTS "Service role can manage verification tokens" ON public.verification_tokens;
CREATE POLICY "Service role can manage verification tokens" ON public.verification_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. Drizzle Tables (if they exist)
-- ============================================

-- Enable RLS on Drizzle tables if they exist
ALTER TABLE IF EXISTS public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."VerificationToken" ENABLE ROW LEVEL SECURITY;

-- Drizzle User: Service role only
DROP POLICY IF EXISTS "Service role can manage User" ON public."User";
CREATE POLICY "Service role can manage User" ON public."User"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drizzle Account: Service role only
DROP POLICY IF EXISTS "Service role can manage Account" ON public."Account";
CREATE POLICY "Service role can manage Account" ON public."Account"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drizzle Session: Service role only
DROP POLICY IF EXISTS "Service role can manage Session" ON public."Session";
CREATE POLICY "Service role can manage Session" ON public."Session"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drizzle VerificationToken: Service role only
DROP POLICY IF EXISTS "Service role can manage VerificationToken" ON public."VerificationToken";
CREATE POLICY "Service role can manage VerificationToken" ON public."VerificationToken"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. Application Tables
-- ============================================

-- Enable RLS on application tables
ALTER TABLE IF EXISTS public.saved_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics ENABLE ROW LEVEL SECURITY;

-- Saved Projects: Users can only access their own projects
-- Handle both TEXT and UUID user_id types
DROP POLICY IF EXISTS "Users can view their own saved projects" ON public.saved_projects;
CREATE POLICY "Users can view their own saved projects" ON public.saved_projects
  FOR SELECT
  USING (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

DROP POLICY IF EXISTS "Users can insert their own saved projects" ON public.saved_projects;
CREATE POLICY "Users can insert their own saved projects" ON public.saved_projects
  FOR INSERT
  WITH CHECK (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

DROP POLICY IF EXISTS "Users can update their own saved projects" ON public.saved_projects;
CREATE POLICY "Users can update their own saved projects" ON public.saved_projects
  FOR UPDATE
  USING (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  )
  WITH CHECK (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

DROP POLICY IF EXISTS "Users can delete their own saved projects" ON public.saved_projects;
CREATE POLICY "Users can delete their own saved projects" ON public.saved_projects
  FOR DELETE
  USING (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

-- Projects: Users can access their own projects
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own projects" ON public.projects
  FOR SELECT
  USING (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
CREATE POLICY "Users can insert their own projects" ON public.projects
  FOR INSERT
  WITH CHECK (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects" ON public.projects
  FOR UPDATE
  USING (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  )
  WITH CHECK (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can delete their own projects" ON public.projects
  FOR DELETE
  USING (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

-- User Profiles: Users can view all profiles but only edit their own
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.user_profiles;
CREATE POLICY "Anyone can view user profiles" ON public.user_profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE
  USING (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  )
  WITH CHECK (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

-- Assets: Users can access their own assets
DROP POLICY IF EXISTS "Users can view their own assets" ON public.assets;
CREATE POLICY "Users can view their own assets" ON public.assets
  FOR SELECT
  USING (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

DROP POLICY IF EXISTS "Users can insert their own assets" ON public.assets;
CREATE POLICY "Users can insert their own assets" ON public.assets
  FOR INSERT
  WITH CHECK (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

DROP POLICY IF EXISTS "Users can update their own assets" ON public.assets;
CREATE POLICY "Users can update their own assets" ON public.assets
  FOR UPDATE
  USING (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  )
  WITH CHECK (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

DROP POLICY IF EXISTS "Users can delete their own assets" ON public.assets;
CREATE POLICY "Users can delete their own assets" ON public.assets
  FOR DELETE
  USING (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

-- Analytics: Users can only insert analytics (append-only)
DROP POLICY IF EXISTS "Users can insert analytics" ON public.analytics;
CREATE POLICY "Users can insert analytics" ON public.analytics
  FOR INSERT
  WITH CHECK (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

DROP POLICY IF EXISTS "Service role can view all analytics" ON public.analytics;
CREATE POLICY "Service role can view all analytics" ON public.analytics
  FOR SELECT
  TO service_role
  USING (true);

-- ============================================
-- 4. Video Generation Jobs (if exists)
-- ============================================

-- Enable RLS on video generation jobs if the table exists
ALTER TABLE IF EXISTS public.video_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own video generation jobs
DROP POLICY IF EXISTS "Users can view their own video jobs" ON public.video_generation_jobs;
CREATE POLICY "Users can view their own video jobs" ON public.video_generation_jobs
  FOR SELECT
  USING (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

DROP POLICY IF EXISTS "Users can insert their own video jobs" ON public.video_generation_jobs;
CREATE POLICY "Users can insert their own video jobs" ON public.video_generation_jobs
  FOR INSERT
  WITH CHECK (
    CASE
      WHEN pg_typeof(user_id) = 'text'::regtype THEN user_id = auth.uid()::text
      ELSE user_id::text = auth.uid()::text
    END
  );

DROP POLICY IF EXISTS "Service role can manage all video jobs" ON public.video_generation_jobs;
CREATE POLICY "Service role can manage all video jobs" ON public.video_generation_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update video jobs" ON public.video_generation_jobs;
CREATE POLICY "Service role can update video jobs" ON public.video_generation_jobs
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
