import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { CORS_HEADERS } from '@/lib/services/api-middleware';

/**
 * Sharp Diagnostics API
 * GET /api/test-sharp
 * 
 * Tests Sharp image processing library configuration and capabilities
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log(`📊 [${requestId}] Sharp diagnostics test started`);

  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      requestId,
      tests: {}
    };

    // Test 1: Sharp version and capabilities
    console.log(`🔧 [${requestId}] Testing Sharp version and capabilities...`);
    try {
      const sharpInfo = sharp();
      diagnostics.tests.sharpInfo = {
        status: 'success',
        version: sharp.versions || 'unknown',
        format: sharp.format || {},
        vendor: sharp.vendor || {}
      };
      console.log(`✅ [${requestId}] Sharp info collected`);
    } catch (error) {
      diagnostics.tests.sharpInfo = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log(`❌ [${requestId}] Sharp info failed:`, error);
    }

    // Test 2: Create simple test image
    console.log(`🎨 [${requestId}] Testing simple image creation...`);
    try {
      const testImage = await sharp({
        create: {
          width: 16,
          height: 16,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }
        }
      })
      .png()
      .toBuffer();

      diagnostics.tests.imageCreation = {
        status: 'success',
        imageSize: testImage.length
      };
      console.log(`✅ [${requestId}] Image creation successful: ${testImage.length} bytes`);
    } catch (error) {
      diagnostics.tests.imageCreation = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log(`❌ [${requestId}] Image creation failed:`, error);
    }

    // Test 3: Resize and raw output
    console.log(`🔧 [${requestId}] Testing resize with raw output...`);
    try {
      const testImageBuffer = await sharp({
        create: {
          width: 32,
          height: 32,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }
        }
      }).png().toBuffer();

      const resized = await sharp(testImageBuffer)
        .resize(16, 16, {
          kernel: sharp.kernel.nearest,
          fit: 'fill'
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

      diagnostics.tests.resizeRaw = {
        status: 'success',
        width: resized.info.width,
        height: resized.info.height,
        channels: resized.info.channels,
        dataLength: resized.data.length,
        expectedRGB: 16 * 16 * 3,
        expectedRGBA: 16 * 16 * 4
      };
      console.log(`✅ [${requestId}] Resize raw successful`);
    } catch (error) {
      diagnostics.tests.resizeRaw = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log(`❌ [${requestId}] Resize raw failed:`, error);
    }

    // Test 4: EnsureAlpha test
    console.log(`🔄 [${requestId}] Testing ensureAlpha...`);
    try {
      const testImageBuffer = await sharp({
        create: {
          width: 32,
          height: 32,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }
        }
      }).png().toBuffer();

      const withAlpha = await sharp(testImageBuffer)
        .resize(16, 16, {
          kernel: sharp.kernel.nearest,
          fit: 'fill'
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      diagnostics.tests.ensureAlpha = {
        status: 'success',
        width: withAlpha.info.width,
        height: withAlpha.info.height,
        channels: withAlpha.info.channels,
        dataLength: withAlpha.data.length,
        expectedRGBA: 16 * 16 * 4,
        alphaWorking: withAlpha.data.length === 16 * 16 * 4
      };
      console.log(`✅ [${requestId}] EnsureAlpha test successful`);
    } catch (error) {
      diagnostics.tests.ensureAlpha = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log(`❌ [${requestId}] EnsureAlpha test failed:`, error);
    }

    const totalTime = Date.now() - startTime;
    const allPassed = Object.values(diagnostics.tests).every(
      (test: any) => test.status === 'success'
    );

    diagnostics.summary = {
      allTestsPassed: allPassed,
      totalTests: Object.keys(diagnostics.tests).length,
      processingTimeMs: totalTime
    };

    console.log(`🏁 [${requestId}] Sharp diagnostics completed in ${totalTime}ms. All passed: ${allPassed}`);

    return NextResponse.json({
      success: true,
      data: diagnostics
    }, {
      status: 200,
      headers: CORS_HEADERS
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Sharp diagnostics failed:`, error);

    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Sharp diagnostics failed',
        code: 'SHARP_DIAGNOSTICS_ERROR',
        processingTimeMs: totalTime
      }
    }, {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS
  });
}