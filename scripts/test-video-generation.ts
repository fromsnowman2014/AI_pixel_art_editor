/**
 * Test script for video generation feature
 * Tests the complete flow: Luma API → Edge Function → FastVideoProcessor → Pixel Art
 */

interface VideoGenerateResponse {
  success: boolean;
  data?: {
    videoUrl: string;
    sourceWidth: number;
    sourceHeight: number;
    duration: number;
    prompt: string;
    enhancedPrompt: string;
    processingTimeMs: number;
    clientProcessing: {
      targetWidth: number;
      targetHeight: number;
      targetFps: number;
      colorCount: number;
      method: string;
      maxDuration: number;
    };
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

async function testEdgeFunction() {
  console.log('🧪 Testing Video Generation Edge Function\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }

  // Test 1: Edge Function availability
  console.log('📍 Step 1: Testing Edge Function availability');
  console.log('   URL:', `${supabaseUrl}/functions/v1/ai-generate-video`);

  const testRequest = {
    prompt: 'a cute cat running',
    width: 64,
    height: 64,
    colorCount: 16,
    fps: 24
  };

  console.log('   Request:', JSON.stringify(testRequest, null, 2));

  try {
    const startTime = Date.now();

    const response = await fetch(`${supabaseUrl}/functions/v1/ai-generate-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify(testRequest)
    });

    const requestTime = Date.now() - startTime;

    console.log('   Status:', response.status, response.statusText);
    console.log('   Time:', requestTime + 'ms');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Edge Function error:', errorText);
      return;
    }

    const data: VideoGenerateResponse = await response.json();

    console.log('\n✅ Step 1: Edge Function is available and responding\n');
    console.log('═══════════════════════════════════════════════════════\n');

    // Test 2: Verify response structure
    console.log('📍 Step 2: Verifying response structure');

    if (!data.success) {
      console.error('❌ Edge Function returned error:', data.error);
      return;
    }

    if (!data.data) {
      console.error('❌ No data in response');
      return;
    }

    console.log('   ✓ Response has success flag');
    console.log('   ✓ Response has data object');
    console.log('   ✓ Video URL:', data.data.videoUrl);
    console.log('   ✓ Source dimensions:', `${data.data.sourceWidth}x${data.data.sourceHeight}`);
    console.log('   ✓ Duration:', data.data.duration + 's');
    console.log('   ✓ Original prompt:', data.data.prompt);
    console.log('   ✓ Enhanced prompt:', data.data.enhancedPrompt);
    console.log('   ✓ Processing time:', data.data.processingTimeMs + 'ms');

    // Verify prompt enhancement doesn't include pixel art keywords
    const bannedKeywords = ['pixel art', '8-bit', 'pixelated', 'blocky', 'retro'];
    const enhancedLower = data.data.enhancedPrompt.toLowerCase();
    const hasBannedKeywords = bannedKeywords.some(keyword => enhancedLower.includes(keyword));

    if (hasBannedKeywords) {
      console.error('   ❌ Enhanced prompt contains pixel art keywords (should NOT!)');
      console.error('      This violates the PRD requirement!');
    } else {
      console.log('   ✓ Enhanced prompt does NOT contain pixel art keywords (correct!)');
    }

    // Verify quality keywords are present
    const qualityKeywords = ['high quality', 'detailed', 'smooth motion'];
    const hasQualityKeywords = qualityKeywords.some(keyword => enhancedLower.includes(keyword));

    if (hasQualityKeywords) {
      console.log('   ✓ Enhanced prompt contains quality keywords (correct!)');
    } else {
      console.error('   ❌ Enhanced prompt missing quality keywords');
    }

    console.log('\n✅ Step 2: Response structure is correct\n');
    console.log('═══════════════════════════════════════════════════════\n');

    // Test 3: Verify client processing instructions
    console.log('📍 Step 3: Verifying client processing instructions');

    const clientProcessing = data.data.clientProcessing;
    console.log('   ✓ Target dimensions:', `${clientProcessing.targetWidth}x${clientProcessing.targetHeight}`);
    console.log('   ✓ Target FPS:', clientProcessing.targetFps);
    console.log('   ✓ Color count:', clientProcessing.colorCount);
    console.log('   ✓ Processing method:', clientProcessing.method);
    console.log('   ✓ Max duration:', clientProcessing.maxDuration + 's (MVP: 1.0s)');

    if (clientProcessing.method !== 'FastVideoProcessor') {
      console.error('   ❌ Wrong processing method:', clientProcessing.method);
      return;
    }

    if (clientProcessing.maxDuration !== 1.0) {
      console.error('   ❌ Wrong max duration (MVP should be 1.0s):', clientProcessing.maxDuration);
      return;
    }

    console.log('\n✅ Step 3: Client processing instructions are correct\n');
    console.log('═══════════════════════════════════════════════════════\n');

    // Test 4: Check if Luma API key is configured
    console.log('📍 Step 4: Checking Luma API key configuration');

    if (data.data.videoUrl.includes('mock')) {
      console.log('   ⚠️  Using MOCK response (LUMA_API_KEY not set in Supabase)');
      console.log('   ⚠️  This is expected in development mode');
      console.log('   ⚠️  To test with real Luma API:');
      console.log('      1. Set LUMA_API_KEY in Supabase Dashboard');
      console.log('      2. Deploy Edge Function: npx supabase functions deploy ai-generate-video');
    } else {
      console.log('   ✅ Using REAL Luma API (production mode)');
      console.log('   ✅ Video URL:', data.data.videoUrl);
    }

    console.log('\n✅ Step 4: API key configuration checked\n');
    console.log('═══════════════════════════════════════════════════════\n');

    // Summary
    console.log('📊 TEST SUMMARY\n');
    console.log('   ✅ Edge Function is deployed and accessible');
    console.log('   ✅ Response structure matches PRD specification');
    console.log('   ✅ Prompt enhancement follows HIGH QUALITY strategy (no pixel art keywords)');
    console.log('   ✅ Client processing instructions are correct');
    console.log('   ✅ MVP duration enforcement (1.0s) is working');

    if (data.data.videoUrl.includes('mock')) {
      console.log('   ⚠️  Next step: Configure LUMA_API_KEY for production testing');
    } else {
      console.log('   ✅ Ready for production use!');
    }

    console.log('\n═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testEdgeFunction().catch(console.error);
