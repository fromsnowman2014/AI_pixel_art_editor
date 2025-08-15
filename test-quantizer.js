#!/usr/bin/env node

/**
 * MedianCutQuantizer RGB vs RGBA Test
 * 실제 문제를 재현하여 확인
 */

// Simulate MedianCutQuantizer behavior
class TestQuantizer {
  constructor(imageData, width, height) {
    this.pixels = [];
    
    console.log(`Input data: ${imageData.length} bytes for ${width}x${height} image`);
    console.log(`Expected RGBA: ${width * height * 4} bytes`);
    console.log(`Expected RGB: ${width * height * 3} bytes`);
    
    // Original code assumes RGBA (i += 4)
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i] ?? 0;
      const g = imageData[i + 1] ?? 0;
      const b = imageData[i + 2] ?? 0;
      const a = imageData[i + 3] ?? 0;
      
      console.log(`Pixel ${i/4}: R=${r}, G=${g}, B=${b}, A=${a}`);
      
      if (i >= 4) break; // Just show first few pixels
    }
  }
}

console.log('🧪 Testing MedianCutQuantizer with RGB data...');

// Simulate RGB data (3 channels)
const rgbData = new Uint8ClampedArray([
  255, 0, 0,    // Red pixel
  0, 255, 0,    // Green pixel
  0, 0, 255,    // Blue pixel
  128, 128, 128 // Gray pixel
]);

console.log('\n📊 RGB Data Test (768 bytes problem):');
const quantizer1 = new TestQuantizer(rgbData, 2, 2); // 2x2 image, RGB data

console.log('\n📊 RGBA Data Test (1024 bytes expected):');
// Simulate RGBA data (4 channels)
const rgbaData = new Uint8ClampedArray([
  255, 0, 0, 255,    // Red pixel with alpha
  0, 255, 0, 255,    // Green pixel with alpha
  0, 0, 255, 255,    // Blue pixel with alpha
  128, 128, 128, 255 // Gray pixel with alpha
]);

const quantizer2 = new TestQuantizer(rgbaData, 2, 2); // 2x2 image, RGBA data