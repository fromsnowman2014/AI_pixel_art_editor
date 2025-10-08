-- Enable RLS on all public tables and create appropriate policies
-- This migration fixes the Security Advisor warnings
-- Fixed: Correct type casting for TEXT user_id columns

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
CREATE POLICY "Service role can manage accounts" ON public.accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Sessions: Only service role can access
CREATE POLICY "Service role can manage sessions" ON public.sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users: Only service role can access
CREATE POLICY "Service role can manage users" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verification Tokens: Only service role can access
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
CREATE POLICY "Service role can manage User" ON public."User"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drizzle Account: Service role only
CREATE POLICY "Service role can manage Account" ON public."Account"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drizzle Session: Service role only
CREATE POLICY "Service role can manage Session" ON public."Session"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drizzle VerificationToken: Service role only
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
-- Note: user_id is TEXT, so we cast auth.uid() to text
CREATE POLICY "Users can view their own saved projects" ON public.saved_projects
  FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own saved projects" ON public.saved_projects
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own saved projects" ON public.saved_projects
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own saved projects" ON public.saved_projects
  FOR DELETE
  USING (user_id = auth.uid()::text);

-- Projects: Users can access their own projects
CREATE POLICY "Users can view their own projects" ON public.projects
  FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own projects" ON public.projects
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own projects" ON public.projects
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own projects" ON public.projects
  FOR DELETE
  USING (user_id = auth.uid()::text);

-- User Profiles: Users can view all profiles but only edit their own
CREATE POLICY "Anyone can view user profiles" ON public.user_profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Assets: Users can access their own assets
CREATE POLICY "Users can view their own assets" ON public.assets
  FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own assets" ON public.assets
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own assets" ON public.assets
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own assets" ON public.assets
  FOR DELETE
  USING (user_id = auth.uid()::text);

-- Analytics: Users can only insert analytics (append-only)
CREATE POLICY "Users can insert analytics" ON public.analytics
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

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
CREATE POLICY "Users can view their own video jobs" ON public.video_generation_jobs
  FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own video jobs" ON public.video_generation_jobs
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Service role can manage all video jobs" ON public.video_generation_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow webhook updates (called by Edge Function with service role key)
CREATE POLICY "Service role can update video jobs" ON public.video_generation_jobs
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
