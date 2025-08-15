import sharp from 'sharp';

/**
 * Color quantization and pixel art processing utilities
 * Optimized for converting AI-generated images to pixel art
 */

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface QuantizationOptions {
  colorCount: number;
  method: 'median-cut' | 'octree' | 'simple';
  enableDithering?: boolean;
}

export interface ProcessingResult {
  buffer: Buffer;
  width: number;
  height: number;
  colorCount: number;
  palette: Color[];
  processingTimeMs: number;
}

/**
 * Median Cut color quantization algorithm
 * Recursively subdivides color space to find representative colors
 */
class MedianCutQuantizer {
  private pixels: Color[] = [];
  
  constructor(imageData: Uint8ClampedArray, width: number, height: number) {
    const expectedSize = width * height;
    const actualChannels = imageData.length / expectedSize;
    
    console.log(`🔍 MedianCutQuantizer input analysis:`, {
      dataLength: imageData.length,
      expectedPixels: expectedSize,
      detectedChannels: actualChannels,
      isRGBA: Math.abs(actualChannels - 4) < 0.1,
      isRGB: Math.abs(actualChannels - 3) < 0.1
    });
    
    if (Math.abs(actualChannels - 4) < 0.1) {
      // RGBA data (4 channels)
      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i] ?? 0;
        const g = imageData[i + 1] ?? 0;
        const b = imageData[i + 2] ?? 0;
        const a = imageData[i + 3] ?? 0;
        
        // Skip fully transparent pixels
        if (a > 0) {
          this.pixels.push({ r, g, b, a });
        }
      }
      console.log(`✅ Processed as RGBA: ${this.pixels.length} pixels`);
    } else if (Math.abs(actualChannels - 3) < 0.1) {
      // RGB data (3 channels) - convert to RGBA
      console.log(`🔄 Converting RGB to RGBA internally...`);
      for (let i = 0; i < imageData.length; i += 3) {
        const r = imageData[i] ?? 0;
        const g = imageData[i + 1] ?? 0;
        const b = imageData[i + 2] ?? 0;
        const a = 255; // Fully opaque
        
        this.pixels.push({ r, g, b, a });
      }
      console.log(`✅ Converted RGB to RGBA: ${this.pixels.length} pixels`);
    } else {
      throw new Error(`Unsupported channel count: ${actualChannels}. Expected 3 (RGB) or 4 (RGBA).`);
    }
  }

  quantize(targetColors: number): Color[] {
    if (this.pixels.length === 0) return [];
    if (this.pixels.length <= targetColors) {
      return this.getUniquePalette();
    }

    const buckets: Color[][] = [this.pixels];
    
    // Recursively split buckets until we have target number of colors
    while (buckets.length < targetColors && buckets.length < this.pixels.length) {
      // Find bucket with largest color range
      let maxRange = -1;
      let maxBucketIndex = -1;
      
      for (let i = 0; i < buckets.length; i++) {
        const bucket = buckets[i];
        if (bucket) {
          const range = this.getColorRange(bucket);
          if (range > maxRange) {
            maxRange = range;
            maxBucketIndex = i;
          }
        }
      }
      
      if (maxBucketIndex === -1) break;
      
      // Split the bucket with maximum range
      const bucketToSplit = buckets[maxBucketIndex];
      if (bucketToSplit && bucketToSplit.length > 0) {
        const splitBuckets = this.splitBucket(bucketToSplit);
        buckets.splice(maxBucketIndex, 1, ...splitBuckets);
      }
    }

    // Generate representative color for each bucket
    return buckets.map(bucket => this.getAverageColor(bucket));
  }

  private getUniquePalette(): Color[] {
    const unique = new Map<string, Color>();
    
    for (const pixel of this.pixels) {
      const key = `${pixel.r},${pixel.g},${pixel.b}`;
      if (!unique.has(key)) {
        unique.set(key, pixel);
      }
    }
    
    return Array.from(unique.values());
  }

  private getColorRange(bucket: Color[]): number {
    if (bucket.length <= 1) return 0;

    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;

    for (const color of bucket) {
      minR = Math.min(minR, color.r);
      maxR = Math.max(maxR, color.r);
      minG = Math.min(minG, color.g);
      maxG = Math.max(maxG, color.g);
      minB = Math.min(minB, color.b);
      maxB = Math.max(maxB, color.b);
    }

    const rRange = maxR - minR;
    const gRange = maxG - minG;
    const bRange = maxB - minB;

    return Math.max(rRange, gRange, bRange);
  }

  private splitBucket(bucket: Color[]): Color[][] {
    if (bucket.length <= 1) return [bucket];

    // Find dimension with largest range
    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;

    for (const color of bucket) {
      minR = Math.min(minR, color.r);
      maxR = Math.max(maxR, color.r);
      minG = Math.min(minG, color.g);
      maxG = Math.max(maxG, color.g);
      minB = Math.min(minB, color.b);
      maxB = Math.max(maxB, color.b);
    }

    const rRange = maxR - minR;
    const gRange = maxG - minG;
    const bRange = maxB - minB;

    // Sort by the dimension with largest range
    if (rRange >= gRange && rRange >= bRange) {
      bucket.sort((a, b) => a.r - b.r);
    } else if (gRange >= bRange) {
      bucket.sort((a, b) => a.g - b.g);
    } else {
      bucket.sort((a, b) => a.b - b.b);
    }

    // Split at median
    const median = Math.floor(bucket.length / 2);
    return [bucket.slice(0, median), bucket.slice(median)];
  }

  private getAverageColor(bucket: Color[]): Color {
    if (bucket.length === 0) return { r: 0, g: 0, b: 0, a: 255 };

    let totalR = 0, totalG = 0, totalB = 0, totalA = 0;

    for (const color of bucket) {
      totalR += color.r;
      totalG += color.g;
      totalB += color.b;
      totalA += color.a || 255;
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

  const firstColor = palette[0];
  if (!firstColor) return targetColor;

  let bestMatch = firstColor;
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
 * Apply color quantization to image data
 */
function applyQuantization(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  palette: Color[]
): Uint8ClampedArray {
  const quantized = new Uint8ClampedArray(imageData.length);

  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i] ?? 0;
    const g = imageData[i + 1] ?? 0;
    const b = imageData[i + 2] ?? 0;
    const a = imageData[i + 3] ?? 0;

    if (a === 0) {
      // Keep transparent pixels transparent
      quantized[i] = 0;
      quantized[i + 1] = 0;
      quantized[i + 2] = 0;
      quantized[i + 3] = 0;
    } else {
      const nearestColor = findNearestColor({ r, g, b, a }, palette);
      quantized[i] = nearestColor.r;
      quantized[i + 1] = nearestColor.g;
      quantized[i + 2] = nearestColor.b;
      quantized[i + 3] = nearestColor.a ?? 255;
    }
  }

  return quantized;
}

/**
 * Process image for pixel art conversion
 * 1. Resize to target dimensions using nearest neighbor
 * 2. Apply color quantization
 * 3. Return processed buffer
 */
export async function processImageForPixelArt(
  inputBuffer: Buffer,
  targetWidth: number,
  targetHeight: number,
  options: QuantizationOptions
): Promise<ProcessingResult> {
  const startTime = Date.now();

  try {
    console.log(`🎨 Starting image processing: ${targetWidth}x${targetHeight}, ${options.colorCount} colors`);
    console.log(`📊 Input buffer size: ${inputBuffer.length} bytes`);

    // Step 1: Force RGBA conversion using explicit channel manipulation
    console.log(`🔧 Converting to RGBA using explicit channel expansion...`);
    
    const resizedRgbBuffer = await sharp(inputBuffer)
      .resize(targetWidth, targetHeight, {
        kernel: sharp.kernel.nearest, // Pixel perfect scaling
        fit: 'fill' // Stretch to exact dimensions
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: rgbData, info: rgbInfo } = resizedRgbBuffer;
    
    console.log(`📊 RGB data info:`, {
      width: rgbInfo.width,
      height: rgbInfo.height,
      channels: rgbInfo.channels,
      dataLength: rgbData.length
    });

    // Manually expand RGB to RGBA
    const expectedPixels = targetWidth * targetHeight;
    const rgbaDataArray = new Uint8ClampedArray(expectedPixels * 4);
    
    if (rgbInfo.channels === 3) {
      // RGB to RGBA conversion
      for (let i = 0; i < expectedPixels; i++) {
        const rgbIndex = i * 3;
        const rgbaIndex = i * 4;
        
        rgbaDataArray[rgbaIndex] = rgbData[rgbIndex] ?? 0;       // R
        rgbaDataArray[rgbaIndex + 1] = rgbData[rgbIndex + 1] ?? 0; // G
        rgbaDataArray[rgbaIndex + 2] = rgbData[rgbIndex + 2] ?? 0; // B
        rgbaDataArray[rgbaIndex + 3] = 255;                    // A (opaque)
      }
    } else if (rgbInfo.channels === 4) {
      // Already RGBA
      rgbaDataArray.set(rgbData);
    } else {
      throw new Error(`Unsupported channel count: ${rgbInfo.channels}`);
    }

    // Create PNG buffer from RGBA data for validation
    const rgbaBuffer = await sharp(Buffer.from(rgbaDataArray), {
      raw: {
        width: targetWidth,
        height: targetHeight,
        channels: 4
      }
    })
    .png()
    .toBuffer();

    // Use the manually created RGBA data directly (bypass Sharp issues)
    const rgbaData = rgbaDataArray;
    
    console.log(`✅ RGBA conversion complete. Final data length: ${rgbaData.length}`);
    
    const quantizer = new MedianCutQuantizer(rgbaData, targetWidth, targetHeight);
    const palette = quantizer.quantize(options.colorCount);

    console.log(`🎯 Generated palette with ${palette.length} colors`);

    // Step 3: Apply quantization to image
    const quantizedData = applyQuantization(rgbaData, targetWidth, targetHeight, palette);

    // Step 4: Convert back to PNG buffer
    console.log(`📊 Quantized data length: ${quantizedData.length}, expected: ${targetWidth * targetHeight * 4}`);
    
    const outputBuffer = await sharp(quantizedData, {
      raw: {
        width: targetWidth,
        height: targetHeight,
        channels: 4 // RGBA
      }
    })
      .png({
        palette: true, // Use palette-based PNG for smaller file size
        colors: Math.min(palette.length, 256) // PNG palette limit
      })
      .toBuffer();

    const processingTime = Date.now() - startTime;

    console.log(`✅ Image processing complete in ${processingTime}ms`);

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
    console.error(`❌ Image processing failed after ${processingTime}ms:`, error);
    throw error;
  }
}

/**
 * Validate image dimensions and constraints
 */
export function validateImageConstraints(
  width: number,
  height: number,
  colorCount: number
): { valid: boolean; error?: string } {
  const MIN_SIZE = 8;
  const MAX_SIZE = 128;
  const MIN_COLORS = 2;
  const MAX_COLORS = 64;

  if (width < MIN_SIZE || width > MAX_SIZE) {
    return { valid: false, error: `Width must be between ${MIN_SIZE} and ${MAX_SIZE}` };
  }

  if (height < MIN_SIZE || height > MAX_SIZE) {
    return { valid: false, error: `Height must be between ${MIN_SIZE} and ${MAX_SIZE}` };
  }

  if (colorCount < MIN_COLORS || colorCount > MAX_COLORS) {
    return { valid: false, error: `Color count must be between ${MIN_COLORS} and ${MAX_COLORS}` };
  }

  return { valid: true };
}