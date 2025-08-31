# Cloud Save & Authentication Implementation Plan

## Overview

This document outlines the implementation plan for adding social authentication and cloud save/load functionality to PixelBuddy. The system will support Google, Facebook, and GitHub OAuth login with project persistence to the cloud, allowing users to save up to 3 projects and load them across sessions.

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

## Database Schema Design

### Core Tables

#### Users Table
```sql
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
```

#### Projects Table  
```sql
CREATE TABLE saved_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  project_data JSONB NOT NULL, -- Full project state
  thumbnail_data TEXT, -- Base64 thumbnail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT max_projects_per_user 
    CHECK ((SELECT COUNT(*) FROM saved_projects WHERE user_id = saved_projects.user_id) <= 3)
);

CREATE INDEX idx_projects_user_id ON saved_projects(user_id);
CREATE INDEX idx_projects_updated_at ON saved_projects(user_id, updated_at DESC);
```

## Backend API Architecture

### New API Endpoints

#### Authentication Endpoints
```typescript
// OAuth callback handling
POST /api/auth/callback/:provider
GET  /api/auth/session
POST /api/auth/logout

// User profile
GET  /api/user/profile
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

## Technical Implementation Strategy

### Phase 1: Authentication Setup
1. Configure OAuth providers (Google, Facebook, GitHub)
2. Implement next-auth configuration
3. Create authentication middleware for backend
4. Build auth store and login UI components

### Phase 2: Database & Backend APIs
1. Set up database schema (Railway PostgreSQL)
2. Implement project CRUD API endpoints
3. Add authentication middleware to protected routes
4. Create project serialization utilities

### Phase 3: Save Functionality
1. Build SaveProjectModal component
2. Integrate with project store save method
3. Add save button to top toolbar
4. Implement error handling and user feedback

### Phase 4: Load Functionality  
1. Build LoadProjectModal component with project grid
2. Implement merge options dialog
3. Add load button to top toolbar
4. Create project thumbnail generation

### Phase 5: Testing & Polish
1. End-to-end authentication testing
2. Project save/load workflow testing
3. Error case handling (network issues, storage limits)
4. Performance optimization for large projects

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

## Dependencies

### New NPM Packages
```json
{
  "next-auth": "^4.24.0",
  "@auth/drizzle-adapter": "^1.1.0", 
  "lz-string": "^1.5.0",
  "sharp": "^0.33.0" // For thumbnail generation
}
```

### OAuth Application Setup Required
- Google Cloud Console: OAuth 2.0 credentials
- Meta for Developers: Facebook App with login permissions
- GitHub Developer Settings: OAuth App registration

### Environment Variables
```env
# OAuth Configuration
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID= 
FACEBOOK_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# JWT Configuration
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Database (fallback)
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

This plan provides a comprehensive roadmap for implementing cloud save and social authentication while maintaining the kid-friendly focus and security requirements of PixelBuddy.