# Authentication Fix & Implementation Plan

## Current Issues Identified

### 🚨 **Critical Problems**
1. **NextAuth Configuration Issues**: The auth configuration is incomplete and causing server errors
2. **Missing OAuth Credentials**: No real OAuth provider credentials are configured
3. **Environment Variable Problems**: Production environment variables not properly set
4. **NextAuth Version Mismatch**: Using NextAuth v4 syntax with potential v5 requirements
5. **Route Handler Issues**: The auth route handler may have incorrect exports


### 🔍 **Analysis Summary**

**Server Error Root Cause:**
- The authentication endpoint is returning 401 errors
- OAuth providers are not properly configured with real credentials
- NextAuth secret and URL configuration issues in production
- Missing or incorrect environment variables on Vercel deployment

**Current State:**
- ✅ Basic NextAuth setup exists
- ✅ Auth components (AuthButton, SignIn page) are implemented
- ✅ Auth store (Zustand) is configured
- ❌ No real OAuth provider credentials
- ❌ NextAuth configuration incomplete
- ❌ Production environment variables not set

## Implementation Plan

### Phase 1: Fix NextAuth Configuration (Immediate - Day 1)

#### 1.1 Update NextAuth Configuration
- Fix NextAuth v4/v5 compatibility issues
- Update auth route handler for App Router
- Add proper error handling and logging
- Configure JWT and session strategies

#### 1.2 Environment Variables Setup
- Set up Google OAuth application
- Set up Facebook OAuth application  
- Set up GitHub OAuth application
- Configure production environment variables on Vercel

#### 1.3 Provider Configuration
- Configure Google provider with proper scopes
- Configure Facebook provider with proper permissions
- Configure GitHub provider with user email access
- Add provider-specific callback handling

### Phase 2: OAuth Provider Setup (Day 2)

#### 2.1 Google Cloud Console Setup
```bash
# OAuth Application Configuration:
# - Application Type: Web Application
# - Authorized Origins: 
#   * http://localhost:3000 (development)
#   * https://ai-pixel-art-editor.vercel.app (production)
# - Authorized Redirect URIs:
#   * http://localhost:3000/api/auth/callback/google
#   * https://ai-pixel-art-editor.vercel.app/api/auth/callback/google
```

#### 2.2 Meta for Developers (Facebook) Setup
```bash
# Facebook App Configuration:
# - App Type: Consumer
# - Products: Facebook Login for Web
# - Valid OAuth Redirect URIs:
#   * http://localhost:3000/api/auth/callback/facebook
#   * https://ai-pixel-art-editor.vercel.app/api/auth/callback/facebook
```

#### 2.3 GitHub Developer Settings
```bash
# GitHub OAuth App Configuration:
# - Application Name: PixelBuddy
# - Homepage URL: https://ai-pixel-art-editor.vercel.app
# - Authorization Callback URL:
#   * https://ai-pixel-art-editor.vercel.app/api/auth/callback/github
```

### Phase 3: Database Integration (Day 3)

#### 3.1 Supabase Auth Tables Setup
- Create users table with OAuth provider support
- Set up Row Level Security (RLS) policies
- Create user profile management functions
- Add project ownership relationships

#### 3.2 NextAuth Database Adapter
- Configure Supabase adapter for NextAuth
- Set up session and user persistence
- Add proper error handling for database operations

### Phase 4: Cloud Save Integration (Day 4)

#### 4.1 Project Save/Load API
- Implement authenticated project save endpoints
- Add project ownership validation
- Set up 3-project limit enforcement
- Add project thumbnail generation

#### 4.2 Frontend Integration
- Update SaveProjectModal with authentication
- Add LoadProjectModal with user projects
- Integrate auth state with project operations
- Add proper error handling for auth failures

### Phase 5: Testing & Security (Day 5)

#### 5.1 Authentication Flow Testing
- Test all OAuth provider sign-ins
- Verify callback URL handling
- Test session persistence
- Validate logout functionality

#### 5.2 Security & COPPA Compliance
- Implement parental consent workflow
- Add privacy controls
- Set up data retention policies
- Add audit logging for auth events

## Technical Implementation Details

### NextAuth Configuration Fix

#### File: `lib/auth.ts` (Updated)
```typescript
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import GitHubProvider from "next-auth/providers/github"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"

// Validate required environment variables
const requiredEnvVars = ['NEXTAUTH_SECRET', 'NEXTAUTH_URL']
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

const providers = []

// Google OAuth Provider
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(GoogleProvider({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    authorization: {
      params: {
        scope: 'openid email profile',
        prompt: 'consent',
      },
    },
  }))
}

// Facebook OAuth Provider
if (process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET) {
  providers.push(FacebookProvider({
    clientId: process.env.AUTH_FACEBOOK_ID,
    clientSecret: process.env.AUTH_FACEBOOK_SECRET,
    authorization: {
      params: {
        scope: 'email',
      },
    },
  }))
}

// GitHub OAuth Provider
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(GitHubProvider({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
    authorization: {
      params: {
        scope: 'read:user user:email',
      },
    },
  }))
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db),
  providers,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        token.provider = account.provider
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.userId as string
        session.user.provider = token.provider as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Add custom sign-in logic here
      console.log('Sign in attempt:', { 
        provider: account?.provider, 
        email: user.email 
      })
      return true
    },
    async redirect({ url, baseUrl }) {
      // Redirect to home page after successful sign-in
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log('User signed in:', { 
        email: user.email, 
        provider: account?.provider, 
        isNewUser 
      })
    },
    async signOut({ session }) {
      console.log('User signed out:', session?.user?.email)
    }
  },
  debug: process.env.NODE_ENV === 'development',
}

export default authOptions
```

#### File: `app/api/auth/[...nextauth]/route.ts` (Fixed)
```typescript
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

### Environment Variables Configuration

#### Production Environment Variables (Vercel)
```env
# NextAuth Configuration
NEXTAUTH_SECRET=your-production-nextauth-secret-very-long-and-secure-key-here
NEXTAUTH_URL=https://ai-pixel-art-editor.vercel.app

# Google OAuth
AUTH_GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-google-client-secret

# Facebook OAuth  
AUTH_FACEBOOK_ID=your-facebook-app-id
AUTH_FACEBOOK_SECRET=your-facebook-app-secret

# GitHub OAuth
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret

# Database (Supabase)
DATABASE_URL=postgresql://postgres.fdiwnymnikylraofwhdu:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://fdiwnymnikylraofwhdu.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Feature Flags
ENABLE_CLOUD_SYNC=true
ENABLE_AUTH=true
```

#### Development Environment Variables (`.env.local`)
```env
# NextAuth Configuration
NEXTAUTH_SECRET=pixelbuddy-local-dev-secret-key-very-long-and-secure
NEXTAUTH_URL=http://localhost:3000

# OAuth Provider Configuration
AUTH_GOOGLE_ID=your-dev-google-client-id
AUTH_GOOGLE_SECRET=your-dev-google-client-secret
AUTH_FACEBOOK_ID=your-dev-facebook-app-id
AUTH_FACEBOOK_SECRET=your-dev-facebook-app-secret
AUTH_GITHUB_ID=your-dev-github-client-id
AUTH_GITHUB_SECRET=your-dev-github-client-secret

# Database Configuration
DATABASE_URL=postgresql://postgres.fdiwnymnikylraofwhdu:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://fdiwnymnikylraofwhdu.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# Development Settings
NODE_ENV=development
DEBUG=true
```

### Database Schema (Supabase)

#### Users Table
```sql
-- Create users table for NextAuth
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  email_verified TIMESTAMP WITH TIME ZONE,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);
```

#### Accounts Table (OAuth Providers)
```sql
-- Create accounts table for OAuth provider data
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type VARCHAR(255),
  scope VARCHAR(255),
  id_token TEXT,
  session_state VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own accounts
CREATE POLICY "Users can view own accounts" ON accounts
  FOR SELECT USING (auth.uid()::text = user_id::text);
```

#### Projects Table (Cloud Save)
```sql
-- Create saved projects table
CREATE TABLE IF NOT EXISTS saved_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  project_data JSONB NOT NULL,
  thumbnail_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON saved_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON saved_projects(user_id, updated_at DESC);

-- Enable RLS
ALTER TABLE saved_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own projects" ON saved_projects
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own projects" ON saved_projects
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own projects" ON saved_projects
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own projects" ON saved_projects
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Function to enforce 3 project limit
CREATE OR REPLACE FUNCTION check_project_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM saved_projects WHERE user_id = NEW.user_id) >= 3 THEN
    RAISE EXCEPTION 'User cannot have more than 3 saved projects';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce project limit
DROP TRIGGER IF EXISTS enforce_project_limit ON saved_projects;
CREATE TRIGGER enforce_project_limit
  BEFORE INSERT ON saved_projects
  FOR EACH ROW
  EXECUTE FUNCTION check_project_limit();
```

## Implementation Steps

### Step 1: Fix NextAuth Configuration (Immediate)

```bash
# 1. Update auth configuration files
# 2. Fix route handler exports
# 3. Add proper error handling
# 4. Test locally with GitHub OAuth (already configured)
```

### Step 2: Set up OAuth Providers

```bash
# 1. Create Google Cloud Console project and OAuth app
# 2. Create Facebook developer app and configure OAuth
# 3. Create GitHub OAuth app (production)
# 4. Configure callback URLs for all providers
```

### Step 3: Deploy Environment Variables

```bash
# 1. Set up production environment variables on Vercel
# 2. Verify all OAuth credentials are properly configured
# 3. Test authentication flow in production
```

### Step 4: Database Setup

```bash
# 1. Run database migrations using Supabase MCP
mcp__supabase-ai-pixel-art-editor__apply_migration("create_auth_tables", CREATE_TABLE_SQL)

# 2. Verify tables and RLS policies
mcp__supabase-ai-pixel-art-editor__list_tables()

# 3. Test database operations
mcp__supabase-ai-pixel-art-editor__execute_sql("SELECT * FROM users LIMIT 1")
```

### Step 5: Test End-to-End Flow

```bash
# 1. Test all OAuth provider sign-ins
# 2. Test session persistence
# 3. Test project save/load with authentication
# 4. Verify COPPA compliance features
```

## Success Criteria

### Technical Validation
- [ ] All OAuth providers work in production
- [ ] Authentication persists across sessions
- [ ] Database operations work correctly
- [ ] No server configuration errors
- [ ] Project save/load works with authentication

### User Experience Validation
- [ ] Users can sign in with Google/Facebook/GitHub
- [ ] Sign-in redirects work properly
- [ ] User profile displays correctly
- [ ] Projects are saved to correct user accounts
- [ ] 3-project limit is enforced

### Security Validation
- [ ] RLS policies protect user data
- [ ] JWT tokens are properly signed
- [ ] OAuth flows follow security best practices
- [ ] No sensitive data exposed in client
- [ ] COPPA compliance features work

## Risk Mitigation

### OAuth Provider Issues
- **Risk**: OAuth apps rejection or configuration errors
- **Mitigation**: Test with development apps first, have backup providers ready

### Database Connection Issues
- **Risk**: Supabase connection failures
- **Mitigation**: Implement connection pooling, fallback error handling

### Session Management Problems
- **Risk**: Users losing sessions or unable to authenticate
- **Mitigation**: Robust error handling, clear error messages, session debugging

### Production Deployment Issues
- **Risk**: Environment variable misconfigurations
- **Mitigation**: Staged deployment, thorough testing, rollback plan

## Timeline

- **Day 1**: Fix NextAuth configuration and test locally
- **Day 2**: Set up OAuth providers and test authentication
- **Day 3**: Configure production environment and deploy
- **Day 4**: Set up database schema and test cloud save
- **Day 5**: End-to-end testing and security validation

## Next Steps

1. **Immediate**: Fix NextAuth configuration and route handler
2. **Priority**: Set up OAuth provider applications  
3. **Critical**: Configure production environment variables
4. **Essential**: Test authentication flow end-to-end
5. **Important**: Implement cloud save functionality

This plan addresses all identified issues and provides a clear path to implement working Google/Facebook/GitHub authentication with cloud save functionality.