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

### Backend (Supabase)
- **Runtime**: Supabase Edge Functions (Deno runtime)
- **AI Service**: Direct OpenAI API integration via Edge Functions
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth with OAuth providers
- **Storage**: Supabase Storage for images
- **Security**: Server-side API key management

### Core Features Architecture

1. **Multi-tab Canvas System**: Each tab represents a separate pixel art project
2. **AI Integration**: Supabase Edge Functions for secure AI image generation with post-processing
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

### Supabase Commands
```bash
# Deploy Edge Functions
npx supabase functions deploy ai-generate

# Check Edge Function logs
npx supabase functions logs ai-generate

# Run Edge Functions locally
npx supabase functions serve ai-generate

# Database operations
npx supabase db pull          # Pull schema changes
npx supabase db push          # Push schema changes
npx supabase studio           # Open Supabase Studio
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
- `POST https://fdiwnymnikylraofwhdu.supabase.co/functions/v1/ai-generate` - AI image generation via Supabase Edge Function
- Local project operations via IndexedDB and optional Supabase sync
- Client-side GIF compilation and export
- Direct image upload to Supabase Storage

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
- **AI Integration**: Direct calls to Supabase Edge Functions with client-side orchestration

### Backend Structure (Supabase)
- **Edge Functions**: Deno-based serverless functions
  - `ai-generate`: Secure OpenAI API integration with image processing
- **Database**: Supabase PostgreSQL with automatic schema management
- **Storage**: Supabase Storage for user-generated content
- **Auth**: Supabase Auth with OAuth provider integration
- **Services**: Client-side business logic
  - `supabase-ai.ts`: Edge Function client integration
  - `media-importer.ts`: Local image processing
  - Rate limiting via Supabase built-in features

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

## Project File Structure

### Frontend Architecture (Next.js App Router)
```
app/                          # Next.js App Router pages
├── page.tsx                  # Main pixel editor page
├── layout.tsx                # Root layout with providers
├── auth/signin/              # Authentication pages
└── test/                     # Development test pages

components/                   # React components
├── ui/                       # Reusable UI components (Button, Input, Toast, etc.)
├── mobile/                   # Mobile-optimized components
├── pixel-canvas.tsx          # Main drawing canvas component
├── pixel-editor.tsx          # Complete pixel editor layout
├── toolbar.tsx               # Drawing tools sidebar
├── frame-manager.tsx         # Animation timeline
├── project-tabs.tsx          # Multi-project workspace
├── color-palette.tsx         # Color selection interface
└── [various modals]          # Import, Export, Save modals

lib/                          # Core business logic
├── stores/                   # Zustand state management
│   ├── project-store.ts      # Main project state (multi-tab, frames)
│   └── auth-store.ts         # Authentication state
├── services/                 # External service integrations
│   ├── media-importer.ts     # Image/video import processing
│   ├── prompt-enhancer.ts    # AI prompt optimization
│   └── api-middleware.ts     # API client wrapper
├── core/                     # Core canvas operations
│   ├── magic-wand.ts         # Magic wand selection tool
│   └── canvas-analysis.ts    # Canvas content analysis
├── utils/                    # Utility functions
│   ├── thumbnail-generator.ts # Frame thumbnail creation
│   └── device-detection.ts   # Mobile/desktop detection
└── types/                    # TypeScript type definitions
```

### Backend Architecture (Supabase)
```
supabase/
├── functions/                # Edge Functions (Deno runtime)
│   └── ai-generate/
│       └── index.ts          # AI image generation with OpenAI integration
├── migrations/               # Database schema migrations
└── config.toml              # Supabase configuration

lib/services/                # Client-side services
├── supabase-ai.ts           # Edge Function client integration
├── media-importer.ts        # Local image processing
└── api-middleware.ts        # API client wrapper
```

## Playwright Testing

The project includes Playwright for end-to-end testing:

```bash
# Run Playwright tests
npx playwright test

# Run Playwright tests with UI
npx playwright test --ui

# Run specific test
npx playwright test canvas-functionality.test.ts
```