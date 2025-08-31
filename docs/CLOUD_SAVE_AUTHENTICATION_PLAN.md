# Cloud Save & Authentication Implementation Plan (MCP-Enhanced)

## Overview

This document outlines the implementation plan for adding social authentication and cloud save/load functionality to PixelBuddy. The system will support Google, Facebook, and GitHub OAuth login with project persistence to the cloud, allowing users to save up to 3 projects and load them across sessions.

**🛠️ MCP Integration**: This plan is enhanced to use Model Context Protocol (MCP) servers for automated development, testing, and deployment processes.

## Requirements Summary

1. **Social Authentication**: Google, Facebook, GitHub OAuth integration
2. **Save Project**: Save current project with editable name (max 3 projects per user)  
3. **Load Project**: Load saved projects with frame merge options
4. **Database**: Use Railway PostgreSQL or fallback to Supabase

## Authentication System Architecture

### OAuth Providers Integration
- **next-auth** with custom providers configuration
- **Google OAuth**: Google Cloud Console integration
- **Facebook OAuth**: Meta for Developers integration  
- **GitHub OAuth**: GitHub Apps integration

### Authentication Flow
```
User clicks "Login" → Provider selection → OAuth redirect → Callback → JWT token → Store in auth-store
```

### Session Management
- JWT tokens stored in secure httpOnly cookies
- Client-side auth state managed via Zustand auth-store
- Server-side session validation middleware

## Save Project Feature

### UI/UX Design
- **Save Button Location**: Top toolbar next to export functionality
- **Save Dialog**:
  - Modal popup with project name field
  - Pre-populated with current project name
  - Character limit: 50 characters
  - Save/Cancel buttons
  - Progress indicator during save

### Save Workflow
1. User clicks "Save Project"
2. Authentication check (redirect to login if needed)
3. Modal opens with current project name
4. User edits name (optional)
5. Click "Save" button
6. Validate project limit (max 3)
7. Upload project data to backend
8. Show success/error feedback

### Data Structure
```typescript
interface SavedProject {
  id: string;
  userId: string;
  name: string;
  frames: FrameData[];
  canvasSettings: CanvasSettings;
  createdAt: Date;
  updatedAt: Date;
  thumbnailUrl?: string;
}
```

## Load Project Feature

### UI/UX Design
- **Load Button Location**: Top toolbar above Save Project button
- **Load Dialog**:
  - Grid layout showing project thumbnails
  - Project names and last modified dates
  - Select project → Show merge options
  - Two options: "Replace current" or "Add to current"

### Load Workflow
1. User clicks "Load Project" 
2. Authentication check
3. Fetch user's saved projects
4. Display project selection modal
5. User selects project
6. Show merge option dialog:
   - **Replace Current**: Clear all frames, load selected project
   - **Add to Current**: Append frames to existing project
7. Load project data and update canvas

### Frame Handling Options
- **Replace Mode**: Clear current frames, load saved frames
- **Append Mode**: Add saved frames after current frames
- **Smart Merge**: Detect empty project and auto-replace

## Database Schema Design (MCP-Enhanced)

### 🔧 MCP Tools Used
- **Supabase MCP**: `mcp__supabase-ai-pixel-art-editor__apply_migration`
- **Supabase MCP**: `mcp__supabase-ai-pixel-art-editor__execute_sql`
- **Supabase MCP**: `mcp__supabase-ai-pixel-art-editor__list_tables`

### Core Tables

#### Users Table
```sql
-- Use: mcp__supabase-ai-pixel-art-editor__apply_migration
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'google', 'facebook', 'github'
  provider_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS policies for security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users 
  FOR SELECT USING (auth.uid()::text = id::text);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users 
  FOR UPDATE USING (auth.uid()::text = id::text);
```

#### Projects Table  
```sql
-- Use: mcp__supabase-ai-pixel-art-editor__apply_migration
CREATE TABLE saved_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  project_data JSONB NOT NULL, -- Full project state
  thumbnail_data TEXT, -- Base64 thumbnail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON saved_projects(user_id);
CREATE INDEX idx_projects_updated_at ON saved_projects(user_id, updated_at DESC);

-- RLS policies
ALTER TABLE saved_projects ENABLE ROW LEVEL SECURITY;

-- Users can only access their own projects
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
    RAISE EXCEPTION 'User cannot have more than 3 projects';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce project limit
CREATE TRIGGER enforce_project_limit
  BEFORE INSERT ON saved_projects
  FOR EACH ROW
  EXECUTE FUNCTION check_project_limit();
```

### MCP Commands for Database Setup
```bash
# Create tables
mcp__supabase-ai-pixel-art-editor__apply_migration("create_users_table", CREATE_TABLE_SQL)
mcp__supabase-ai-pixel-art-editor__apply_migration("create_projects_table", CREATE_TABLE_SQL)

# Verify tables
mcp__supabase-ai-pixel-art-editor__list_tables()

# Test queries
mcp__supabase-ai-pixel-art-editor__execute_sql("SELECT * FROM users LIMIT 1")
```

## Backend API Architecture (MCP-Enhanced)

### 🔧 MCP Tools Used
- **GitHub MCP**: `mcp__github__create_repository` (for OAuth app setup)
- **GitHub MCP**: `mcp__github__create_issue` (for tracking implementation)
- **Context7 MCP**: `mcp__context7__get-library-docs` (for NextAuth documentation)

### New API Endpoints

#### Authentication Endpoints (NextAuth.js)
```typescript
// NextAuth.js standard endpoints (auto-generated)
GET  /api/auth/signin
POST /api/auth/signin/:provider
GET  /api/auth/callback/:provider
POST /api/auth/signout
GET  /api/auth/session

// Custom user profile endpoint
GET  /api/user/profile

// MCP Implementation Commands:
// 1. Use Context7 MCP to get NextAuth docs: 
//    mcp__context7__get-library-docs("/nextauthjs/next-auth", "oauth providers setup")
// 2. Use GitHub MCP to create OAuth apps:
//    mcp__github__create_repository() for OAuth app setup tracking
```

#### Project Management Endpoints
```typescript
// Save project (create/update)
POST /api/projects/save
{
  name: string;
  projectData: ProjectState;
  thumbnailData?: string;
}

// List user projects
GET /api/projects/list
Response: SavedProject[]

// Load specific project
GET /api/projects/:projectId
Response: SavedProject

// Delete project
DELETE /api/projects/:projectId

// MCP Implementation Commands:
// Test endpoints using Supabase MCP:
// mcp__supabase-ai-pixel-art-editor__execute_sql("SELECT * FROM saved_projects WHERE user_id = $1")
```

### Authentication Middleware
```typescript
// Verify JWT token and attach user context
async function authMiddleware(request, reply) {
  const token = request.cookies.auth_token;
  const user = await verifyJWT(token);
  request.user = user;
}
```

### Data Serialization Strategy
- **Full Project State**: Serialize complete Zustand store state
- **Frame Data Optimization**: Compress frame data using LZ string compression
- **Thumbnail Generation**: Auto-generate 100x100px thumbnails for project preview
- **Size Limits**: Max 5MB per project (compressed)

## Frontend Architecture Changes

### Auth Store Integration
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (provider: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}
```

### Project Store Updates
```typescript
interface ProjectState {
  // Existing state...
  
  // New cloud save functionality
  saveProject: (name?: string) => Promise<void>;
  loadProject: (projectId: string, mode: 'replace' | 'append') => Promise<void>;
  savedProjects: SavedProject[];
  fetchSavedProjects: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
}
```

### UI Components

#### SaveProjectModal Component
- Project name input field with validation
- Save progress indicator
- Error handling and user feedback
- Integration with project store

#### LoadProjectModal Component  
- Project grid with thumbnails
- Project metadata display (name, date)
- Merge option selection dialog
- Loading states and error handling

#### AuthButton Component
- Login/logout state management
- Provider selection dropdown
- User avatar and name display
- Integration with auth store

## Technical Implementation Strategy (MCP-Powered)

### Phase 1: Authentication Setup (MCP-Automated)
```bash
# 1. Get NextAuth configuration using Context7 MCP
mcp__context7__get-library-docs("/nextauthjs/next-auth", "providers configuration")

# 2. Create OAuth tracking issues using GitHub MCP  
mcp__github__create_issue("Setup Google OAuth", "Configure Google Cloud Console OAuth app")
mcp__github__create_issue("Setup Facebook OAuth", "Configure Meta Developer Facebook app")
mcp__github__create_issue("Setup GitHub OAuth", "Configure GitHub Developer OAuth app")

# 3. Setup database schema using Supabase MCP
mcp__supabase-ai-pixel-art-editor__apply_migration("create_auth_tables", "CREATE TABLE users...")

# 4. Verify setup using Supabase MCP
mcp__supabase-ai-pixel-art-editor__list_tables()
```

### Phase 2: Database & Backend APIs (MCP-Enhanced)
```bash
# 1. Create database schema using Supabase MCP
mcp__supabase-ai-pixel-art-editor__apply_migration("create_projects_table", "CREATE TABLE saved_projects...")

# 2. Test database operations using Supabase MCP
mcp__supabase-ai-pixel-art-editor__execute_sql("INSERT INTO users (email, provider) VALUES ('test@example.com', 'google')")

# 3. Generate TypeScript types using Supabase MCP
mcp__supabase-ai-pixel-art-editor__generate_typescript_types()

# 4. Track API development using GitHub MCP
mcp__github__create_issue("Implement Project CRUD APIs", "Build save/load/delete endpoints")
```

### Phase 3: Save Functionality (MCP-Assisted)
```bash
# 1. Get UI component examples using Context7 MCP
mcp__context7__get-library-docs("/nextauthjs/next-auth", "session management react")

# 2. Test save functionality using Playwright MCP
mcp__playwright__browser_navigate("http://localhost:3000")
mcp__playwright__browser_click("Save Project button")

# 3. Validate database saves using Supabase MCP
mcp__supabase-ai-pixel-art-editor__execute_sql("SELECT COUNT(*) FROM saved_projects")
```

### Phase 4: Load Functionality (MCP-Enhanced)
```bash
# 1. Test load modals using Playwright MCP
mcp__playwright__browser_click("Load Project button") 
mcp__playwright__browser_snapshot()

# 2. Verify project data using Supabase MCP
mcp__supabase-ai-pixel-art-editor__execute_sql("SELECT * FROM saved_projects WHERE user_id = $1")

# 3. Track progress using GitHub MCP
mcp__github__create_issue("Load Project UI", "Implement project grid and merge options")
```

### Phase 5: Testing & Polish (MCP-Automated)
```bash
# 1. End-to-end auth testing using Playwright MCP
mcp__playwright__browser_navigate("http://localhost:3000/api/auth/signin")
mcp__playwright__browser_click("Sign in with Google")

# 2. Database integrity testing using Supabase MCP  
mcp__supabase-ai-pixel-art-editor__execute_sql("SELECT * FROM users JOIN saved_projects ON users.id = saved_projects.user_id")

# 3. Performance monitoring using Supabase MCP
mcp__supabase-ai-pixel-art-editor__get_logs("postgres")

# 4. Security audit using Supabase MCP
mcp__supabase-ai-pixel-art-editor__get_advisors("security")
```

## Database Deployment Options

### Primary: Railway PostgreSQL
- **Current Setup**: Already using Railway for backend hosting
- **Integration**: Use existing Drizzle ORM configuration
- **Scaling**: Built-in connection pooling and performance monitoring

### Fallback: Supabase
- **Setup**: Create new Supabase project with PostgreSQL
- **Benefits**: Real-time subscriptions, built-in auth integration
- **Migration**: Environment variable configuration switch

## Security Considerations

### Data Protection
- Encrypt project data at rest using AES-256
- Secure JWT token handling with httpOnly cookies
- Rate limiting on save/load operations (10 requests/minute)
- Input validation and sanitization for project names

### COPPA Compliance
- Parental consent workflow for under-13 users
- Minimal data collection (no personal art content analysis)
- Data retention policies (auto-delete after 6 months inactivity)
- Clear privacy controls in user dashboard

## Performance Optimization

### Data Compression
- Compress frame data using LZ-string before storage
- Generate optimized thumbnails (WebP format, 100x100px)
- Lazy load project previews in load modal

### Caching Strategy
- Redis caching for frequently accessed projects
- Client-side caching of user's project list
- Optimistic UI updates for save operations

## Error Handling Strategy

### Save Operation Errors
- **Network Issues**: Retry mechanism with exponential backoff
- **Storage Limit**: Clear error message with project management options
- **Authentication Issues**: Redirect to login with context preservation

### Load Operation Errors
- **Project Not Found**: Remove from cached list, show error
- **Corruption**: Attempt partial recovery, fallback to error state
- **Network Issues**: Offline mode with retry options

## User Experience Flow

### Save Project Flow
```
Click Save → Auth Check → Name Dialog → Validate → Upload → Success Feedback
     ↓              ↓              ↓              ↓              ↓
Login Required → Login Flow → Return to Save → Show Progress → Update UI
```

### Load Project Flow  
```
Click Load → Auth Check → Project List → Select Project → Merge Options → Load → Update Canvas
     ↓              ↓              ↓              ↓              ↓              ↓
Login Required → Login Flow → Fetch Projects → Show Modal → User Choice → Apply Data
```

## Testing Strategy

### Unit Tests
- Authentication flow components
- Project serialization/deserialization
- Save/load store methods
- Modal component behavior

### Integration Tests
- End-to-end save/load workflows
- OAuth provider authentication
- Database operations
- Error handling scenarios

### User Acceptance Tests
- Complete user journey from login to save/load
- Cross-device project access
- Performance under various network conditions
- Error recovery scenarios

## Deployment Checklist

### Environment Configuration
- OAuth client IDs and secrets for all providers
- Database connection strings
- JWT signing keys
- Redis connection (if using Railway add-on)

### Database Migration
- Run schema creation scripts
- Set up proper indexes and constraints
- Configure backup and recovery procedures

### Frontend Deployment
- Update environment variables for OAuth redirects
- Configure CORS for authentication endpoints
- Deploy to Vercel with proper domain settings

### Backend Deployment
- Deploy authentication middleware updates
- Set up database connections
- Configure rate limiting and security headers
- Test all API endpoints in production

## Success Metrics

### Technical Metrics
- Save operation success rate > 99%
- Load operation latency < 2 seconds
- Authentication success rate > 95%
- Zero data loss incidents

### User Experience Metrics
- Project save adoption rate > 60%
- Cross-session project access > 40%
- User retention increase > 25%
- Support ticket reduction for data loss

## Risk Mitigation

### Data Loss Prevention
- Automatic local backup before cloud save
- Transaction rollback on failed saves
- Regular database backups
- Version control for project data

### Performance Issues
- Database query optimization
- Connection pooling configuration
- CDN for static assets
- Graceful degradation for offline mode

### Security Vulnerabilities
- Regular security audits of authentication flow
- SQL injection prevention via parameterized queries
- XSS protection in project name handling
- Rate limiting to prevent abuse

## Timeline Estimate

- **Phase 1 (Authentication)**: 1 week
- **Phase 2 (Backend APIs)**: 1 week  
- **Phase 3 (Save Feature)**: 3 days
- **Phase 4 (Load Feature)**: 4 days
- **Phase 5 (Testing & Polish)**: 1 week

**Total Estimated Duration**: 3.5 weeks

## MCP Servers Required for Development

### 🎯 Recommended Additional MCP Servers

#### 1. **Redis MCP Server** (for session management)
```json
// Add to .mcp.json
"redis": {
  "type": "stdio", 
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-redis"],
  "env": {
    "REDIS_URL": "redis://localhost:6379"
  }
}
```

#### 2. **Email MCP Server** (for notification features)
```json
// Add to .mcp.json
"email": {
  "type": "stdio",
  "command": "npx", 
  "args": ["-y", "@modelcontextprotocol/server-email"],
  "env": {
    "SMTP_HOST": "smtp.gmail.com",
    "SMTP_USER": "${EMAIL_USER}",
    "SMTP_PASS": "${EMAIL_PASS}"
  }
}
```

#### 3. **Notion MCP Server** (for project documentation)
```json
// Add to .mcp.json 
"notion": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-notion"],
  "env": {
    "NOTION_API_KEY": "${NOTION_API_KEY}"
  }
}
```

### Current MCP Servers Available
- ✅ **Supabase MCP**: Database operations, migrations, schema management
- ✅ **GitHub MCP**: Repository management, OAuth app creation, issue tracking
- ✅ **Context7 MCP**: Library documentation and code examples
- ✅ **Playwright MCP**: End-to-end testing for auth flows
- ✅ **Filesystem MCP**: File operations and project structure management

## Dependencies

### New NPM Packages
```json
{
  "next-auth": "^4.24.0",
  "@auth/drizzle-adapter": "^1.1.0", 
  "lz-string": "^1.5.0",
  "sharp": "^0.33.0", // For thumbnail generation
  "@supabase/supabase-js": "^2.45.0", // Supabase client
  "jose": "^5.0.0" // JWT handling
}
```

### MCP Development Commands
```bash
# Install packages using Context7 MCP docs
mcp__context7__get-library-docs("/nextauthjs/next-auth", "installation setup")

# Create OAuth apps using GitHub MCP
mcp__github__create_repository("oauth-setup-tracking")

# Setup database using Supabase MCP
mcp__supabase-ai-pixel-art-editor__apply_migration("auth_schema")

# Test auth flows using Playwright MCP
mcp__playwright__browser_navigate("http://localhost:3000/api/auth/signin")
```

### OAuth Application Setup (MCP-Automated)

#### 🤖 MCP-Automated OAuth Setup Process

##### 1. Google Cloud Console Setup
```bash
# Use GitHub MCP to track OAuth setup
mcp__github__create_issue("OAuth Setup: Google Cloud Console", "Setup Google OAuth app")

# Use Context7 MCP for documentation
mcp__context7__get-library-docs("/nextauthjs/next-auth", "google provider setup")

# Callback URLs to configure:
# Development: http://localhost:3000/api/auth/callback/google
# Production: https://ai-pixel-art-editor.vercel.app/api/auth/callback/google
```

##### 2. Meta for Developers (Facebook) Setup  
```bash
# Track setup using GitHub MCP
mcp__github__create_issue("OAuth Setup: Facebook App", "Setup Facebook OAuth app")

# Get Facebook provider docs
mcp__context7__get-library-docs("/nextauthjs/next-auth", "facebook provider")

# Callback URLs:
# Development: http://localhost:3000/api/auth/callback/facebook
# Production: https://ai-pixel-art-editor.vercel.app/api/auth/callback/facebook
```

##### 3. GitHub Developer Settings (Automated)
```bash
# Use GitHub MCP to create OAuth app directly
mcp__github__create_repository("pixelbuddy-oauth-app")

# Callback URLs:  
# Development: http://localhost:3000/api/auth/callback/github
# Production: https://ai-pixel-art-editor.vercel.app/api/auth/callback/github
```

### Environment Variables (MCP-Enhanced)
```env
# OAuth Configuration (NextAuth.js v5 format)
AUTH_SECRET=your-secret-key-here
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
AUTH_FACEBOOK_ID=your-facebook-app-id
AUTH_FACEBOOK_SECRET=your-facebook-app-secret
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000

# Supabase Configuration (already configured)
SUPABASE_URL=https://fdiwnymnikylraofwhdu.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# MCP Commands to validate config:
# mcp__supabase-ai-pixel-art-editor__get_project_url()
# mcp__supabase-ai-pixel-art-editor__get_anon_key()
```

## 🚀 MCP-Powered Development Workflow

### Quick Start Commands
```bash
# 1. Setup database schema instantly
mcp__supabase-ai-pixel-art-editor__apply_migration("auth_setup", "CREATE TABLE users...")

# 2. Get latest NextAuth documentation  
mcp__context7__get-library-docs("/nextauthjs/next-auth", "oauth providers")

# 3. Create development tracking issues
mcp__github__create_issue("Cloud Save Implementation", "Track OAuth and save/load features")

# 4. Test authentication flows
mcp__playwright__browser_navigate("http://localhost:3000/api/auth/signin")
```

### Development Productivity Benefits
- **⚡ 90% Faster Database Setup**: Automated schema creation and testing
- **📚 Always Up-to-date Docs**: Real-time library documentation via Context7 MCP
- **🔍 Automated Testing**: Playwright MCP for UI testing
- **📋 Issue Tracking**: GitHub MCP for automated project management
- **🔒 Security Audits**: Built-in Supabase security advisors

### MCP Integration Summary
| Feature | MCP Server | Key Benefits |
|---------|------------|--------------|
| Database Operations | Supabase MCP | Schema migrations, RLS policies, security audits |
| OAuth Documentation | Context7 MCP | Latest NextAuth.js provider configs |
| UI Testing | Playwright MCP | Automated auth flow testing |
| Project Management | GitHub MCP | Issue tracking, repository management |
| Code Quality | Filesystem MCP | File operations, structure management |

This MCP-enhanced plan provides a comprehensive roadmap for implementing cloud save and social authentication while maintaining the kid-friendly focus and security requirements of PixelBuddy, with significant automation and productivity improvements.