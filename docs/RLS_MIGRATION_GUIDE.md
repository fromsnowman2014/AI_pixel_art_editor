# RLS Security Migration Guide

## 🚨 Critical Security Issue

**13 tables were exposed without Row Level Security (RLS)**, allowing any user to access all data!

## ✅ Solution

A comprehensive RLS migration has been created: `supabase/migrations/20250107000000_enable_rls_security.sql`

## 📋 How to Apply the Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to **SQL Editor**: https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/sql/new

2. Copy the contents of `supabase/migrations/20250107000000_enable_rls_security.sql`

3. Paste into the SQL Editor

4. Click **"Run"**

5. Verify in **Security Advisor**: https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/advisors/security
   - All 13 errors should be resolved

### Option 2: Supabase CLI

```bash
# Make sure you're logged in
npx supabase login

# Link to project (if not already linked)
npx supabase link --project-ref fdiwnymnikylraofwhdu

# Push migration
npx supabase db push
```

## 🛡️ What This Migration Does

### 1. **NextAuth Tables** (Service Role Only)
- `accounts`, `sessions`, `users`, `verification_tokens`
- Only accessible by the application (not end users)
- Prevents users from reading others' session tokens

### 2. **Application Tables** (User Isolation)
- `saved_projects`: Users can only see/edit their own projects
- `projects`: Users can only manage their own projects
- `assets`: Users can only access their own assets
- `video_generation_jobs`: Users can only see their own jobs

### 3. **Shared Tables** (Controlled Access)
- `user_profiles`: Anyone can view, users can edit their own
- `analytics`: Users can insert (append-only), service role can read all

### 4. **Drizzle Tables** (Service Role Only)
- `User`, `Account`, `Session`, `VerificationToken`
- Legacy tables with capitalized names

## 🧪 Testing RLS Policies

After applying, test with:

```sql
-- Test as anonymous user (should fail)
SELECT * FROM public.saved_projects;
-- Expected: 0 rows (no access without auth)

-- Test as authenticated user (should only see own data)
SELECT * FROM public.saved_projects WHERE user_id = auth.uid()::text;
-- Expected: Only your projects
```

## 🔒 Security Improvements

**Before**: Any user could:
- Read all user emails and passwords
- Access all projects from all users
- View all session tokens
- Modify others' data

**After**: Users can only:
- Access their own data
- View public profiles (name, avatar)
- No access to sensitive auth data

## 📊 Impact on Application

### No Breaking Changes
- Application functionality remains identical
- Edge Functions use service role key (bypasses RLS)
- Users authenticate via NextAuth (unchanged)

### Performance
- Minimal impact (policies use indexed columns)
- Queries automatically filtered by `user_id`

## ⚠️ Important Notes

1. **Service Role Key**: Edge Functions must use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
2. **User ID Format**: Policies use `auth.uid()::text` to match NextAuth UUID format
3. **Backward Compatible**: All existing features continue to work

## 🔍 Verification Checklist

After migration:

- [ ] Security Advisor shows 0 RLS errors
- [ ] Users can log in successfully
- [ ] Users can save/load their projects
- [ ] Users cannot see others' projects
- [ ] Video generation works
- [ ] Edge Functions can update database

## 📚 References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Security Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)
