"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiService = exports.OpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
const env_1 = require("../types/env");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('openai-service');
class OpenAIService {
    client;
    rateLimitCounter = new Map();
    constructor() {
        this.client = new openai_1.default({
            apiKey: env_1.env.OPENAI_API_KEY,
            maxRetries: env_1.env.OPENAI_MAX_RETRIES,
            timeout: env_1.env.OPENAI_TIMEOUT,
        });
    }
    /**
     * Generate image using GPT-Image-1 with pixel art optimized prompts
     */
    async generateImage(params) {
        const startTime = Date.now();
        try {
            // Optimize prompt for pixel art generation
            const optimizedPrompt = this.optimizePromptForPixelArt(params.prompt);
            logger.info('Generating image with OpenAI GPT-Image-1', {
                originalPrompt: params.prompt,
                optimizedPrompt,
                size: params.size || '1024x1024',
                userId: params.userId,
            });
            const response = await this.client.images.generate({
                model: env_1.env.OPENAI_MODEL,
                prompt: optimizedPrompt,
                n: 1,
                size: params.size || '1024x1024',
                quality: params.quality || 'high',
                background: params.background || 'transparent',
                response_format: params.responseFormat || 'url',
                user: params.userId, // for abuse monitoring
            });
            const processingTime = Date.now() - startTime;
            logger.info('Image generation successful', {
                processingTimeMs: processingTime,
                userId: params.userId,
            });
            const result = response.data?.[0];
            if (!result) {
                throw new Error('No image data returned from OpenAI');
            }
            return {
                url: result.url,
                b64Json: result.b64_json,
                revisedPrompt: result.revised_prompt,
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            logger.error('Image generation failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                processingTimeMs: processingTime,
                userId: params.userId,
            });
            if (error instanceof openai_1.default.APIError) {
                if (error.status === 400) {
                    throw new Error(`Invalid prompt or parameters: ${error.message}`);
                }
                else if (error.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                }
                else if (error.status === 500) {
                    throw new Error('OpenAI service temporarily unavailable. Please try again.');
                }
            }
            throw new Error('Failed to generate image. Please try again.');
        }
    }
    /**
     * Generate variations of an existing image
     */
    async generateVariations(params) {
        const startTime = Date.now();
        try {
            logger.info('Generating image variations', {
                n: params.n || 1,
                size: params.size || '512x512',
                userId: params.userId,
            });
            // Convert Buffer to File-like object if needed
            let imageInput = params.image;
            if (params.image instanceof Buffer) {
                imageInput = new File([params.image], 'image.png', { type: 'image/png' });
            }
            const response = await this.client.images.createVariation({
                image: imageInput,
                n: params.n || 1,
                size: params.size || '512x512',
                response_format: params.responseFormat || 'url',
                user: params.userId,
            });
            const processingTime = Date.now() - startTime;
            logger.info('Image variations generated successfully', {
                count: response.data?.length || 0,
                processingTimeMs: processingTime,
                userId: params.userId,
            });
            if (!response.data || response.data.length === 0) {
                throw new Error('No variation data returned from OpenAI');
            }
            return response.data.map(item => ({
                url: item.url,
                b64Json: item.b64_json,
            }));
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            logger.error('Image variations generation failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                processingTimeMs: processingTime,
                userId: params.userId,
            });
            throw new Error('Failed to generate image variations. Please try again.');
        }
    }
    /**
     * Edit an image using DALL-E 2 (for image-to-image workflows)
     */
    async editImage(params) {
        const startTime = Date.now();
        try {
            const optimizedPrompt = this.optimizePromptForPixelArt(params.prompt);
            logger.info('Editing image with DALL-E', {
                originalPrompt: params.prompt,
                optimizedPrompt,
                n: params.n || 1,
                userId: params.userId,
            });
            // Convert Buffer to File-like object if needed
            let imageInput = params.image;
            if (params.image instanceof Buffer) {
                imageInput = new File([params.image], 'image.png', { type: 'image/png' });
            }
            let maskInput = params.mask;
            if (params.mask instanceof Buffer) {
                maskInput = new File([params.mask], 'mask.png', { type: 'image/png' });
            }
            const response = await this.client.images.edit({
                image: imageInput,
                mask: maskInput,
                prompt: optimizedPrompt,
                n: params.n || 1,
                size: params.size || '512x512',
                response_format: params.responseFormat || 'url',
                user: params.userId,
            });
            const processingTime = Date.now() - startTime;
            logger.info('Image editing successful', {
                count: response.data?.length || 0,
                processingTimeMs: processingTime,
                userId: params.userId,
            });
            if (!response.data || response.data.length === 0) {
                throw new Error('No edited image data returned from OpenAI');
            }
            return response.data.map(item => ({
                url: item.url,
                b64Json: item.b64_json,
            }));
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            logger.error('Image editing failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                processingTimeMs: processingTime,
                userId: params.userId,
            });
            throw new Error('Failed to edit image. Please try again.');
        }
    }
    /**
     * Check API health and rate limits
     */
    async healthCheck() {
        try {
            // Simple API test - get models (lightweight operation)
            await this.client.models.list();
            return {
                status: 'healthy',
            };
        }
        catch (error) {
            logger.error('OpenAI health check failed', { error });
            return {
                status: 'unhealthy',
            };
        }
    }
    /**
     * Optimize prompts specifically for pixel art generation
     */
    optimizePromptForPixelArt(originalPrompt) {
        // Add pixel art specific keywords and constraints
        const pixelArtKeywords = [
            'pixel art',
            '8-bit style',
            'retro game art',
            'pixelated',
            'sharp edges',
            'no anti-aliasing',
            'simple colors',
            'blocky style'
        ];
        // Check if prompt already contains pixel art keywords
        const hasPixelArtKeywords = pixelArtKeywords.some(keyword => originalPrompt.toLowerCase().includes(keyword.toLowerCase()));
        if (hasPixelArtKeywords) {
            // Already optimized, just add clarity instructions
            return `${originalPrompt}, pixel perfect, sharp edges, no blur, simple flat colors`;
        }
        // Add pixel art context to the beginning
        return `pixel art style, 8-bit retro game art, ${originalPrompt}, pixelated, sharp edges, no anti-aliasing, simple flat colors, blocky style`;
    }
    /**
     * Enhance prompt for better results with kids content
     */
    enhancePromptForKids(prompt) {
        const kidsKeywords = [
            'cute',
            'friendly',
            'colorful',
            'fun',
            'safe',
            'appropriate for children',
            'cartoon style',
            'bright colors'
        ];
        // Check if already kid-friendly
        const isKidFriendly = kidsKeywords.some(keyword => prompt.toLowerCase().includes(keyword.toLowerCase()));
        if (isKidFriendly) {
            return prompt;
        }
        return `cute and friendly ${prompt}, bright colorful cartoon style, appropriate for children`;
    }
    /**
     * Get usage statistics for monitoring
     */
    getUsageStats() {
        const now = Date.now();
        let activeRateLimits = 0;
        let totalRequests = 0;
        for (const [, data] of this.rateLimitCounter) {
            totalRequests += data.count;
            if (data.resetTime > now) {
                activeRateLimits++;
            }
        }
        return { totalRequests, activeRateLimits };
    }
}
exports.OpenAIService = OpenAIService;
// Singleton instance
exports.openaiService = new OpenAIService();
//# sourceMappingURL=openai.js.map