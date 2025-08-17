export declare class OpenAIService {
    private client;
    private rateLimitCounter;
    constructor();
    /**
     * Generate image using GPT-Image-1 with pixel art optimized prompts
     */
    generateImage(params: {
        prompt: string;
        size?: '1024x1024' | '1792x1024' | '1024x1792';
        quality?: 'low' | 'medium' | 'high';
        background?: 'transparent' | 'opaque';
        responseFormat?: 'url' | 'b64_json';
        userId?: string;
    }): Promise<{
        url?: string;
        b64Json?: string;
        revisedPrompt?: string;
    }>;
    /**
     * Generate variations of an existing image
     */
    generateVariations(params: {
        image: File | Buffer | string;
        n?: number;
        size?: '256x256' | '512x512' | '1024x1024';
        responseFormat?: 'url' | 'b64_json';
        userId?: string;
    }): Promise<Array<{
        url?: string;
        b64Json?: string;
    }>>;
    /**
     * Edit an image using GPT-Image-1 (for image-to-image workflows)
     */
    editImage(params: {
        image: File | Buffer | string;
        mask?: File | Buffer | string;
        prompt: string;
        n?: number;
        size?: '256x256' | '512x512' | '1024x1024';
        responseFormat?: 'url' | 'b64_json';
        userId?: string;
    }): Promise<Array<{
        url?: string;
        b64Json?: string;
    }>>;
    /**
     * Check API health and rate limits
     */
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        rateLimit?: {
            remaining: number;
            reset: number;
        };
    }>;
    /**
     * Optimize prompts specifically for pixel art generation
     */
    private optimizePromptForPixelArt;
    /**
     * Enhance prompt for better results with kids content
     */
    private enhancePromptForKids;
    /**
     * Get usage statistics for monitoring
     */
    getUsageStats(): {
        totalRequests: number;
        activeRateLimits: number;
    };
}
export declare const openaiService: OpenAIService;
//# sourceMappingURL=openai.d.ts.map