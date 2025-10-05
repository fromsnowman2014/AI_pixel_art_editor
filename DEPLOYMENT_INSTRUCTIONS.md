# Video Generation Feature - Deployment Instructions

## Current Status

✅ **Code Implementation**: Complete
- Edge Function: `supabase/functions/ai-generate-video/index.ts`
- Frontend Service: `lib/services/supabase-ai.ts`
- UI Components: `components/video-generation-modal.tsx`, `components/project-panel.tsx`

❌ **Deployment**: Required
- Edge Function is NOT yet deployed to Supabase
- Luma API key is NOT yet set in Supabase secrets

## Deployment Steps

### Step 1: Set Luma API Key in Supabase

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to [Supabase Secrets Management](https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/settings/vault)
2. Click **"New Secret"**
3. Enter:
   - **Name**: `LUMA_API_KEY`
   - **Value**: `luma-939a50e2-9fc2-46a5-aac1-cf9514b0431c-0b3b9524-ad2a-413e-9b40-5ed21ff4992b`
4. Click **"Create Secret"**

**Option B: Using Supabase CLI**

```bash
npx supabase secrets set LUMA_API_KEY=luma-939a50e2-9fc2-46a5-aac1-cf9514b0431c-0b3b9524-ad2a-413e-9b40-5ed21ff4992b --project-ref fdiwnymnikylraofwhdu
```

### Step 2: Deploy Edge Function

**Option A: Using Supabase Dashboard**

1. Go to [Edge Functions](https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/functions)
2. Click **"Deploy New Function"** or **"New Function"**
3. Enter:
   - **Function Name**: `ai-generate-video`
   - **Code**: Copy contents from `supabase/functions/ai-generate-video/index.ts`
4. Click **"Deploy"**

**Option B: Using Supabase CLI**

```bash
# Make sure you're logged in
npx supabase login

# Link to the project (if not already linked)
npx supabase link --project-ref fdiwnymnikylraofwhdu

# Deploy the function
npx supabase functions deploy ai-generate-video --project-ref fdiwnymnikylraofwhdu
```

### Step 3: Verify Deployment

Run the test script to verify everything is working:

```bash
export NEXT_PUBLIC_SUPABASE_URL=https://fdiwnymnikylraofwhdu.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaXdueW1uaWt5bHJhb2Z3aGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDQ0MzQsImV4cCI6MjA3MjE4MDQzNH0.unmMqI6awTpbzZwAFRHwv7ApX9ia14T3ukr9umVAk_M
npx tsx scripts/test-video-generation.ts
```

Expected output:
```
✅ Edge Function is deployed and accessible
✅ Response structure matches PRD specification
✅ Prompt enhancement follows HIGH QUALITY strategy (no pixel art keywords)
✅ Client processing instructions are correct
✅ MVP duration enforcement (1.0s) is working
```

### Step 4: Test in Production

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Click the **"Animation"** button in the AI generation panel

4. Enter a prompt like "a cute cat running"

5. Select FPS (12, 24, or 30)

6. Click **"Generate Animation"**

7. Wait for:
   - Video generation (3-5 seconds)
   - Frame extraction (2-3 seconds)
   - Pixel art conversion (1-2 seconds)

8. Verify:
   - Frames are loaded into the editor
   - Animation plays smoothly
   - Pixel art quality is good
   - Colors are quantized correctly

## Troubleshooting

### Error: "Requested function was not found" (404)
**Solution**: Edge Function is not deployed. Follow Step 2 above.

### Error: "Invalid API key" or "Unauthorized"
**Solution**: Luma API key is not set or incorrect. Follow Step 1 above.

### Error: "TEMP_LUMA_API_KEY_NOT_SET"
**Solution**: Edge Function is deployed but API key is missing. Follow Step 1 above.

### Frames are low quality
**Check**: Prompt enhancement should add "high quality, detailed, smooth motion" NOT "pixel art style"

### Frames are not pixel art
**Check**: FastVideoProcessor should be called with correct colorCount and dimensions

## Testing Without Real Luma API

The Edge Function has a **development mode** that returns mock responses when `LUMA_API_KEY` is not set:

```typescript
if (lumaApiKey === 'TEMP_LUMA_API_KEY_NOT_SET') {
  console.log('DEVELOPMENT MODE: Returning mock response');
  // Returns mock video URL
}
```

This allows testing the complete flow except for actual AI video generation.

## Cost Monitoring

Each video generation costs:
- **Luma**: $0.04 per 1-second video
- **Frames**: 12-30 frames depending on FPS selection
- **Savings**: 92-96% vs. generating individual frames ($0.04 vs $0.48-$1.20)

Monitor usage in [Luma Dashboard](https://lumalabs.ai/dream-machine/api).

## Next Steps After Deployment

1. ✅ Verify all test cases pass
2. ✅ Test with various prompts (animals, characters, objects)
3. ✅ Test all FPS options (12, 24, 30)
4. ✅ Verify pixel art quality
5. ✅ Test GIF export with generated frames
6. ✅ Monitor API costs and performance
7. ✅ Collect user feedback

## Support

- **Luma API Docs**: https://lumalabs.ai/dream-machine/api
- **Supabase Edge Functions Docs**: https://supabase.com/docs/guides/functions
- **Project PRD**: [docs/video-to-frames-feature-prd-v2.md](docs/video-to-frames-feature-prd-v2.md)
