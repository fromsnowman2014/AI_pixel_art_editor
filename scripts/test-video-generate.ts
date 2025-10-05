/**
 * Test script for video-generate Edge Function
 *
 * This script:
 * 1. Gets authenticated user's JWT token
 * 2. Calls video-generate API
 * 3. Monitors job status in database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function testVideoGenerate() {
  console.log('🧪 Testing video-generate Edge Function\n');

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Check if user is already logged in
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.error('❌ No active session found');
    console.log('\n📝 Please sign in first:');
    console.log('   1. Open http://localhost:3000/auth/signin');
    console.log('   2. Sign in with your account');
    console.log('   3. Run this script again\n');
    process.exit(1);
  }

  const accessToken = session.access_token;
  const userId = session.user.id;

  console.log('✅ User authenticated:', userId);
  console.log('🔑 Access token obtained\n');

  // Test payload
  const testPayload = {
    prompt: 'a cute cat walking in a garden with flowers',
    width: 64,
    height: 64,
    colorCount: 16,
    fps: 24
  };

  console.log('📦 Test payload:', JSON.stringify(testPayload, null, 2));
  console.log('\n🚀 Calling video-generate API...\n');

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/video-generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify(testPayload)
      }
    );

    const responseText = await response.text();
    console.log(`📡 Response status: ${response.status}`);
    console.log(`📄 Response body: ${responseText}\n`);

    if (!response.ok) {
      console.error('❌ API call failed');
      process.exit(1);
    }

    const result = JSON.parse(responseText);

    if (!result.success) {
      console.error('❌ API returned error:', result.error);
      process.exit(1);
    }

    console.log('✅ Video generation job created!');
    console.log(`   Job ID: ${result.data.jobId}`);
    console.log(`   Status: ${result.data.status}`);
    console.log(`   Estimated time: ${result.data.estimatedTimeSeconds}s`);
    console.log(`   Message: ${result.data.message}\n`);

    // Check database record
    console.log('🔍 Checking database record...\n');

    const { data: job, error: jobError } = await supabase
      .from('video_generation_jobs')
      .select('*')
      .eq('id', result.data.jobId)
      .single();

    if (jobError) {
      console.error('❌ Failed to fetch job from database:', jobError);
      process.exit(1);
    }

    console.log('✅ Database record found:');
    console.log(`   ID: ${job.id}`);
    console.log(`   User ID: ${job.user_id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Progress: ${job.progress}%`);
    console.log(`   Progress message: ${job.progress_message}`);
    console.log(`   Luma generation ID: ${job.luma_generation_id}`);
    console.log(`   Prompt: ${job.prompt}`);
    console.log(`   Dimensions: ${job.width}x${job.height}`);
    console.log(`   Color count: ${job.color_count}`);
    console.log(`   FPS: ${job.fps}`);
    console.log(`   Created at: ${job.created_at}\n`);

    // Verify job fields
    const validations = [
      { field: 'status', expected: 'queued', actual: job.status },
      { field: 'progress', expected: 10, actual: job.progress },
      { field: 'user_id', expected: userId, actual: job.user_id },
      { field: 'luma_generation_id', expected: 'exists', actual: job.luma_generation_id ? 'exists' : 'missing' }
    ];

    let allValid = true;
    console.log('🔍 Validations:');
    for (const validation of validations) {
      const isValid = validation.expected === validation.actual;
      const icon = isValid ? '✅' : '❌';
      console.log(`   ${icon} ${validation.field}: expected ${validation.expected}, got ${validation.actual}`);
      if (!isValid) allValid = false;
    }

    console.log('');

    if (allValid) {
      console.log('🎉 Phase 2 test PASSED!\n');
      console.log('📋 Next steps:');
      console.log('   1. Wait for Luma webhook callback (1-3 minutes)');
      console.log('   2. Implement Phase 3 (video-webhook Edge Function)');
      console.log('   3. Monitor job status updates\n');
      console.log(`💡 Monitor job in dashboard:`);
      console.log(`   https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/editor/29740?filter=id%3Deq%3D${job.id}\n`);
    } else {
      console.log('❌ Phase 2 test FAILED - some validations did not pass\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

testVideoGenerate();
