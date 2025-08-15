#!/usr/bin/env node

/**
 * Local Image Processing Test
 * Tests VIPS/Sharp processing without OpenAI dependency
 */

const sharp = require('sharp');
const fs = require('fs');

async function testImageProcessing() {
  console.log('🎨 Local Image Processing Test Starting...');
  
  try {
    // Create a simple test image (red 64x64 PNG)
    console.log('📝 Creating test image...');
    const testImageBuffer = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 255, g: 0, b: 0 } // Red
      }
    })
    .png()
    .toBuffer();
    
    console.log(`✅ Test image created: ${testImageBuffer.length} bytes`);

    // Test 1: Check input image info
    console.log('\n📊 Test 1: Analyzing input image...');
    const inputInfo = await sharp(testImageBuffer).metadata();
    console.log('Input image metadata:', {
      width: inputInfo.width,
      height: inputInfo.height,
      channels: inputInfo.channels,
      format: inputInfo.format,
      space: inputInfo.space
    });

    // Test 2: Resize to 16x16 and check channels
    console.log('\n🔧 Test 2: Testing resize with raw output...');
    const resized = await sharp(testImageBuffer)
      .resize(16, 16, {
        kernel: sharp.kernel.nearest,
        fit: 'fill'
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log('Resized raw data:', {
      width: resized.info.width,
      height: resized.info.height,
      channels: resized.info.channels,
      size: resized.info.size,
      dataLength: resized.data.length,
      expectedRGB: 16 * 16 * 3,
      expectedRGBA: 16 * 16 * 4
    });

    // Test 3: Try ensureAlpha approach
    console.log('\n🔄 Test 3: Testing ensureAlpha...');
    const withAlpha = await sharp(testImageBuffer)
      .resize(16, 16, {
        kernel: sharp.kernel.nearest,
        fit: 'fill'
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log('With ensureAlpha:', {
      width: withAlpha.info.width,
      height: withAlpha.info.height,
      channels: withAlpha.info.channels,
      size: withAlpha.info.size,
      dataLength: withAlpha.data.length,
      expectedRGBA: 16 * 16 * 4
    });

    // Test 4: Manual RGB to RGBA conversion
    console.log('\n🛠️ Test 4: Manual RGB to RGBA conversion...');
    const rgbData = resized.data;
    const rgbaData = new Uint8ClampedArray(16 * 16 * 4);
    
    for (let i = 0, j = 0; i < rgbData.length; i += 3, j += 4) {
      rgbaData[j] = rgbData[i];       // R
      rgbaData[j + 1] = rgbData[i + 1]; // G
      rgbaData[j + 2] = rgbData[i + 2]; // B
      rgbaData[j + 3] = 255;          // A
    }
    
    console.log('Manual conversion result:', {
      inputLength: rgbData.length,
      outputLength: rgbaData.length,
      expectedOutput: 16 * 16 * 4,
      conversionCorrect: rgbaData.length === 16 * 16 * 4
    });

    // Test 5: Create PNG from RGBA data
    console.log('\n📦 Test 5: Creating PNG from RGBA data...');
    const finalPng = await sharp(Buffer.from(rgbaData), {
      raw: {
        width: 16,
        height: 16,
        channels: 4
      }
    })
    .png()
    .toBuffer();

    console.log(`✅ Final PNG created: ${finalPng.length} bytes`);

    // Save test output
    fs.writeFileSync('test-output.png', finalPng);
    console.log('💾 Test image saved as test-output.png');

    console.log('\n🎉 All image processing tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Image processing test failed:', error);
    console.log('\nError details:');
    console.log('- Message:', error.message);
    console.log('- Stack:', error.stack?.split('\n')[0]);
  }
}

testImageProcessing().catch(console.error);