import { FastifyPluginCallback } from 'fastify';
import { 
  AIGenerateRequestSchema, 
  AIGenerationResponseSchema,
  AIVariationsRequestSchema,
  AIGenerateRequest,
  AIVariationsRequest
} from '../types/api';
import '../types/fastify';
import { openaiService } from '../services/openai';
import { imageProcessingService } from '../services/imageProcessing';
import { storageService } from '../services/storage';
import { db } from '../db/connection';
import { assets } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';

const logger = createLogger('ai-routes');

export const aiRoutes: FastifyPluginCallback = (fastify, options, done) => {
  
  /**
   * POST /api/ai/generate - Generate AI pixel art image
   */
  fastify.post('/generate', {
    schema: {
      body: AIGenerateRequestSchema,
      response: {
        200: AIGenerationResponseSchema,
      },
    },
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    const userId = request.user?.id;
    const body = request.body as AIGenerateRequest;
    
    logger.info('AI generation request received', {
      requestId,
      userId,
      prompt: body.prompt.substring(0, 100),
      mode: body.mode,
      dimensions: `${body.width}x${body.height}`,
      colorLimit: body.colorLimit,
    });

    try {
      const {
        prompt,
        mode,
        width,
        height,
        colorLimit,
        referenceImageId,
        referenceImageData,
        seed,
        enableDithering,
        quantizationMethod,
      } = body;

      let aiImageUrl: string | undefined;
      let aiImageBuffer: Buffer;

      // Step 1: Generate AI image based on mode
      if (mode === 'new') {
        // Text-to-image generation
        const result = await openaiService.generateImage({
          prompt,
          size: '1024x1024', // Always generate at high res for better quantization
          quality: 'standard',
          style: 'vivid',
          responseFormat: 'url',
          userId,
        });
        
        if (!result.url) {
          throw new Error('AI generation failed: no image URL returned');
        }
        
        aiImageUrl = result.url;
        
        // Download the generated image
        const response = await fetch(aiImageUrl);
        if (!response.ok) {
          throw new Error(`Failed to download generated image: ${response.statusText}`);
        }
        
        aiImageBuffer = Buffer.from(await response.arrayBuffer());
        
      } else {
        // Image-to-image mode
        let referenceBuffer: Buffer;
        
        if (referenceImageId) {
          // Get reference image from database
          const [referenceAsset] = await db
            .select()
            .from(assets)
            .where(eq(assets.id, referenceImageId))
            .limit(1);
            
          if (!referenceAsset) {
            return reply.code(404).send({
              error: 'NOT_FOUND',
              message: 'Reference image not found',
            });
          }
          
          // Download reference image
          const response = await fetch(referenceAsset.originalUrl);
          if (!response.ok) {
            throw new Error('Failed to download reference image');
          }
          referenceBuffer = Buffer.from(await response.arrayBuffer());
          
        } else if (referenceImageData) {
          // Decode base64 reference image
          const base64Data = referenceImageData.replace(/^data:image\/[a-z]+;base64,/, '');
          referenceBuffer = Buffer.from(base64Data, 'base64');
          
        } else {
          return reply.code(400).send({
            error: 'BAD_REQUEST',
            message: 'Reference image required for img2img mode',
          });
        }

        // Use OpenAI image editing
        const results = await openaiService.editImage({
          image: referenceBuffer,
          prompt,
          n: 1,
          size: '1024x1024',
          responseFormat: 'url',
          userId,
        });

        if (!results[0]?.url) {
          throw new Error('AI editing failed: no image URL returned');
        }

        aiImageUrl = results[0].url;
        
        // Download the edited image
        const response = await fetch(aiImageUrl);
        if (!response.ok) {
          throw new Error(`Failed to download edited image: ${response.statusText}`);
        }
        
        aiImageBuffer = Buffer.from(await response.arrayBuffer());
      }

      // Step 2: Process image (quantize + resize)
      const processedImage = await imageProcessingService.processAIImage(aiImageBuffer, {
        width,
        height,
        colorLimit,
        enableDithering: enableDithering || false,
        quantizationMethod: quantizationMethod || 'median-cut',
        preserveTransparency: true,
      });

      // Step 3: Generate thumbnail
      const thumbnail = await imageProcessingService.createThumbnail(
        processedImage.buffer,
        128
      );

      // Step 4: Upload processed image to storage
      const filename = `ai-generated-${requestId}`;
      const uploadResults = await Promise.all([
        storageService.uploadImage(processedImage.buffer, `${filename}.png`, 'image/png'),
        storageService.uploadImage(thumbnail, `${filename}-thumb.png`, 'image/png'),
      ]);

      const [processedUrl, thumbUrl] = uploadResults;

      // Step 5: Save to database
      const [savedAsset] = await db.insert(assets).values({
        userId,
        type: 'ai',
        originalUrl: aiImageUrl || processedUrl,
        processedUrl,
        thumbUrl,
        filename: `${filename}.png`,
        mimeType: 'image/png',
        width: processedImage.width,
        height: processedImage.height,
        sizeBytes: processedImage.sizeBytes,
        palette: processedImage.palette.map(color => 
          `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`
        ),
        metadata: {
          prompt: prompt.substring(0, 500),
          seed,
          colorLimit,
          quantizationMethod: quantizationMethod || 'median-cut',
          processingTimeMs: processedImage.processingTimeMs,
          aiModel: 'dall-e-3',
        },
      }).returning();

      const totalProcessingTime = Date.now() - startTime;

      logger.info('AI generation completed successfully', {
        requestId,
        userId,
        assetId: savedAsset.id,
        dimensions: `${processedImage.width}x${processedImage.height}`,
        paletteSize: processedImage.palette.length,
        totalProcessingTimeMs: totalProcessingTime,
      });

      // Step 6: Return response
      return reply.send({
        assetId: savedAsset.id,
        pngUrl: processedUrl,
        palette: processedImage.palette.map(color => 
          `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`
        ),
        width: processedImage.width,
        height: processedImage.height,
        colorCount: processedImage.palette.length,
        processingTimeMs: totalProcessingTime,
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('AI generation failed', {
        requestId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: processingTime,
      });

      return reply.code(500).send({
        error: 'GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to generate AI image',
      });
    }
  });

  /**
   * POST /api/ai/variations - Generate variations of an image
   */
  fastify.post('/variations', {
    schema: {
      body: AIVariationsRequestSchema,
      response: {
        200: {
          type: 'array',
          items: AIGenerationResponseSchema,
        },
      },
    },
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    const userId = request.user?.id;
    const body = request.body as AIVariationsRequest;
    
    logger.info('AI variations request received', {
      requestId,
      userId,
      count: body.count,
      dimensions: `${body.width}x${body.height}`,
    });

    try {
      const { assetId, imageData, count, colorLimit, width, height } = body;
      
      let sourceBuffer: Buffer;
      
      if (assetId) {
        // Get source image from database
        const [sourceAsset] = await db
          .select()
          .from(assets)
          .where(eq(assets.id, assetId))
          .limit(1);
          
        if (!sourceAsset) {
          return reply.code(404).send({
            error: 'NOT_FOUND',
            message: 'Source image not found',
          });
        }
        
        // Download source image
        const response = await fetch(sourceAsset.originalUrl);
        if (!response.ok) {
          throw new Error('Failed to download source image');
        }
        sourceBuffer = Buffer.from(await response.arrayBuffer());
        
      } else if (imageData) {
        // Decode base64 image data
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        sourceBuffer = Buffer.from(base64Data, 'base64');
        
      } else {
        return reply.code(400).send({
          error: 'BAD_REQUEST',
          message: 'Source image required (assetId or imageData)',
        });
      }

      // Generate variations using OpenAI
      const variations = await openaiService.generateVariations({
        image: sourceBuffer,
        n: count,
        size: '512x512',
        responseFormat: 'url',
        userId,
      });

      // Process each variation
      const results = await Promise.all(
        variations.map(async (variation, index) => {
          if (!variation.url) {
            throw new Error(`Variation ${index} failed: no URL returned`);
          }

          // Download variation
          const response = await fetch(variation.url);
          if (!response.ok) {
            throw new Error(`Failed to download variation ${index}`);
          }
          const variationBuffer = Buffer.from(await response.arrayBuffer());

          // Process variation
          const processed = await imageProcessingService.processAIImage(variationBuffer, {
            width,
            height,
            colorLimit,
            enableDithering: false,
            quantizationMethod: 'median-cut',
            preserveTransparency: true,
          });

          // Create thumbnail
          const thumbnail = await imageProcessingService.createThumbnail(
            processed.buffer,
            128
          );

          // Upload to storage
          const variationId = `${requestId}-var-${index}`;
          const filename = `ai-variation-${variationId}`;
          
          const [processedUrl, thumbUrl] = await Promise.all([
            storageService.uploadImage(processed.buffer, `${filename}.png`, 'image/png'),
            storageService.uploadImage(thumbnail, `${filename}-thumb.png`, 'image/png'),
          ]);

          // Save to database
          const [savedAsset] = await db.insert(assets).values({
            userId,
            type: 'ai',
            originalUrl: variation.url,
            processedUrl,
            thumbUrl,
            filename: `${filename}.png`,
            mimeType: 'image/png',
            width: processed.width,
            height: processed.height,
            sizeBytes: processed.sizeBytes,
            palette: processed.palette.map(color => 
              `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`
            ),
            metadata: {
              colorLimit,
              quantizationMethod: 'median-cut',
              processingTimeMs: processed.processingTimeMs,
              aiModel: 'dall-e-2',
            },
          }).returning();

          return {
            assetId: savedAsset.id,
            pngUrl: processedUrl,
            palette: processed.palette.map(color => 
              `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`
            ),
            width: processed.width,
            height: processed.height,
            colorCount: processed.palette.length,
            processingTimeMs: processed.processingTimeMs,
          };
        })
      );

      const totalProcessingTime = Date.now() - startTime;

      logger.info('AI variations completed successfully', {
        requestId,
        userId,
        variationCount: results.length,
        totalProcessingTimeMs: totalProcessingTime,
      });

      return reply.send(results);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('AI variations failed', {
        requestId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: processingTime,
      });

      return reply.code(500).send({
        error: 'VARIATIONS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to generate variations',
      });
    }
  });

  done();
};