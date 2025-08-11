export interface RGBColor {
    r: number;
    g: number;
    b: number;
    a?: number;
}
export interface ProcessingOptions {
    width: number;
    height: number;
    colorLimit: number;
    enableDithering?: boolean;
    quantizationMethod?: 'median-cut' | 'wu';
    preserveTransparency?: boolean;
    scalingMethod?: 'nearest' | 'cubic' | 'lanczos3';
}
export interface ProcessedImage {
    buffer: Buffer;
    palette: RGBColor[];
    width: number;
    height: number;
    format: 'png' | 'jpeg';
    sizeBytes: number;
    processingTimeMs: number;
}
export declare class ImageProcessingService {
    /**
     * Process AI-generated image for pixel art: quantize + resize
     */
    processAIImage(inputBuffer: Buffer, options: ProcessingOptions): Promise<ProcessedImage>;
    /**
     * Quantize image colors using Median Cut algorithm
     */
    private quantizeColors;
    /**
     * Median Cut color quantization algorithm
     * Optimized for pixel art with good color distribution
     */
    private quantizeColorsMedianCut;
    /**
     * Wu color quantization algorithm (alternative method)
     */
    private quantizeColorsWu;
    /**
     * Recursive Median Cut implementation
     */
    private medianCutRecursive;
    /**
     * Find closest color in palette using Euclidean distance
     */
    private findClosestColor;
    /**
     * Apply Floyd-Steinberg dithering
     */
    private applyFloydSteinbergDithering;
    /**
     * Create thumbnail from processed image
     */
    createThumbnail(inputBuffer: Buffer, maxSize?: number): Promise<Buffer>;
    /**
     * Extract palette from existing image
     */
    extractPalette(inputBuffer: Buffer, maxColors?: number): Promise<RGBColor[]>;
}
export declare const imageProcessingService: ImageProcessingService;
//# sourceMappingURL=imageProcessing.d.ts.map