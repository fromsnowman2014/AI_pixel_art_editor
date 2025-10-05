# PRD: AI Video-to-Frames Feature for PixelBuddy (v2.0 - Revised)

> **Chain of Thought Analysis:** This PRD has been revised based on deep analysis of the existing codebase architecture. The key insight is that PixelBuddy already has robust client-side pixel art conversion infrastructure (`MediaImporter`, `FastVideoProcessor`), so we should NOT request pixel art from video APIs. Instead, we generate high-quality videos and let the existing conversion pipeline handle pixelation automatically.

---

## 1. Executive Summary

### Overview
Extend PixelBuddy's AI generation capabilities to support **1-second video generation** (MVP) that automatically converts into a sequence of pixel art frames. This feature leverages AI video generation APIs to create smooth, temporally consistent animations, then uses PixelBuddy's existing client-side conversion pipeline to transform them into pixel art.

**MVP Scope:** 1-second videos only (12-30 frames)
**Future Extension:** 2-5 second videos for premium users (architecture supports this)

### Key Architecture Principle
```
AI Video API (High Quality Video)
    ↓
Download Video (1 second, high resolution)
    ↓
FastVideoProcessor (Extract frames)
    ↓
MediaImporter.pixelateImage() (Automatic pixel art conversion)
    ↓
FrameManager (Load frames for editing)
```

**Critical Design Decision:** Do NOT request "pixel art style" from video APIs. Request high-quality, detailed videos for better downsampling results.

### Success Metrics
- Video generation completion rate >85%
- Frame extraction + conversion time <5 seconds for 1-second video
- User adoption rate >20% of AI image users within first month
- Average frames per video: 12-30 frames (targeting 12-30 fps)
- Pixel art quality rating >4/5 (better source = better pixel art)

### Timeline
- **Phase 1 (MVP):** 3 weeks - 1-second videos only
- **Phase 2 (Optimization):** 2 weeks - Performance & quality improvements
- **Phase 3 (Future/Premium):** TBD - Extended duration support (2-5 seconds)

---

## 2. MVP Scope & Extensibility

### MVP Requirements (Phase 1)
**Hard Constraints:**
- ✅ **Duration:** Exactly 1 second (non-negotiable for MVP)
- ✅ **FPS Options:** 12, 24, or 30 fps (12-30 frames total)
- ✅ **API Cost:** $0.04 per generation (Luma) or $0.08 (Runway)
- ✅ **User Tier:** All users (no premium required)

**Why 1 Second Only?**
1. **Cost Control:** Keeps per-generation cost low ($0.04-$0.08)
2. **Performance:** Fast processing (<10s total time)
3. **Use Case Fit:** Perfect for GIF loops and sprite animations
4. **Validation:** Test market demand before investing in longer videos

### Extensibility Architecture

The system is designed to support longer videos in the future **without code rewrites**:

```typescript
// Current MVP implementation
const duration = 1.0; // Hardcoded

// Future premium implementation (no architecture changes needed)
const userTier = await getUserTier(userId);
const maxDuration = userTier === 'premium' ? 5.0 : 1.0;
const duration = Math.min(request.duration || 1.0, maxDuration);
```

**Extension Points:**
1. ✅ `duration` parameter already exists in API interfaces
2. ✅ `FastVideoProcessor` already handles videos of any length
3. ✅ `FrameManager` already supports 100+ frames
4. ✅ Cost calculation scales linearly with duration

**Future Premium Tiers:**
- **Free:** 1 second (12-30 frames) - $0.04-$0.08/generation
- **Premium:** 2-5 seconds (24-150 frames) - $0.08-$0.40/generation
- **Enterprise:** Custom durations - Custom pricing

---

## 3. Problem Statement

### Current Limitations
- Users must generate individual frames one-by-one using AI image generation
- Creating smooth animations requires 8-30+ separate AI calls
- No coherent motion or temporal consistency between frames
- Time-consuming and credit-intensive for animation workflows
- Manual frame-by-frame generation lacks smooth motion

### User Pain Points
- "I want to create animated pixel art but generating each frame separately is too slow"
- "The AI-generated frames don't flow together smoothly - there's no motion continuity"
- "It costs too many credits to generate a full animation sequence"
- "I can't create realistic movement like walking, running, or dancing"

---

## 3. Proposed Solution

### Core Feature: Smart Video-to-Pixel-Art Pipeline

**Philosophy:** Generate the best possible video first, then convert to pixel art using existing infrastructure.

```
User Prompt (e.g., "cat running")
    ↓
Supabase Edge Function: ai-generate-video
    ↓
Luma/Runway API: Generate HIGH QUALITY video (NOT pixel art)
    ↓
Download MP4/WebM video file
    ↓
FastVideoProcessor.processVideoFast()
    ├─ Extract frames at target FPS
    ├─ Nearest-neighbor downscale to canvas size
    └─ Color quantization (median-cut)
    ↓
Return pixel art frames (already processed)
    ↓
Frontend: Load into FrameManager
    ↓
User: Edit/Export as GIF
```

### Key Workflows

#### Primary Flow: Text-to-Video-to-Pixel-Frames

```
1. User Input
   - Prompt: "a cute cat running"
   - FPS: 24
   - Canvas size: 64x64
   - Color count: 16

2. Backend: Supabase Edge Function
   - Enhance prompt: "a cute cat running, high quality animation, smooth motion, detailed"
   - Call Luma API with enhanced prompt
   - Get video URL (1024x1024 @ 24fps, 1 second)
   - Return video URL to client

3. Frontend: FastVideoProcessor
   - Download video via proxy
   - Extract 24 frames using HTML5 video API
   - For each frame:
     * Downscale 1024x1024 → 64x64 (nearest-neighbor)
     * Quantize to 16 colors (median-cut algorithm)
   - Return 24 pixel art frames

4. Frontend: FrameManager
   - Load all 24 frames into project
   - Set frame delay: 1000ms / 24 = ~42ms per frame
   - Auto-play preview
   - User can edit individual frames or export as GIF
```

#### Alternative Flow: Video Import-to-Frames (Already Implemented!)

```
User uploads local video file
    ↓
FastVideoProcessor.processVideoFast(file, options)
    ↓
Automatic frame extraction + pixel art conversion
    ↓
Load into FrameManager
```

**Note:** This flow ALREADY EXISTS in the codebase. We're just adding AI generation to feed it!

---

## 4. Video Generation API Comparison & Recommendations

### Recommended APIs (October 2025)

#### 🥇 **Option 1: Luma Dream Machine (RECOMMENDED)**

**Why Luma?**
- **Best Price-to-Quality**: $0.04 per second (cheapest option)
- **No Waitlist**: Immediate API access
- **Camera Control**: Virtual camera movement for better animations
- **Fast Generation**: "Hyperfast" generation speeds
- **High Quality Output**: Better source material for pixel art conversion

**Pricing Structure**
- **Build Tier** (Pay-as-you-go):
  - $0.04 per second of video generated
  - 1-second video = $0.04 per generation
  - Credit-based billing
  - Users own inputs/outputs

**API Capabilities**
- Text-to-video generation ✅
- Image-to-video conversion ✅
- Video extension/looping ✅
- Variable aspect ratios ✅
- Camera control ✅ (great for character rotations, walk cycles)

**How to Get Started**
1. Sign up at https://lumalabs.ai/dream-machine/api
2. Purchase credits in the Build tier
3. Generate API key from dashboard
4. Use Ray2 model for video generation

**Code Integration Example (REVISED)**
```typescript
// Supabase Edge Function: ai-generate-video
const LUMA_API_KEY = Deno.env.get('LUMA_API_KEY');

// IMPORTANT: Do NOT add pixel art keywords here!
// Request high-quality video for better downsampling
const enhancedPrompt = enhancePromptForVideo(userPrompt); // No pixel art keywords

const response = await fetch('https://api.lumalabs.ai/v1/generations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LUMA_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'ray2',
    prompt: enhancedPrompt, // "cat running, high quality, smooth motion"
    duration: 1.0,
    aspect_ratio: '1:1',
    loop: false,
    quality: 'high' // Request HIGHEST quality for better pixel art conversion
  })
});
```

**Prompt Enhancement Strategy:**
```typescript
function enhancePromptForVideo(prompt: string): string {
  // DO NOT add "pixel art", "8-bit", "pixelated", etc.
  // These would reduce video quality and hurt downsampling

  const qualityKeywords = [
    'high quality',
    'detailed',
    'clear',
    'smooth motion',
    'fluid animation',
    'consistent style'
  ];

  // Add quality enhancement, not style degradation
  return `${prompt}, high quality animation, smooth motion, detailed, clear, consistent style`;
}
```

---

#### 🥈 **Option 2: Runway Gen-3 Alpha Turbo (Fallback)**

**Why Runway?**
- Industry-leading quality
- Proven reliability
- Good for high-quality source material

**Pricing:** $0.08/second (2x Luma)

**Code Integration (REVISED)**
```typescript
const RUNWAY_API_KEY = Deno.env.get('RUNWAY_API_KEY');

// Again: HIGH QUALITY, not pixel art
const enhancedPrompt = enhancePromptForVideo(userPrompt);

const response = await fetch('https://api.dev.runwayml.com/v1/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RUNWAY_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gen3a_turbo',
    prompt: enhancedPrompt,
    duration: 1,
    resolution: '1280x1280', // High res for better downsampling
    quality: 'high'
  })
});
```

---

### API Comparison Matrix (Updated)

| Feature | Luma Dream Machine | Runway Gen-3 Turbo |
|---------|-------------------|-------------------|
| **Price/Second** | $0.04 | $0.08 |
| **Output Quality** | Excellent (1024x1024+) | Excellent (1280x1280) |
| **Best For** | Cost-effective high-quality source | Premium quality source |
| **Pixel Art Suitability** | ✅ Perfect (high detail → clean pixels) | ✅ Perfect (highest detail) |
| **Camera Control** | ✅ Yes (walk cycles, rotations) | ❌ No |

### Final Recommendation: **Luma Dream Machine**

**Reasoning (CoT):**
1. **50% cheaper** than Runway ($0.04 vs $0.08)
2. **High enough quality** for excellent pixel art conversion
3. **Camera control** enables advanced animations (character rotations, walk cycles from multiple angles)
4. **Immediate access** without waitlist
5. **Quality sweet spot:** High enough for good downsampling, not overkill

**Critical Understanding:**
- We're NOT asking the API to make pixel art
- We're asking for the BEST VIDEO possible
- Client-side conversion handles pixelation automatically
- Higher quality input = better pixel art output

---

## 5. Technical Architecture (REVISED)

### Backend: Supabase Edge Function

#### New Edge Function: `ai-generate-video`

```typescript
// supabase/functions/ai-generate-video/index.ts

interface VideoGenerateRequest {
  prompt: string;
  width: number;  // Target pixel art dimensions (e.g., 64x64)
  height: number;
  colorCount: number; // For client-side quantization
  fps?: 12 | 24 | 30; // Target FPS for frame extraction
  duration?: number; // MVP: Always 1.0 (hardcoded), Future: 1-5 seconds for premium
}

interface VideoGenerateResponse {
  success: boolean;
  data?: {
    videoUrl: string; // URL to download video (MP4/WebM)
    sourceWidth: number; // Original video dimensions (e.g., 1024x1024)
    sourceHeight: number;
    duration: number;
    prompt: string;
    enhancedPrompt: string; // What we actually sent to Luma
    processingTimeMs: number;

    // Client-side processing instructions
    clientProcessing: {
      targetWidth: number;
      targetHeight: number;
      targetFps: number;
      colorCount: number;
      method: 'FastVideoProcessor'; // Tell client which processor to use
    };
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}
```

#### Simplified Backend Processing (No Frame Extraction!)

```typescript
// Backend ONLY generates video and returns URL
// Client handles ALL frame extraction and pixel art conversion

async function generateVideo(request: VideoGenerateRequest): Promise<VideoGenerateResponse> {
  const startTime = Date.now();

  // Step 1: Validate and enforce duration for MVP
  // MVP: Always 1.0 second (ignore any user input)
  // Future: Premium users can request 1-5 seconds
  const duration = 1.0; // Hardcoded for MVP

  if (request.duration && request.duration !== 1.0) {
    console.warn(`Duration ${request.duration} requested but MVP only supports 1.0s`);
  }

  // Step 2: Enhance prompt for HIGH QUALITY video (not pixel art!)
  const enhancedPrompt = enhancePromptForVideo(request.prompt);

  console.log(`Original: ${request.prompt}`);
  console.log(`Enhanced: ${enhancedPrompt}`);
  console.log(`Duration: ${duration}s (MVP: hardcoded to 1.0s)`);
  // Original: "cat running"
  // Enhanced: "cat running, high quality animation, smooth motion, detailed, clear"

  // Step 3: Call Luma API
  const lumaResponse = await fetch('https://api.lumalabs.ai/v1/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('LUMA_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'ray2',
      prompt: enhancedPrompt,
      duration: duration, // Always 1.0 for MVP
      aspect_ratio: '1:1',
      quality: 'high' // IMPORTANT: Request highest quality
    })
  });

  const lumaData = await lumaResponse.json();
  const videoUrl = lumaData.data.video_url; // e.g., https://storage.lumalabs.ai/xyz.mp4

  // Step 4: Return video URL and processing instructions
  // NO frame extraction on server!
  return {
    success: true,
    data: {
      videoUrl, // Client will download this
      sourceWidth: 1024, // Luma default
      sourceHeight: 1024,
      duration: duration, // Always 1.0 for MVP
      prompt: request.prompt,
      enhancedPrompt,
      processingTimeMs: Date.now() - startTime,

      // Instructions for client-side processing
      clientProcessing: {
        targetWidth: request.width,
        targetHeight: request.height,
        targetFps: request.fps || 24,
        colorCount: request.colorCount,
        method: 'FastVideoProcessor', // Use existing processor
        maxDuration: 1.0 // MVP: enforce 1 second limit
      }
    }
  };
}

// Future extension point for premium users
// async function generateExtendedVideo(request: VideoGenerateRequest, userTier: 'free' | 'premium'): Promise<VideoGenerateResponse> {
//   const maxDuration = userTier === 'premium' ? 5.0 : 1.0;
//   const duration = Math.min(request.duration || 1.0, maxDuration);
//   // ... rest of implementation
// }
```

**Key Insight:** Backend is MUCH simpler because we reuse existing client-side infrastructure!

---

### Frontend Integration (REVISED)

#### Service Layer: `supabase-ai.ts` Extension

```typescript
// lib/services/supabase-ai.ts

interface SupabaseVideoGenerateRequest {
  prompt: string;
  width: number;
  height: number;
  colorCount: number;
  fps?: 12 | 24 | 30;
}

interface SupabaseVideoGenerateResponse {
  success: boolean;
  data?: {
    frames: Array<{
      frame: Frame;
      imageData: number[];
    }>;
    totalFrames: number;
    fps: number;
    processingTimeMs: number;
    prompt: string;
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

class SupabaseAIService {
  /**
   * Generate AI video and convert to pixel art frames
   * Reuses existing FastVideoProcessor infrastructure
   */
  async generateVideo(params: SupabaseVideoGenerateRequest): Promise<SupabaseVideoGenerateResponse> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      console.log(`🎬 [${requestId}] Starting video-to-frames generation`);

      // Step 1: Call Edge Function to generate video
      const edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/ai-generate-video`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey
        },
        body: JSON.stringify({
          ...params,
          duration: 1.0 // MVP: Always 1 second (backend will enforce this)
        })
      });

      if (!response.ok) {
        throw new Error(`Video generation failed: ${response.statusText}`);
      }

      const videoData = await response.json();
      console.log(`✅ [${requestId}] Video generated:`, videoData.data.videoUrl);

      // Step 2: Download video and process with FastVideoProcessor
      // This is where the magic happens - reusing existing infrastructure!

      const { FastVideoProcessor } = await import('@/lib/domain/fast-video-processor');

      const processingOptions = {
        width: params.width,
        height: params.height,
        colorCount: params.colorCount,
        maxFrames: params.fps === 12 ? 12 : params.fps === 24 ? 24 : 30
      };

      console.log(`🔄 [${requestId}] Processing video with FastVideoProcessor...`);

      // Use existing video processor (already handles pixel art conversion!)
      const importResult = await FastVideoProcessor.processVideoFast(
        videoData.data.videoUrl,
        processingOptions,
        (progress: number, message: string) => {
          console.log(`📊 [${requestId}] ${progress}%: ${message}`);
        }
      );

      console.log(`✅ [${requestId}] Extracted ${importResult.frames.length} pixel art frames`);

      // Step 3: Return processed frames (already in pixel art format!)
      return {
        success: true,
        data: {
          frames: importResult.frames, // Already pixel art!
          totalFrames: importResult.frames.length,
          fps: params.fps || 24,
          processingTimeMs: Date.now() - startTime,
          prompt: params.prompt
        }
      };

    } catch (error) {
      console.error(`❌ [${requestId}] Video generation error:`, error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'VIDEO_GENERATION_ERROR',
          details: { requestId, processingTimeMs: Date.now() - startTime }
        }
      };
    }
  }
}
```

**Key Advantages of This Approach:**
1. ✅ **Reuses existing `FastVideoProcessor`** - No duplication
2. ✅ **Automatic pixel art conversion** - Uses proven `MediaImporter.pixelateImage()`
3. ✅ **Consistent quality** - Same conversion logic as video import
4. ✅ **Less backend complexity** - No server-side frame extraction
5. ✅ **Better error handling** - Reuses tested code paths

---

## 6. Implementation Plan (REVISED)

### Phase 1: MVP (3 weeks - Reduced from 4!)

#### Week 1: Backend Foundation
- [ ] Set up Luma API credentials in Supabase secrets
- [ ] Create `ai-generate-video` Edge Function
- [ ] Implement Luma API integration (text-to-video)
- [ ] **Hardcode duration to 1.0 seconds** (MVP requirement)
- [ ] **Focus on HIGH QUALITY prompts, not pixel art prompts**
- [ ] Return video URL (no frame extraction on server)
- [ ] Test video generation quality (should be detailed, NOT pixelated)
- [ ] Add logging to warn if user requests duration != 1.0

#### Week 2: Frontend Integration (Reuse Existing Code!)
- [ ] Extend `supabase-ai.ts` with `generateVideo()` method
- [ ] **Integrate `FastVideoProcessor.processVideoFast()`** (already exists!)
- [ ] Create `VideoGenerationModal` component
- [ ] Add UI for fps selection and prompt input
- [ ] Test end-to-end flow: Prompt → Video → Frames → FrameManager
- [ ] Verify pixel art quality (should be excellent!)

#### Week 3: Testing & Polish
- [ ] End-to-end testing with diverse prompts
- [ ] Performance optimization (target <10s total time)
- [ ] Error handling and user feedback
- [ ] Rate limiting integration
- [ ] Compare quality: AI video frames vs. individual frame generation

**Estimated Time Savings:** 1 week (reusing existing `FastVideoProcessor` and `MediaImporter`)

---

## 7. Prompt Engineering Strategy (CRITICAL UPDATE)

### ❌ OLD Approach (WRONG)
```typescript
// DON'T DO THIS!
function enhancePromptForPixelArt(prompt: string): string {
  return `pixel art style, 8-bit retro, ${prompt}, pixelated, blocky`;
}
// Result: Low-quality pixelated video → Poor pixel art after conversion
```

### ✅ NEW Approach (CORRECT)
```typescript
function enhancePromptForVideo(prompt: string): string {
  // Request HIGH QUALITY for better downsampling
  return `${prompt}, high quality animation, smooth motion, detailed, clear, consistent style`;
}
// Result: High-quality detailed video → Excellent pixel art after conversion
```

### Reasoning (Chain of Thought)

**Why request high quality instead of pixel art?**

1. **Video API Output:** 1024x1024 @ 24fps
2. **Target Canvas:** 64x64 @ 24fps
3. **Downsampling ratio:** 16:1 (1024 ÷ 64)

**Scenario A: Request "pixel art style" from API**
- API generates low-detail, blocky 1024x1024 video
- Already pixelated at source
- Downsample 16:1 → Loses detail, becomes muddy
- Color quantization has less information to work with
- **Result:** Poor quality pixel art

**Scenario B: Request "high quality" from API**
- API generates detailed, smooth 1024x1024 video
- Rich detail and color gradients
- Downsample 16:1 → Nearest-neighbor creates crisp pixels
- Color quantization intelligently reduces colors
- **Result:** Excellent pixel art with clear edges

**Conclusion:** Always request the HIGHEST quality from video APIs, then let client-side conversion handle pixelation.

### Example Prompts

```typescript
// User Input: "cat running"

// ❌ BAD (Old approach)
const badPrompt = "pixel art style, 8-bit, cat running, pixelated, blocky";
// → Luma generates low-quality blocky video
// → Poor pixel art result

// ✅ GOOD (New approach)
const goodPrompt = "cat running, high quality animation, smooth motion, detailed fur, clear features";
// → Luma generates high-quality detailed video
// → Excellent pixel art result after downsampling
```

---

## 8. Cost Analysis (MVP: 1-Second Videos Only)

### Per-Generation Costs (1 Second)

| Approach | Cost/Generation | Frames | Duration | Quality |
|----------|----------------|--------|----------|---------|
| **Current (Individual Frames)** | $0.48-$1.20 | 12-30 | N/A | ❌ No temporal consistency |
| **MVP (Luma Video)** | **$0.04** | 12-30 | 1s | ✅ Smooth animation |
| **MVP (Runway Video)** | **$0.08** | 12-30 | 1s | ✅ Smooth animation |

### Future Premium Cost Scaling (Not in MVP)

| Duration | Luma Cost | Runway Cost | Max Frames (30fps) |
|----------|-----------|-------------|-------------------|
| 1 second (MVP) | $0.04 | $0.08 | 30 frames |
| 2 seconds (Future) | $0.08 | $0.16 | 60 frames |
| 3 seconds (Future) | $0.12 | $0.24 | 90 frames |
| 5 seconds (Future) | $0.20 | $0.40 | 150 frames |

### Savings Calculation

**24-frame animation:**
- Current: 24 × $0.04 = **$0.96**
- Luma video: **$0.04** (24x cheaper!)
- Runway video: **$0.08** (12x cheaper!)

**Savings:** $0.88-$0.92 per animation (92-96% cost reduction)

**Additional Benefits:**
- ✅ Temporal consistency (smooth motion)
- ✅ Realistic physics and movement
- ✅ Better than manual frame-by-frame
- ✅ 10x faster workflow

---

## 9. Quality Comparison

### Current Approach (Individual Frame Generation)

```
Frame 1: "cat standing"
  → OpenAI generates static image
  → Convert to pixel art

Frame 2: "cat lifting front paw"
  → OpenAI generates different cat (no consistency!)
  → Convert to pixel art

Frame 3: "cat mid-step"
  → OpenAI generates yet another cat style
  → Convert to pixel art
```

**Problems:**
- ❌ No motion consistency
- ❌ Character design changes between frames
- ❌ Unnatural movement
- ❌ Manual prompt engineering for each frame

### New Approach (Video Generation)

```
Single Prompt: "cat running, high quality, smooth motion"
  → Luma generates 1-second video with realistic running motion
  → Download 1024x1024 @ 24fps
  → FastVideoProcessor extracts 24 frames
  → Each frame downsampled to 64x64 (nearest-neighbor)
  → Each frame quantized to 16 colors (median-cut)
  → Result: 24 pixel art frames with smooth, realistic motion
```

**Advantages:**
- ✅ Perfect temporal consistency
- ✅ Natural physics and movement
- ✅ Character design stays consistent
- ✅ One prompt for entire animation
- ✅ Professional-quality motion

---

## 10. Testing Strategy (Updated)

### Unit Tests
- Prompt enhancement (ensure NO pixel art keywords)
- Video URL validation
- Error handling for API failures

### Integration Tests
- End-to-end: Prompt → Luma API → FastVideoProcessor → Frames
- Verify `FastVideoProcessor` integration
- Verify `MediaImporter.pixelateImage()` is called correctly
- Test color quantization quality

### Quality Tests
- **Compare source quality:**
  - Generate with "pixel art style" prompt
  - Generate with "high quality" prompt
  - Downsample both to pixel art
  - Measure quality difference (should be significant!)

- **Frame consistency:**
  - Verify temporal coherence
  - Check character design consistency
  - Measure motion smoothness

### Performance Tests
- Total time: Prompt → Frames (target <10s)
- Video download time (1-3s)
- Frame extraction time (2-4s)
- Pixel art conversion time (1-2s)

---

## 11. Success Criteria (Updated)

### Launch Criteria
- ✅ Video generation completes in <10 seconds
- ✅ Frame extraction produces 12-30 clean frames
- ✅ Pixel art quality better than individual frame generation
- ✅ Smooth temporal consistency (no frame jumping)
- ✅ Error rate <5%

### Quality Benchmarks
- **Motion smoothness:** >80% user satisfaction
- **Character consistency:** >90% (vs. <40% with individual frames)
- **Pixel art quality:** 4.5/5 average rating
- **Cost savings:** 92-96% vs. current approach

---

## 12. Risk Analysis & Mitigations (Updated)

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Video API returns low quality** | High | Request "high quality" explicitly, use Runway fallback |
| **FastVideoProcessor breaks** | High | Thoroughly test existing code, add error handling |
| **Video download slow** | Medium | Use progressive loading, show progress indicator |
| **Pixel art conversion quality poor** | High | Test with high-quality source material first |

### Design Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Users expect pixel art from API** | Medium | Educate users: "AI generates HD video, we convert to pixel art" |
| **Prompt confusion** | Low | Clear UI: "Describe your animation (we'll optimize it)" |

---

## 13. Future Enhancements

### Phase 3: Premium Extended Duration
- **Extended video duration** (Premium feature):
  - Free tier: 1 second (12-30 frames)
  - Premium tier: 2-5 seconds (24-150 frames)
  - Architecture supports this via `duration` parameter
  - Cost scaling: 2s video = 2x API cost ($0.08 Luma)

- **Implementation approach:**
  ```typescript
  // Add user tier check in Edge Function
  const userTier = await getUserTier(userId);
  const maxDuration = userTier === 'premium' ? 5.0 : 1.0;
  const duration = Math.min(request.duration || 1.0, maxDuration);
  ```

### Phase 4: Advanced Features
- **Image-to-video mode:** Extend single frame into animation
  - Example: Static "cat standing" → "cat starts walking"
  - Uses Luma's image-to-video capability

- **Camera control:** Use Luma's camera movement features
  - Rotate around character
  - Zoom in/out
  - Pan left/right

- **Multi-shot sequences:** Chain multiple videos together
  - Example: "cat walks, then jumps, then lands"
  - Combine 2-3 1-second clips

### Phase 5: Quality Improvements
- **Smart palette extraction:** Detect dominant colors across all frames
- **Dithering options:** Floyd-Steinberg for smoother gradients
- **Frame interpolation:** Generate 48fps from 24fps for ultra-smooth GIFs
- **Seamless looping:** Auto-detect and optimize loop points for perfect GIF loops

---

## 14. Documentation Requirements

### Developer Docs
- ✅ "Why we don't request pixel art from video APIs"
- ✅ Prompt engineering guide (high quality, not pixel style)
- ✅ FastVideoProcessor integration guide
- ✅ Quality testing procedures

### User Docs
- "How to create animated pixel art from AI video"
- Best practices for animation prompts
- FPS guide (12 vs 24 vs 30)
- Troubleshooting guide

---

## 15. Appendix: Chain of Thought Summary

### Key Insights from Codebase Analysis

1. **Existing Infrastructure is Robust**
   - `MediaImporter` handles image → pixel art conversion
   - `FastVideoProcessor` handles video → frames extraction
   - Both support automatic color quantization
   - Both use nearest-neighbor scaling

2. **Prompt Enhancement is Smart**
   - `prompt-enhancer.ts` has sophisticated CoT reasoning
   - Automatically adds pixel art keywords for IMAGE generation
   - Should NOT add pixel art keywords for VIDEO generation
   - Client-side conversion handles pixelation

3. **Architecture is Client-Heavy**
   - Server: Generate video, return URL
   - Client: Download, extract frames, convert to pixel art
   - This is CORRECT - reduces server load, reuses code

4. **Quality Principle**
   - High-quality source → Better pixel art
   - Request detailed videos, not pixelated videos
   - Downsampling + quantization creates pixel art effect
   - This is how professional pixel art is made

### Design Decisions

| Decision | Reasoning |
|----------|-----------|
| **Don't request pixel art from API** | Better to downsample high-quality video |
| **Reuse FastVideoProcessor** | Already tested, handles video → frames perfectly |
| **Client-side conversion** | Consistent with existing image import flow |
| **Target high quality** | Better source material = better pixel art |
| **Luma over Runway** | 50% cheaper, sufficient quality |

---

## Contact & Ownership

**Product Owner:** [Your Name]
**Tech Lead:** [Tech Lead Name]
**AI/ML Specialist:** [AI Specialist Name]

**Questions?** Open GitHub issue or contact product team.

---

**Last Updated:** October 4, 2025
**Status:** v2.1 - MVP Scope Clarified (1-Second Only)
**Next Review:** October 11, 2025

**Key Changes from v2.0:**
- ✅ **Hardcoded 1-second duration for MVP** (non-negotiable)
- ✅ Added MVP Scope & Extensibility section
- ✅ Documented future premium tier architecture
- ✅ Updated cost analysis with duration scaling
- ✅ Added implementation notes for duration enforcement
- ✅ Clarified Phase 3 = Premium Extended Duration

**Key Changes from v1.0:**
- ✅ Removed pixel art keywords from video prompts
- ✅ Emphasized high-quality video generation
- ✅ Integrated existing `FastVideoProcessor` and `MediaImporter`
- ✅ Simplified backend (no server-side frame extraction)
- ✅ Reduced timeline from 4 weeks to 3 weeks (reusing code)
- ✅ Added Chain of Thought reasoning throughout
- ✅ Updated quality benchmarks and success criteria
