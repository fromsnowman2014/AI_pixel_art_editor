# Video Generation Bug Fix Guide

## 🐛 Problem

When trying to generate AI video to frames, you encounter this error:

```
invalid input syntax for type uuid: "tab-1759902384467"
```

### Root Cause

- **Database Issue**: The `video_generation_jobs.project_id` column is defined as `UUID` type
- **Frontend Sends**: Local tab IDs like `"tab-1759902384467"` (TEXT format)
- **PostgreSQL Rejects**: Non-UUID strings cannot be inserted into UUID columns

### Where It Happens

1. User clicks "Generate Animation" in Video Generation Modal
2. Frontend sends request to Edge Function with `projectId: "tab-1759902384467"`
3. Edge Function tries to insert this into `video_generation_jobs` table
4. PostgreSQL rejects: `project_id UUID` column cannot accept TEXT value

## ✅ Solution

Change `project_id` column from **UUID** to **TEXT** to support both:
- ✅ Saved project UUIDs (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)
- ✅ Local tab IDs (e.g., `"tab-1759902384467"`)

## 🔧 How to Fix

### Step 1: Apply Database Migration

You need to run the migration SQL manually in Supabase Studio:

1. **Open Supabase Studio**:
   ```bash
   open https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/editor
   ```

2. **Navigate to SQL Editor**:
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and paste this SQL**:

```sql
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
```

4. **Run the query** (Click "Run" or press `Ctrl+Enter`)

5. **Verify the change**:

```sql
-- Check the column type
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'video_generation_jobs'
  AND column_name = 'project_id';
```

Expected output:
```
column_name  | data_type | is_nullable
-------------|-----------|------------
project_id   | text      | YES
```

### Step 2: Deploy Updated Edge Function

The Edge Function has been updated with better error messages.

```bash
# Deploy the updated video-generate Edge Function
npx supabase functions deploy video-generate
```

Or deploy via Supabase CLI:

```bash
# Login if needed
npx supabase login

# Link to project
npx supabase link --project-ref fdiwnymnikylraofwhdu

# Deploy function
npx supabase functions deploy video-generate
```

### Step 3: Test the Fix

1. **Clear browser cache and reload** the application
2. Open the **Video Generation Modal**
3. Enter a prompt and click **Generate Animation**
4. The error should no longer occur!

## 🔍 Verification

### Check Database Schema

```sql
-- View table structure
\d video_generation_jobs

-- Should show:
-- project_id | text | nullable
```

### Check Edge Function Logs

```bash
# View real-time logs
npx supabase functions logs video-generate --tail

# Should see successful job creation:
# ✅ [request-id] Job created with ID: ...
```

### Check Application Logs

In browser console, you should see:

```
✅ [request-id] Video job created: <job-id>
⏱️  [request-id] Estimated completion: 120s
```

Instead of:

```
❌ invalid input syntax for type uuid: "tab-1759902384467"
```

## 📝 Technical Details

### Migration File Location

```
/supabase/migrations/20250118000000_fix_video_jobs_project_id_type.sql
```

### Files Modified

1. **Edge Function**: `supabase/functions/video-generate/index.ts`
   - Added detailed error logging
   - Added UUID type error detection
   - Added helpful error messages

2. **Migration**: `supabase/migrations/20250118000000_fix_video_jobs_project_id_type.sql`
   - Changes `project_id` from UUID to TEXT
   - Maintains index for performance
   - Adds documentation comment

### Why TEXT Instead of UUID?

1. **Flexibility**: Supports both saved projects (UUID) and local tabs (TEXT)
2. **User Experience**: Users can generate videos without saving projects first
3. **Future-Proof**: Can support different project identifier formats
4. **No Data Loss**: UUID strings can still be stored in TEXT columns

### Alternative Solutions Considered

❌ **Generate UUIDs for local tabs**:
- Requires tracking tab-to-UUID mapping
- Breaks if user clears localStorage
- More complex implementation

❌ **Make project_id optional (NULL)**:
- Loses ability to track which project created the video
- Makes cleanup and organization harder

✅ **Use TEXT type** (CHOSEN):
- Simple, flexible, backward-compatible
- Supports all use cases
- No breaking changes

## 🚨 Common Issues

### Issue: "Cannot find project ref"

**Solution**: Link your local project to Supabase:

```bash
npx supabase link --project-ref fdiwnymnikylraofwhdu
```

### Issue: Migration already applied

**Solution**: Check if the column is already TEXT:

```sql
SELECT data_type FROM information_schema.columns
WHERE table_name = 'video_generation_jobs' AND column_name = 'project_id';
```

If it returns `text`, the migration is already applied!

### Issue: Edge Function not updating

**Solution**: Force redeploy with no cache:

```bash
npx supabase functions deploy video-generate --no-verify-jwt
```

## 📚 Related Files

- Migration: [20250118000000_fix_video_jobs_project_id_type.sql](../supabase/migrations/20250118000000_fix_video_jobs_project_id_type.sql)
- Edge Function: [video-generate/index.ts](../supabase/functions/video-generate/index.ts)
- Frontend Service: [lib/services/supabase-ai.ts](../lib/services/supabase-ai.ts)
- UI Component: [components/video-generation-modal.tsx](../components/video-generation-modal.tsx)

## 🎉 Success!

After applying the migration, you should be able to:

1. ✅ Generate AI videos from any tab (saved or unsaved)
2. ✅ See proper progress updates
3. ✅ Extract frames and import to animation timeline
4. ✅ Export as GIF

Happy animating! 🎬✨
