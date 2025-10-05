# Video Generation Feature Setup Guide

## Overview

The video generation feature allows users to create smooth pixel art animations from text prompts. It generates a 1-second high-quality video using AI, then automatically converts it to pixel art frames.

**Key Points:**
- ✅ Uses **Luma Dream Machine** API (recommended) or **Runway Gen-3** (fallback)
- ✅ Generates **1-second videos only** (MVP - hardcoded)
- ✅ Extracts **12-30 frames** depending on FPS selection
- ✅ Automatically converts to pixel art using existing `FastVideoProcessor`
- ✅ **NO pixel art keywords** in prompts - requests high-quality video for better downsampling

## Architecture

```
User Prompt → Edge Function → Luma API → Video URL
    ↓
FastVideoProcessor downloads video
    ↓
Extract frames (12/24/30 fps)
    ↓
Convert each frame to pixel art (automatic)
    ↓
Load frames into FrameManager
```

## Setup Instructions

### 1. Get Luma API Key (Recommended - $0.04/generation)

1. **Sign up** at https://lumalabs.ai/dream-machine/api
2. **Purchase credits** in the Build tier:
   - Click "Billing" or "Credits"
   - Add payment method
   - Purchase initial credits (recommend $10-20 for testing)
3. **Generate API key**:
   - Go to "API Keys" or "Developer Settings"
   - Click "Create New Key"
   - Name it "PixelBuddy Production"
   - Copy the key (format: `luma_sk_...`)

### 2. Add API Key to Supabase

```bash
# Set Luma API key in Supabase secrets
npx supabase secrets set LUMA_API_KEY=luma_sk_your_actual_key_here

# Verify it was set
npx supabase secrets list
```

### 3. Deploy Edge Function

```bash
# Deploy the ai-generate-video Edge Function
npx supabase functions deploy ai-generate-video

# Check logs
npx supabase functions logs ai-generate-video
```

### 4. Test the Feature

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open PixelBuddy in browser (http://localhost:3000)

3. In the Project Panel:
   - Look for the "AI Generation" section
   - Click the **"Animation"** button (next to "Image")
   - Enter a prompt like "a cat running"
   - Select FPS (12, 24, or 30)
   - Click "Generate X Frames"

4. Watch the console for logs:
   ```
   🎬 Starting video generation...
   ✅ Video generated: https://storage.lumalabs.ai/...
   🔄 Processing video with FastVideoProcessor...
   ✅ Extracted 24 pixel art frames in 8523ms
   ```

## Alternative: Runway API (Fallback - $0.08/generation)

If you want to use Runway instead of Luma:

1. **Sign up** at https://dev.runwayml.com (NOT app.runwayml.com)
2. **Purchase credits** at $0.01/credit in developer portal
3. **Generate API key** in developer portal
4. **Set in Supabase**:
   ```bash
   npx supabase secrets set RUNWAY_API_KEY=runway_sk_your_key_here
   ```
5. **Modify Edge Function** to use Runway instead of Luma

## Development Mode (No API Key)

The Edge Function has a **development mode** that returns mock data when no API key is set:

```typescript
// In supabase/functions/ai-generate-video/index.ts
const lumaApiKey = Deno.env.get('LUMA_API_KEY') || 'TEMP_LUMA_API_KEY_NOT_SET';

if (lumaApiKey === 'TEMP_LUMA_API_KEY_NOT_SET') {
  // Returns mock response for development
  return mockVideoResponse();
}
```

This allows you to:
- ✅ Test the UI without spending API credits
- ✅ Test the frame extraction pipeline
- ✅ Develop frontend features

**Note:** Mock mode returns a placeholder video URL that won't actually work for frame extraction. Set a real API key to test the full flow.

## Troubleshooting

### Issue: "Video generation failed: SERVICE_NOT_CONFIGURED"
**Solution:** API key not set in Supabase secrets. Run:
```bash
npx supabase secrets set LUMA_API_KEY=your_key_here
```

### Issue: "Edge Function error: 500"
**Solution:** Check Edge Function logs:
```bash
npx supabase functions logs ai-generate-video --tail
```

### Issue: "Failed to load video with HTML5"
**Solution:** The video URL may be invalid or CORS-blocked. Check:
- Video URL is accessible
- CORS headers are set correctly
- Video format is supported (MP4/WebM)

### Issue: Frames are not pixel art quality
**Solution:** This is expected! The prompt enhancement is working correctly:
- ✅ We request HIGH QUALITY video (not pixel art)
- ✅ Client-side `FastVideoProcessor` converts to pixel art
- ✅ Better source quality = better pixel art result

## Cost Estimates

| API | Cost/Generation | Frames @ 24fps | Monthly (100 users, 5 gen/user) |
|-----|----------------|----------------|----------------------------------|
| **Luma** | $0.04 | 24 frames | **$20/month** |
| **Runway** | $0.08 | 24 frames | **$40/month** |
| **Current (Individual frames)** | $0.96 | 24 frames | **$480/month** |

**Savings with Video:** 92-96% cost reduction vs. generating frames individually!

## Feature Limitations (MVP)

- ✅ **Duration:** Exactly 1 second (hardcoded - cannot be changed)
- ✅ **FPS:** 12, 24, or 30 fps only
- ✅ **Max Frames:** 30 frames (at 30 fps)
- ✅ **Quality:** Depends on source video quality from API

## Future Enhancements

See [video-to-frames-feature-prd-v2.md](./video-to-frames-feature-prd-v2.md) for planned features:

- **Phase 3:** Premium tier with 2-5 second videos
- **Phase 4:** Image-to-video mode, camera controls
- **Phase 5:** Smart palette extraction, frame interpolation

## Testing Checklist

- [ ] Luma API key set in Supabase secrets
- [ ] Edge Function deployed successfully
- [ ] Development server running
- [ ] "Animation" button appears in UI
- [ ] Modal opens with prompt input
- [ ] FPS selection works (12/24/30)
- [ ] Generate button triggers video generation
- [ ] Frames load into FrameManager
- [ ] Pixel art quality is good
- [ ] Total time < 15 seconds

## Support

For issues or questions:
- Check Edge Function logs: `npx supabase functions logs ai-generate-video`
- Review browser console for client-side errors
- Check PRD for architectural details: [video-to-frames-feature-prd-v2.md](./video-to-frames-feature-prd-v2.md)

---

**Last Updated:** October 4, 2025
**Feature Status:** MVP Complete - Ready for Testing
