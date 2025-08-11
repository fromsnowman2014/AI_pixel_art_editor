"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportRoutes = void 0;
const api_1 = require("../types/api");
require("../types/fastify");
const imageProcessing_1 = require("../services/imageProcessing");
const storage_1 = require("../services/storage");
const connection_1 = require("../db/connection");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('export-routes');
const exportRoutes = (fastify, options, done) => {
    /**
     * POST /api/export/gif - Export frames as animated GIF
     */
    fastify.post('/gif', {
        schema: {
            body: api_1.GifExportRequestSchema,
            response: {
                200: api_1.GifExportResponseSchema,
            },
        },
        preHandler: [
            fastify.authenticate,
        ],
    }, async (request, reply) => {
        const startTime = Date.now();
        const requestId = (0, uuid_1.v4)();
        const userId = request.user?.id;
        const body = request.body;
        logger.info('GIF export request received', {
            requestId,
            userId,
            frameCount: body.frameIds.length,
            loop: body.loop,
            delays: body.delays,
        });
        try {
            // Validate frame IDs exist and belong to user's projects
            const frameRecords = await connection_1.db
                .select({
                frame: schema_1.frames,
                project: schema_1.projects,
            })
                .from(schema_1.frames)
                .innerJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.frames.projectId, schema_1.projects.id))
                .where((0, drizzle_orm_1.inArray)(schema_1.frames.id, body.frameIds));
            if (frameRecords.length !== body.frameIds.length) {
                return reply.code(400).send({
                    error: 'INVALID_FRAMES',
                    message: 'One or more frame IDs are invalid or inaccessible',
                    timestamp: new Date().toISOString(),
                    path: request.url,
                    requestId,
                });
            }
            // Check that delays array matches frame count if provided
            if (body.delays && body.delays.length !== body.frameIds.length) {
                return reply.code(400).send({
                    error: 'INVALID_DELAYS',
                    message: 'Delays array length must match number of frames',
                    timestamp: new Date().toISOString(),
                    path: request.url,
                    requestId,
                });
            }
            // Sort frames by the order specified in frameIds
            const orderedFrames = body.frameIds.map(frameId => frameRecords.find(record => record.frame.id === frameId)).filter(Boolean);
            // Download frame images from storage
            const frameImages = await Promise.all(orderedFrames.map(async (record) => {
                if (!record?.frame.flattenedPngUrl) {
                    throw new Error(`Frame ${record?.frame.id} has no image URL`);
                }
                const imageBuffer = await storage_1.storageService.download(record.frame.flattenedPngUrl);
                const delay = body.delays ?
                    body.delays[body.frameIds.indexOf(record.frame.id)] :
                    record.frame.delayMs;
                return {
                    buffer: imageBuffer,
                    delay: Math.max(50, delay), // Minimum 50ms delay
                    frameId: record.frame.id,
                };
            }));
            logger.info('Downloaded frame images for GIF assembly', {
                requestId,
                frameCount: frameImages.length,
            });
            // Create animated GIF
            const gifBuffer = await imageProcessing_1.imageProcessingService.createAnimatedGif({
                frames: frameImages.map(frame => ({
                    buffer: frame.buffer,
                    delay: frame.delay,
                })),
                loop: body.loop !== false, // Default to true
                quality: body.quality > 80 ? 'high' : body.quality > 50 ? 'medium' : 'low',
                width: orderedFrames[0]?.project.width,
                height: orderedFrames[0]?.project.height,
            });
            logger.info('GIF created successfully', {
                requestId,
                gifSize: gifBuffer.length,
                frameCount: frameImages.length,
            });
            // Upload GIF to storage
            const gifFilename = `gifs/${(0, uuid_1.v4)()}-${Date.now()}.gif`;
            const gifUrl = await storage_1.storageService.upload(gifFilename, gifBuffer, 'image/gif');
            logger.info('GIF uploaded to storage', {
                requestId,
                gifUrl,
                uploadTime: Date.now() - startTime,
            });
            // Record the export in database for analytics
            try {
                const projectId = orderedFrames[0]?.frame.projectId;
                if (projectId) {
                    // Could add an exports table for tracking
                    logger.info('GIF export completed', {
                        requestId,
                        projectId,
                        userId,
                        frameCount: frameImages.length,
                        totalTime: Date.now() - startTime,
                    });
                }
            }
            catch (analyticsError) {
                // Don't fail the request if analytics fail
                logger.warn('Failed to record export analytics', {
                    requestId,
                    error: analyticsError,
                });
            }
            return reply.send({
                gifUrl,
                frameCount: frameImages.length,
                totalDelayMs: frameImages.reduce((sum, frame) => sum + frame.delay, 0),
                sizeBytes: gifBuffer.length,
                processingTimeMs: Date.now() - startTime,
                requestId,
            });
        }
        catch (error) {
            logger.error('GIF export failed', {
                requestId,
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
                processingTime: Date.now() - startTime,
            });
            if (error instanceof Error) {
                if (error.message.includes('Invalid frame')) {
                    return reply.code(400).send({
                        error: 'INVALID_FRAME_DATA',
                        message: error.message,
                        timestamp: new Date().toISOString(),
                        path: request.url,
                        requestId,
                    });
                }
                if (error.message.includes('storage') || error.message.includes('download')) {
                    return reply.code(500).send({
                        error: 'STORAGE_ERROR',
                        message: 'Failed to process frame images',
                        timestamp: new Date().toISOString(),
                        path: request.url,
                        requestId,
                    });
                }
            }
            return reply.code(500).send({
                error: 'EXPORT_FAILED',
                message: 'Failed to create animated GIF',
                timestamp: new Date().toISOString(),
                path: request.url,
                requestId,
            });
        }
    });
    done();
};
exports.exportRoutes = exportRoutes;
//# sourceMappingURL=export.js.map