# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PixelBuddy** is a kids-friendly AI-assisted pixel art and GIF studio web application. The project targets children aged 9-12 and emphasizes simplicity, safety, and fast iteration. The app combines a simple pixel editor with AI that respects pixel size constraints and limited palettes.

## Planned Technical Architecture

### Frontend (Vercel)
- **Framework**: Next.js with App Router
- **UI**: React + Tailwind CSS
- **State Management**: Zustand or Redux Toolkit
- **Canvas**: HTML `<canvas>` with OffscreenCanvas workers
- **CSS**: `image-rendering: pixelated` for crisp pixel art
- **GIF Processing**: gifuct-js or WASM encoder

### Backend (Railway)
- **Runtime**: Node.js with Fastify
- **Production URL**: https://aipixelarteditor-production.up.railway.app
- **Validation**: Zod
- **Database**: PostgreSQL for metadata
- **Cache/Queue**: Redis for rate limiting and job processing
- **Storage**: R2/Supabase for images
- **Auth**: next-auth with email magic links (parent/teacher only)

### Core Features Architecture

1. **Multi-tab Canvas System**: Each tab represents a separate pixel art project
2. **AI Integration**: Backend proxy for AI image generation with post-processing
3. **Image Processing Pipeline**: AI generation → quantization (Median Cut) → nearest-neighbor resize
4. **GIF Builder**: Frame management with drag-drop reordering
5. **Local-first**: IndexedDB autosave with optional cloud sync

## Development Commands

### Frontend Commands
```bash
# Install dependencies
npm install

# Development server (frontend)
npm run dev

# Build production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests with watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Linting
npm run lint

# Type checking
npm run type-check

# Code formatting
npm run format

# Check formatting
npm run format:check
```

### Backend Commands (in /backend directory)
```bash
# Development server with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm run start

# Start production with NODE_ENV=production
npm run start:prod

# Database operations
npm run db:generate    # Generate Drizzle schema
npm run db:migrate     # Push schema to database
npm run db:studio      # Open Drizzle Studio

# Testing and linting
npm test
npm run test:watch
npm run test:coverage
npm run lint
npm run lint:fix
npm run type-check
```

## Key Implementation Guidelines

### Canvas & Pixel Art
- Use nearest-neighbor scaling for all pixel operations
- Maintain pixel-perfect rendering at all zoom levels
- Implement efficient canvas diff-rendering for brushes and selections
- Target <16ms per stroke frame for responsive drawing

### AI Image Processing
- Always post-process AI outputs: quantize colors + nearest-neighbor resize
- Generate at 4-8x target size, then downscale
- Support both text-to-image and image-to-image workflows
- Enforce strict palette limits (2-64 colors)
- Optional Floyd-Steinberg dithering (default off for kids)

### Performance Requirements
- Time to First Pixel (TTFP) < 10 seconds
- AI image generation + load into editor ≤ 10 seconds
- Support 13" laptop at 125% zoom
- Use WebAssembly for heavy quantization operations
- Implement off-main-thread workers for processing

### UI/UX Constraints
- Kid-friendly interface with large hit targets (44px minimum)
- High contrast, readable labels with tooltips
- Minimal keyboard requirements, mouse/touch focused
- WCAG AA compliance
- Support English/Korean localization

### Data Model
```
User -> Project -> Frame -> Layer (optional)
```

### API Endpoints Structure
- `POST https://aipixelarteditor-production.up.railway.app/api/ai/generate` - AI image generation with quantization
- `POST https://aipixelarteditor-production.up.railway.app/api/ai/variations` - Generate 4 variations of existing image  
- `POST https://aipixelarteditor-production.up.railway.app/api/project/*` - CRUD operations for projects
- `POST https://aipixelarteditor-production.up.railway.app/api/export/gif` - GIF compilation from frames
- `POST https://aipixelarteditor-production.up.railway.app/api/upload` - Image upload with processing

### Security & Privacy (COPPA Compliance)
- No public profiles by default
- Minimal PII collection (parent/teacher email only)
- Local-only mode for under-13 users
- Server-side API key management
- Rate limiting: 60 AI calls/hour per user

### Testing Strategy
- Focus on canvas operations and pixel accuracy
- Test AI processing pipeline end-to-end
- Validate export formats (PNG with transparency, GIF loops)
- Cross-browser compatibility (Chrome, Edge, Safari latest)
- Performance testing on target hardware

## Code Architecture Overview

### Frontend Structure
- **State Management**: Zustand with Immer for immutable updates and persistence
- **Canvas System**: Multi-frame pixel editor with frame-specific canvas data storage
- **Component Architecture**: 
  - `PixelCanvas`: Main drawing canvas with tool handling
  - `FrameManager`: Multi-frame animation timeline
  - `ProjectTabs`: Multi-project workspace
  - `Toolbar`: Drawing tools and canvas controls
- **AI Integration**: Frontend API calls to backend AI proxy endpoints

### Backend Structure (Fastify + TypeScript)
- **Database**: Drizzle ORM with PostgreSQL
- **Routes**: Modular route handlers (`/routes/*.ts`)
  - `ai.ts`: AI image generation with post-processing
  - `projects.ts`: Project CRUD operations
  - `frames.ts`: Frame management
  - `export.ts`: GIF/image export
  - `upload.ts`: Image upload and processing
- **Services**: Business logic layer (`/services/*.ts`)
  - `openai.ts`: OpenAI API integration
  - `imageProcessing.ts`: Canvas manipulation and quantization
  - `rateLimit.ts`: Redis-based rate limiting
- **Middleware**: Authentication, rate limiting, validation

### Key Data Flow
1. **Project Storage**: Zustand store manages multiple project tabs with frame-specific canvas data
2. **Frame Management**: Each frame stores separate `PixelData` with automatic thumbnail generation
3. **Canvas Sync**: Real-time canvas updates with history tracking for undo/redo
4. **Export Pipeline**: Frame data → scaling → format conversion (PNG/GIF) → download

### Performance Optimizations
- Canvas rendering uses nearest-neighbor scaling for pixel-perfect output
- Thumbnail generation with automatic memory cleanup
- Frame data persistence with selective serialization
- Playback synchronization with optimized canvas updates

## Testing Framework

### Jest Configuration
- Custom Jest config with Next.js integration
- Test environment: `jest-environment-jsdom`
- Module mapping: `@/*` aliases supported
- Coverage thresholds: 70% across branches, functions, lines, statements

### Test Structure
- Unit tests: `__tests__/**/*.{test,spec}.{ts,tsx}`
- Component tests: `components/**/*.test.tsx`
- Utility tests: `lib/utils/__tests__/*.test.ts`
- Integration tests: AI generation, canvas functionality, project store

### Common Test Patterns
```bash
# Run specific test file
npm test -- canvas-functionality.test.ts

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Success Metrics
- 90%+ first-time users export within 10 minutes
- <1% AI request error rate
- Weekly project retention >35%
- Drawing operations feel instant (<16ms response)