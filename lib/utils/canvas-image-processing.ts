/**
 * Canvas-based image processing (Sharp/VIPS alternative)
 * Uses Node.js Canvas for Railway compatibility
 */

import { createCanvas, loadImage, Canvas, CanvasRenderingContext2D } from 'canvas';
import { Color, QuantizationOptions, ProcessingResult } from './image-processing';

/**
 * Canvas-based MedianCut Quantizer (Sharp alternative)
 */
class CanvasMedianCutQuantizer {
  private pixels: Color[] = [];
  
  constructor(imageData: ImageData) {
    const data = imageData.data;
    
    // ImageData is always RGBA (4 channels)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Skip fully transparent pixels
      if (a > 0) {
        this.pixels.push({ r, g, b, a });
      }
    }
    
    console.log(`🎨 Canvas quantizer: ${this.pixels.length} pixels processed`);
  }

  quantize(targetColors: number): Color[] {
    if (this.pixels.length === 0) return [];
    if (this.pixels.length <= targetColors) {
      return this.pixels.slice(0, targetColors);
    }

    // Use median cut algorithm (simplified version)
    const buckets = [this.pixels.slice()];
    
    while (buckets.length < targetColors) {
      // Find largest bucket
      let largestIndex = 0;
      let largestSize = buckets[0].length;
      
      for (let i = 1; i < buckets.length; i++) {
        if (buckets[i].length > largestSize) {
          largestSize = buckets[i].length;
          largestIndex = i;
        }
      }
      
      if (largestSize <= 1) break;
      
      // Split largest bucket
      const bucket = buckets[largestIndex];
      const [bucket1, bucket2] = this.splitBucket(bucket);
      
      buckets[largestIndex] = bucket1;
      buckets.push(bucket2);
    }
    
    // Get average color from each bucket
    return buckets.map(bucket => this.getAverageColor(bucket));
  }

  private splitBucket(bucket: Color[]): [Color[], Color[]] {
    if (bucket.length <= 1) return [bucket, []];

    // Find dimension with largest range
    const ranges = this.getColorRanges(bucket);
    let splitDimension: 'r' | 'g' | 'b' = 'r';
    
    if (ranges.g >= ranges.r && ranges.g >= ranges.b) {
      splitDimension = 'g';
    } else if (ranges.b >= ranges.r && ranges.b >= ranges.g) {
      splitDimension = 'b';
    }

    // Sort by the split dimension
    bucket.sort((a, b) => a[splitDimension] - b[splitDimension]);

    // Split at median
    const median = Math.floor(bucket.length / 2);
    return [bucket.slice(0, median), bucket.slice(median)];
  }

  private getColorRanges(bucket: Color[]) {
    if (bucket.length === 0) return { r: 0, g: 0, b: 0 };

    let minR = bucket[0].r, maxR = bucket[0].r;
    let minG = bucket[0].g, maxG = bucket[0].g;
    let minB = bucket[0].b, maxB = bucket[0].b;

    for (const color of bucket) {
      minR = Math.min(minR, color.r);
      maxR = Math.max(maxR, color.r);
      minG = Math.min(minG, color.g);
      maxG = Math.max(maxG, color.g);
      minB = Math.min(minB, color.b);
      maxB = Math.max(maxB, color.b);
    }

    return {
      r: maxR - minR,
      g: maxG - minG,
      b: maxB - minB,
    };
  }

  private getAverageColor(bucket: Color[]): Color {
    if (bucket.length === 0) return { r: 0, g: 0, b: 0, a: 255 };

    let totalR = 0, totalG = 0, totalB = 0, totalA = 0;

    for (const color of bucket) {
      totalR += color.r;
      totalG += color.g;
      totalB += color.b;
      totalA += color.a;
    }

    const count = bucket.length;
    return {
      r: Math.round(totalR / count),
      g: Math.round(totalG / count),
      b: Math.round(totalB / count),
      a: Math.round(totalA / count),
    };
  }
}

/**
 * Find nearest color in palette
 */
function findNearestColor(targetColor: Color, palette: Color[]): Color {
  if (palette.length === 0) return targetColor;

  let bestMatch = palette[0];
  let bestDistance = Infinity;

  for (const paletteColor of palette) {
    const distance = Math.sqrt(
      Math.pow(targetColor.r - paletteColor.r, 2) +
      Math.pow(targetColor.g - paletteColor.g, 2) +
      Math.pow(targetColor.b - paletteColor.b, 2)
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = paletteColor;
    }
  }

  return bestMatch;
}

/**
 * Canvas-based image processing (Sharp alternative)
 */
export async function processImageWithCanvas(
  inputBuffer: Buffer,
  targetWidth: number,
  targetHeight: number,
  options: QuantizationOptions
): Promise<ProcessingResult> {
  const startTime = Date.now();

  try {
    console.log(`🎨 Starting Canvas-based processing: ${targetWidth}x${targetHeight}, ${options.colorCount} colors`);

    // Step 1: Load image using Canvas
    const img = await loadImage(inputBuffer);
    console.log(`📊 Input image: ${img.width}x${img.height}`);

    // Step 2: Create target canvas
    const canvas = createCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');

    // Step 3: Disable smoothing for pixel-perfect scaling
    ctx.imageSmoothingEnabled = false;
    
    // Step 4: Draw and scale image
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Step 5: Get image data (always RGBA)
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    console.log(`📊 Canvas image data: ${imageData.data.length} bytes (${imageData.data.length/4} pixels)`);

    // Step 6: Apply color quantization
    const quantizer = new CanvasMedianCutQuantizer(imageData);
    const palette = quantizer.quantize(options.colorCount);
    console.log(`🎯 Generated palette with ${palette.length} colors`);

    // Step 7: Apply quantization to image
    const quantizedData = new Uint8ClampedArray(imageData.data.length);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];

      if (a === 0) {
        // Keep transparent pixels transparent
        quantizedData[i] = 0;
        quantizedData[i + 1] = 0;
        quantizedData[i + 2] = 0;
        quantizedData[i + 3] = 0;
      } else {
        const nearestColor = findNearestColor({ r, g, b, a }, palette);
        quantizedData[i] = nearestColor.r;
        quantizedData[i + 1] = nearestColor.g;
        quantizedData[i + 2] = nearestColor.b;
        quantizedData[i + 3] = nearestColor.a;
      }
    }

    // Step 8: Create final canvas with quantized data
    const finalCanvas = createCanvas(targetWidth, targetHeight);
    const finalCtx = finalCanvas.getContext('2d');
    
    const finalImageData = finalCtx.createImageData(targetWidth, targetHeight);
    finalImageData.data.set(quantizedData);
    finalCtx.putImageData(finalImageData, 0, 0);

    // Step 9: Convert to PNG buffer
    const outputBuffer = finalCanvas.toBuffer('image/png');
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Canvas processing complete in ${processingTime}ms`);

    return {
      buffer: outputBuffer,
      width: targetWidth,
      height: targetHeight,
      colorCount: palette.length,
      palette,
      processingTimeMs: processingTime,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Canvas processing failed after ${processingTime}ms:`, error);
    throw error;
  }
}