# 🚀 Deploy Video Generation Feature - Quick Guide

## Status: CLI Authentication Failed ⚠️

The Supabase CLI is experiencing authentication issues. **Deploy manually using the Dashboard** (fastest method).

---

## Step 1: Set Luma API Key (2 minutes)

### Option A: Supabase Dashboard (Recommended) ✅

1. **Open Secrets Vault**: https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/settings/vault

2. **Click "New Secret"**

3. **Enter values**:
   ```
   Name: LUMA_API_KEY
   Value: luma-939a50e2-9fc2-46a5-aac1-cf9514b0431c-0b3b9524-ad2a-413e-9b40-5ed21ff4992b
   ```

4. **Click "Save"**

---

## Step 2: Deploy Edge Function (3 minutes)

### Option A: Supabase Dashboard (Recommended) ✅

1. **Open Edge Functions**: https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/functions

2. **Click "Deploy new function"** or **"Create a new function"**

3. **Enter details**:
   ```
   Function name: ai-generate-video
   ```

4. **Copy code from**: `supabase/functions/ai-generate-video/index.ts`

5. **Paste into editor and click "Deploy"**

### Option B: Try CLI Again (if you have access token)

```bash
# Get your access token from: https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="your_access_token_here"

# Deploy
npx supabase functions deploy ai-generate-video \
  --project-ref fdiwnymnikylraofwhdu \
  --no-verify-jwt
```

---

## Step 3: Verify Deployment (1 minute)

Run the test script:

```bash
export NEXT_PUBLIC_SUPABASE_URL=https://fdiwnymnikylraofwhdu.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaXdueW1uaWt5bHJhb2Z3aGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDQ0MzQsImV4cCI6MjA3MjE4MDQzNH0.unmMqI6awTpbzZwAFRHwv7ApX9ia14T3ukr9umVAk_M

npx tsx scripts/test-video-generation.ts
```

**Expected output:**
```
✅ Edge Function is deployed and accessible
✅ Response structure matches PRD specification
✅ Prompt enhancement follows HIGH QUALITY strategy
✅ Using REAL Luma API (production mode)
```

---

## Step 4: Test in App (2 minutes)

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Click **"Animation"** button (next to "Image" button)

4. Enter prompt: `"a cute cat running"`

5. Select FPS: `24 FPS`

6. Click **"Generate Animation"**

7. Wait 5-10 seconds

8. **Verify**:
   - ✅ 24 frames loaded into editor
   - ✅ Animation plays smoothly
   - ✅ Pixel art style (blocky, quantized colors)
   - ✅ No errors in console

---

## Troubleshooting

### "Function not found" (404)
**Fix**: Complete Step 2 - Edge Function not deployed yet

### "Invalid API key" or "Unauthorized"
**Fix**: Complete Step 1 - Luma API key not set

### "TEMP_LUMA_API_KEY_NOT_SET" message
**Fix**: API key is not accessible to Edge Function. Make sure:
1. Secret name is exactly `LUMA_API_KEY` (case-sensitive)
2. Redeploy Edge Function after adding secret

### Frames are blurry or low quality
**Check**: Open browser console, look for prompt enhancement logs. Should see:
```
Enhanced: "a cute cat running, high quality animation, smooth motion, detailed"
```
NOT:
```
Enhanced: "a cute cat running, pixel art style, 8-bit"
```

### CLI still fails
**Use Dashboard**: The manual Dashboard deployment works 100% of the time

---

## What's Next?

Once deployed and tested:

1. ✅ Test various prompts (animals, characters, objects, actions)
2. ✅ Test all FPS options (12, 24, 30)
3. ✅ Export to GIF and verify animation quality
4. ✅ Monitor Luma API usage: https://lumalabs.ai/dream-machine/api
5. ✅ Check costs (should be $0.04 per 1-second video)

---

## Quick Links

- **Supabase Vault**: https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/settings/vault
- **Edge Functions**: https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/functions
- **Luma Dashboard**: https://lumalabs.ai/dream-machine/api
- **Edge Function Code**: [supabase/functions/ai-generate-video/index.ts](supabase/functions/ai-generate-video/index.ts)
- **Test Script**: [scripts/test-video-generation.ts](scripts/test-video-generation.ts)
- **Full PRD**: [docs/video-to-frames-feature-prd-v2.md](docs/video-to-frames-feature-prd-v2.md)

---

**Total time: ~8 minutes** ⏱️

Good luck! 🎬✨
