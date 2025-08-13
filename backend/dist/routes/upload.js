"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = void 0;
require("../types/fastify");
const imageProcessing_1 = require("../services/imageProcessing");
const storage_1 = require("../services/storage");
const connection_1 = require("../db/connection");
const schema_1 = require("../db/schema");
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const zod_1 = require("zod");
const logger = (0, logger_1.createLogger)('upload-routes');
const UploadResponseSchema = zod_1.z.object({
    assetId: zod_1.z.string().uuid(),
    originalUrl: zod_1.z.string().url(),
    processedUrl: zod_1.z.string().url(),
    thumbnailUrl: zod_1.z.string().url().optional(),
    width: zod_1.z.number(),
    height: zod_1.z.number(),
    originalSize: zod_1.z.number(),
    processedSize: zod_1.z.number(),
    palette: zod_1.z.array(zod_1.z.string()),
    colorCount: zod_1.z.number(),
    processingTimeMs: zod_1.z.number(),
});
const ProcessOptionsSchema = zod_1.z.object({
    width: zod_1.z.number().min(8).max(1024).optional(),
    height: zod_1.z.number().min(8).max(1024).optional(),
    colorLimit: zod_1.z.number().min(2).max(256).default(24),
    preserveAspectRatio: zod_1.z.boolean().default(true),
    enableDithering: zod_1.z.boolean().default(false),
    quantizationMethod: zod_1.z.enum(['median-cut', 'wu']).default('median-cut'),
});
const uploadRoutes = (fastify, options, done) => {
    /**
     * POST /api/upload - Upload and process image for pixel art
     */
    fastify.post('/image', {
        schema: {
            consumes: ['multipart/form-data'],
            response: {
                200: UploadResponseSchema,
            },
        },
    }, async (request, reply) => {
        const startTime = Date.now();
        const requestId = (0, uuid_1.v4)();
        const userId = request.user?.id;
        logger.info('Image upload request received', {
            requestId,
            userId,
        });
        try {
            // Parse multipart form data
            const parts = request.parts();
            let imageFile = null;
            let processOptions = {};
            for await (const part of parts) {
                if (part.file) {
                    // This is the file upload
                    if (part.fieldname === 'image') {
                        const chunks = [];
                        for await (const chunk of part.file) {
                            chunks.push(chunk);
                        }
                        imageFile = {
                            filename: part.filename,
                            mimetype: part.mimetype,
                            buffer: Buffer.concat(chunks),
                        };
                    }
                }
                else {
                    // This is form data (processing options)
                    if (part.fieldname === 'options') {
                        try {
                            processOptions = JSON.parse(part.value);
                        }
                        catch (error) {
                            logger.warn('Invalid options JSON', { requestId, error });
                        }
                    }
                    else {
                        // Individual form fields
                        processOptions[part.fieldname] = part.value;
                    }
                }
            }
            if (!imageFile) {
                return reply.code(400).send({
                    error: 'NO_FILE',
                    message: 'No image file provided',
                    timestamp: new Date().toISOString(),
                    path: request.url,
                    requestId,
                });
            }
            // Validate file type
            const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
            if (!allowedMimeTypes.includes(imageFile.mimetype)) {
                return reply.code(400).send({
                    error: 'INVALID_FILE_TYPE',
                    message: `Unsupported file type: ${imageFile.mimetype}. Supported types: ${allowedMimeTypes.join(', ')}`,
                    timestamp: new Date().toISOString(),
                    path: request.url,
                    requestId,
                });
            }
            // Validate file size (10MB max)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (imageFile.buffer.length > maxSize) {
                return reply.code(400).send({
                    error: 'FILE_TOO_LARGE',
                    message: `File size exceeds ${maxSize} bytes`,
                    timestamp: new Date().toISOString(),
                    path: request.url,
                    requestId,
                });
            }
            logger.info('File validated successfully', {
                requestId,
                filename: imageFile.filename,
                mimetype: imageFile.mimetype,
                sizeBytes: imageFile.buffer.length,
            });
            // Parse and validate processing options
            const validatedOptions = ProcessOptionsSchema.parse(processOptions);
            logger.info('Processing uploaded image', {
                requestId,
                options: validatedOptions,
            });
            // Upload original file to storage
            const originalFilename = `uploads/original/${requestId}-${imageFile.filename}`;
            const originalUrl = await storage_1.storageService.upload(originalFilename, imageFile.buffer, imageFile.mimetype);
            // Process the image for pixel art
            const processedImage = await imageProcessing_1.imageProcessingService.processAIImage(imageFile.buffer, {
                width: validatedOptions.width || 32, // Default to 32x32 if not specified
                height: validatedOptions.height || 32,
                colorLimit: validatedOptions.colorLimit,
                enableDithering: validatedOptions.enableDithering,
                quantizationMethod: validatedOptions.quantizationMethod,
                preserveTransparency: true,
                scalingMethod: 'nearest', // Preserve pixel art style
            });
            logger.info('Image processed successfully', {
                requestId,
                processedSize: processedImage.sizeBytes,
                colorCount: processedImage.palette.length,
                processingTime: processedImage.processingTimeMs,
            });
            // Upload processed image to storage
            const processedFilename = `uploads/processed/${requestId}-processed.png`;
            const processedUrl = await storage_1.storageService.upload(processedFilename, processedImage.buffer, 'image/png');
            // Create thumbnail (16x16 version)
            const thumbnailImage = await imageProcessing_1.imageProcessingService.processAIImage(processedImage.buffer, {
                width: 16,
                height: 16,
                colorLimit: validatedOptions.colorLimit,
                enableDithering: false,
                quantizationMethod: validatedOptions.quantizationMethod,
                preserveTransparency: true,
                scalingMethod: 'nearest',
            });
            const thumbnailFilename = `uploads/thumbnails/${requestId}-thumb.png`;
            const thumbnailUrl = await storage_1.storageService.upload(thumbnailFilename, thumbnailImage.buffer, 'image/png');
            // Save asset metadata to database
            const assetId = (0, uuid_1.v4)();
            const asset = await connection_1.db.insert(schema_1.assets).values({
                id: assetId,
                userId: userId === 'anonymous' ? null : userId,
                type: 'upload',
                originalUrl,
                thumbUrl: thumbnailUrl,
                metadata: {
                    filename: imageFile.filename,
                    originalMimetype: imageFile.mimetype,
                    originalSizeBytes: imageFile.buffer.length,
                    processedSizeBytes: processedImage.sizeBytes,
                    width: processedImage.width,
                    height: processedImage.height,
                    colorCount: processedImage.palette.length,
                    palette: processedImage.palette,
                    processingOptions: validatedOptions,
                    processingTimeMs: processedImage.processingTimeMs,
                    requestId,
                },
            }).returning();
            logger.info('Upload completed successfully', {
                requestId,
                assetId,
                totalTime: Date.now() - startTime,
            });
            return reply.send({
                assetId,
                originalUrl,
                processedUrl,
                thumbnailUrl,
                width: processedImage.width,
                height: processedImage.height,
                originalSize: imageFile.buffer.length,
                processedSize: processedImage.sizeBytes,
                palette: processedImage.palette.map(color => `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`),
                colorCount: processedImage.palette.length,
                processingTimeMs: Date.now() - startTime,
            });
        }
        catch (error) {
            logger.error('Upload failed', {
                requestId,
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
                processingTime: Date.now() - startTime,
            });
            if (error instanceof Error) {
                if (error.message.includes('Invalid image')) {
                    return reply.code(400).send({
                        error: 'INVALID_IMAGE',
                        message: 'The uploaded file is not a valid image',
                        timestamp: new Date().toISOString(),
                        path: request.url,
                        requestId,
                    });
                }
                if (error.message.includes('storage') || error.message.includes('upload')) {
                    return reply.code(500).send({
                        error: 'STORAGE_ERROR',
                        message: 'Failed to store uploaded image',
                        timestamp: new Date().toISOString(),
                        path: request.url,
                        requestId,
                    });
                }
            }
            return reply.code(500).send({
                error: 'UPLOAD_FAILED',
                message: 'Failed to process uploaded image',
                timestamp: new Date().toISOString(),
                path: request.url,
                requestId,
            });
        }
    });
    done();
};
exports.uploadRoutes = uploadRoutes;
//# sourceMappingURL=upload.js.map