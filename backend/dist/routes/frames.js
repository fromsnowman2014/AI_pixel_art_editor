"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.frameRoutes = void 0;
const api_1 = require("../types/api");
require("../types/fastify");
const connection_1 = require("../db/connection");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('frame-routes');
const frameRoutes = (fastify, options, done) => {
    /**
     * POST /api/frames - Create a new frame
     */
    fastify.post('/', {
        schema: {
            body: api_1.CreateFrameRequestSchema,
            response: {
                201: api_1.FrameResponseSchema,
            },
        },
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        const userId = request.user?.id;
        const body = request.body;
        logger.info('Creating new frame', {
            userId,
            projectId: body.projectId,
            index: body.index,
        });
        try {
            // Check if project exists and user has access
            const [project] = await connection_1.db
                .select()
                .from(schema_1.projects)
                .where((0, drizzle_orm_1.eq)(schema_1.projects.id, body.projectId))
                .limit(1);
            if (!project) {
                return reply.code(404).send({
                    error: 'PROJECT_NOT_FOUND',
                    message: 'Project not found',
                });
            }
            if (project.userId !== userId && userId !== 'anonymous') {
                return reply.code(403).send({
                    error: 'ACCESS_DENIED',
                    message: 'You do not have permission to modify this project',
                });
            }
            // Create frame
            const [newFrame] = await connection_1.db.insert(schema_1.frames).values({
                projectId: body.projectId,
                index: body.index,
                delayMs: body.delayMs,
                included: body.included,
                rawRleData: body.rawImageData, // Map rawImageData to rawRleData
            }).returning();
            logger.info('Frame created successfully', {
                frameId: newFrame.id,
                projectId: body.projectId,
                userId,
            });
            // Get layer IDs for this frame (if any)
            const frameLayers = await connection_1.db
                .select({ id: schema_1.layers.id })
                .from(schema_1.layers)
                .where((0, drizzle_orm_1.eq)(schema_1.layers.frameId, newFrame.id))
                .orderBy(schema_1.layers.index);
            return reply.code(201).send({
                id: newFrame.id,
                projectId: newFrame.projectId,
                index: newFrame.index,
                delayMs: newFrame.delayMs,
                included: newFrame.included,
                layers: frameLayers.map(l => l.id),
                flattenedPngUrl: newFrame.flattenedPngUrl,
                createdAt: newFrame.createdAt.toISOString(),
                updatedAt: newFrame.updatedAt.toISOString(),
            });
        }
        catch (error) {
            logger.error('Failed to create frame', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId,
                projectId: body.projectId,
            });
            return reply.code(500).send({
                error: 'FRAME_CREATION_FAILED',
                message: 'Failed to create frame',
            });
        }
    });
    /**
     * GET /api/frames/:id - Get a specific frame
     */
    fastify.get('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                },
                required: ['id'],
            },
            response: {
                200: api_1.FrameResponseSchema,
            },
        },
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        const userId = request.user?.id;
        const { id } = request.params;
        try {
            // Get frame with project info
            const [frameWithProject] = await connection_1.db
                .select({
                frame: schema_1.frames,
                project: schema_1.projects,
            })
                .from(schema_1.frames)
                .innerJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.frames.projectId, schema_1.projects.id))
                .where((0, drizzle_orm_1.eq)(schema_1.frames.id, id))
                .limit(1);
            if (!frameWithProject) {
                return reply.code(404).send({
                    error: 'FRAME_NOT_FOUND',
                    message: 'Frame not found',
                });
            }
            const { frame, project } = frameWithProject;
            // Check access permissions
            if (!project.isTemplate && project.userId !== userId && userId !== 'anonymous') {
                return reply.code(403).send({
                    error: 'ACCESS_DENIED',
                    message: 'You do not have access to this frame',
                });
            }
            // Get layer IDs for this frame
            const frameLayers = await connection_1.db
                .select({ id: schema_1.layers.id })
                .from(schema_1.layers)
                .where((0, drizzle_orm_1.eq)(schema_1.layers.frameId, frame.id))
                .orderBy(schema_1.layers.index);
            logger.info('Frame retrieved', {
                frameId: id,
                projectId: frame.projectId,
                userId,
            });
            return reply.send({
                id: frame.id,
                projectId: frame.projectId,
                index: frame.index,
                delayMs: frame.delayMs,
                included: frame.included,
                layers: frameLayers.map(l => l.id),
                flattenedPngUrl: frame.flattenedPngUrl,
                createdAt: frame.createdAt.toISOString(),
                updatedAt: frame.updatedAt.toISOString(),
            });
        }
        catch (error) {
            logger.error('Failed to get frame', {
                error: error instanceof Error ? error.message : 'Unknown error',
                frameId: id,
                userId,
            });
            return reply.code(500).send({
                error: 'FRAME_FETCH_FAILED',
                message: 'Failed to retrieve frame',
            });
        }
    });
    /**
     * GET /api/frames/project/:projectId - Get all frames for a project
     */
    fastify.get('/project/:projectId', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    projectId: { type: 'string', format: 'uuid' },
                },
                required: ['projectId'],
            },
            response: {
                200: {
                    type: 'array',
                    items: api_1.FrameResponseSchema,
                },
            },
        },
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        const userId = request.user?.id;
        const { projectId } = request.params;
        try {
            // Check if project exists and user has access
            const [project] = await connection_1.db
                .select()
                .from(schema_1.projects)
                .where((0, drizzle_orm_1.eq)(schema_1.projects.id, projectId))
                .limit(1);
            if (!project) {
                return reply.code(404).send({
                    error: 'PROJECT_NOT_FOUND',
                    message: 'Project not found',
                });
            }
            if (!project.isTemplate && project.userId !== userId && userId !== 'anonymous') {
                return reply.code(403).send({
                    error: 'ACCESS_DENIED',
                    message: 'You do not have access to this project',
                });
            }
            // Get all frames for the project
            const projectFrames = await connection_1.db
                .select()
                .from(schema_1.frames)
                .where((0, drizzle_orm_1.eq)(schema_1.frames.projectId, projectId))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.frames.index));
            logger.info('Project frames retrieved', {
                projectId,
                userId,
                frameCount: projectFrames.length,
            });
            // Get layer IDs for each frame
            const frameResponses = await Promise.all(projectFrames.map(async (frame) => {
                const frameLayers = await connection_1.db
                    .select({ id: schema_1.layers.id })
                    .from(schema_1.layers)
                    .where((0, drizzle_orm_1.eq)(schema_1.layers.frameId, frame.id))
                    .orderBy(schema_1.layers.index);
                return {
                    id: frame.id,
                    projectId: frame.projectId,
                    index: frame.index,
                    delayMs: frame.delayMs,
                    included: frame.included,
                    layers: frameLayers.map(l => l.id),
                    flattenedPngUrl: frame.flattenedPngUrl,
                    createdAt: frame.createdAt.toISOString(),
                    updatedAt: frame.updatedAt.toISOString(),
                };
            }));
            return reply.send(frameResponses);
        }
        catch (error) {
            logger.error('Failed to get project frames', {
                error: error instanceof Error ? error.message : 'Unknown error',
                projectId,
                userId,
            });
            return reply.code(500).send({
                error: 'FRAMES_FETCH_FAILED',
                message: 'Failed to retrieve frames',
            });
        }
    });
    /**
     * PATCH /api/frames/:id - Update a frame
     */
    fastify.patch('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                },
                required: ['id'],
            },
            body: api_1.UpdateFrameRequestSchema,
            response: {
                200: api_1.FrameResponseSchema,
            },
        },
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        const userId = request.user?.id;
        const { id } = request.params;
        const body = request.body;
        try {
            // Get frame with project info
            const [frameWithProject] = await connection_1.db
                .select({
                frame: schema_1.frames,
                project: schema_1.projects,
            })
                .from(schema_1.frames)
                .innerJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.frames.projectId, schema_1.projects.id))
                .where((0, drizzle_orm_1.eq)(schema_1.frames.id, id))
                .limit(1);
            if (!frameWithProject) {
                return reply.code(404).send({
                    error: 'FRAME_NOT_FOUND',
                    message: 'Frame not found',
                });
            }
            const { frame, project } = frameWithProject;
            if (project.userId !== userId && userId !== 'anonymous') {
                return reply.code(403).send({
                    error: 'ACCESS_DENIED',
                    message: 'You do not have permission to update this frame',
                });
            }
            // Update frame
            const updateData = {
                updatedAt: new Date(),
            };
            if (body.index !== undefined)
                updateData.index = body.index;
            if (body.delayMs !== undefined)
                updateData.delayMs = body.delayMs;
            if (body.included !== undefined)
                updateData.included = body.included;
            if (body.rawImageData !== undefined)
                updateData.rawRleData = body.rawImageData;
            const [updatedFrame] = await connection_1.db
                .update(schema_1.frames)
                .set(updateData)
                .where((0, drizzle_orm_1.eq)(schema_1.frames.id, id))
                .returning();
            logger.info('Frame updated', {
                frameId: id,
                projectId: frame.projectId,
                userId,
                changes: Object.keys(body),
            });
            // Get layer IDs for this frame
            const frameLayers = await connection_1.db
                .select({ id: schema_1.layers.id })
                .from(schema_1.layers)
                .where((0, drizzle_orm_1.eq)(schema_1.layers.frameId, updatedFrame.id))
                .orderBy(schema_1.layers.index);
            return reply.send({
                id: updatedFrame.id,
                projectId: updatedFrame.projectId,
                index: updatedFrame.index,
                delayMs: updatedFrame.delayMs,
                included: updatedFrame.included,
                layers: frameLayers.map(l => l.id),
                flattenedPngUrl: updatedFrame.flattenedPngUrl,
                createdAt: updatedFrame.createdAt.toISOString(),
                updatedAt: updatedFrame.updatedAt.toISOString(),
            });
        }
        catch (error) {
            logger.error('Failed to update frame', {
                error: error instanceof Error ? error.message : 'Unknown error',
                frameId: id,
                userId,
            });
            return reply.code(500).send({
                error: 'FRAME_UPDATE_FAILED',
                message: 'Failed to update frame',
            });
        }
    });
    /**
     * DELETE /api/frames/:id - Delete a frame
     */
    fastify.delete('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                },
                required: ['id'],
            },
            response: {
                204: { type: 'null' },
            },
        },
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        const userId = request.user?.id;
        const { id } = request.params;
        try {
            // Get frame with project info
            const [frameWithProject] = await connection_1.db
                .select({
                frame: schema_1.frames,
                project: schema_1.projects,
            })
                .from(schema_1.frames)
                .innerJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.frames.projectId, schema_1.projects.id))
                .where((0, drizzle_orm_1.eq)(schema_1.frames.id, id))
                .limit(1);
            if (!frameWithProject) {
                return reply.code(404).send({
                    error: 'FRAME_NOT_FOUND',
                    message: 'Frame not found',
                });
            }
            const { frame, project } = frameWithProject;
            if (project.userId !== userId && userId !== 'anonymous') {
                return reply.code(403).send({
                    error: 'ACCESS_DENIED',
                    message: 'You do not have permission to delete this frame',
                });
            }
            // Check if this is the last frame (don't allow deletion)
            const [{ count: frameCount }] = await connection_1.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.frames)
                .where((0, drizzle_orm_1.eq)(schema_1.frames.projectId, frame.projectId));
            if (frameCount <= 1) {
                return reply.code(400).send({
                    error: 'CANNOT_DELETE_LAST_FRAME',
                    message: 'Cannot delete the last frame in a project',
                });
            }
            // If this is the active frame, update project to use a different frame
            if (project.activeFrameId === id) {
                const [alternativeFrame] = await connection_1.db
                    .select({ id: schema_1.frames.id })
                    .from(schema_1.frames)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.frames.projectId, frame.projectId), 
                // Find a different frame (not the one being deleted)
                (0, drizzle_orm_1.ne)(schema_1.frames.id, id)))
                    .limit(1);
                if (alternativeFrame) {
                    await connection_1.db
                        .update(schema_1.projects)
                        .set({
                        activeFrameId: alternativeFrame.id,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.projects.id, frame.projectId));
                }
            }
            // Delete frame (layers will be deleted via cascade)
            await connection_1.db.delete(schema_1.frames).where((0, drizzle_orm_1.eq)(schema_1.frames.id, id));
            logger.info('Frame deleted', {
                frameId: id,
                projectId: frame.projectId,
                userId,
            });
            return reply.code(204).send();
        }
        catch (error) {
            logger.error('Failed to delete frame', {
                error: error instanceof Error ? error.message : 'Unknown error',
                frameId: id,
                userId,
            });
            return reply.code(500).send({
                error: 'FRAME_DELETE_FAILED',
                message: 'Failed to delete frame',
            });
        }
    });
    /**
     * POST /api/frames/:id/duplicate - Duplicate a frame
     */
    fastify.post('/:id/duplicate', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                },
                required: ['id'],
            },
            body: {
                type: 'object',
                properties: {
                    index: { type: 'number', minimum: 0 },
                },
            },
            response: {
                201: api_1.FrameResponseSchema,
            },
        },
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        const userId = request.user?.id;
        const { id } = request.params;
        const { index } = request.body;
        try {
            // Get original frame with project info
            const [frameWithProject] = await connection_1.db
                .select({
                frame: schema_1.frames,
                project: schema_1.projects,
            })
                .from(schema_1.frames)
                .innerJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.frames.projectId, schema_1.projects.id))
                .where((0, drizzle_orm_1.eq)(schema_1.frames.id, id))
                .limit(1);
            if (!frameWithProject) {
                return reply.code(404).send({
                    error: 'FRAME_NOT_FOUND',
                    message: 'Frame not found',
                });
            }
            const { frame, project } = frameWithProject;
            if (project.userId !== userId && userId !== 'anonymous') {
                return reply.code(403).send({
                    error: 'ACCESS_DENIED',
                    message: 'You do not have permission to duplicate this frame',
                });
            }
            // Get the next index if not provided
            let targetIndex = index;
            if (targetIndex === undefined) {
                const [maxIndexResult] = await connection_1.db
                    .select({ maxIndex: schema_1.frames.index })
                    .from(schema_1.frames)
                    .where((0, drizzle_orm_1.eq)(schema_1.frames.projectId, frame.projectId))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.frames.index))
                    .limit(1);
                targetIndex = (maxIndexResult?.maxIndex || 0) + 1;
            }
            // Create duplicate frame
            const [duplicateFrame] = await connection_1.db.insert(schema_1.frames).values({
                projectId: frame.projectId,
                index: targetIndex,
                delayMs: frame.delayMs,
                included: frame.included,
                rawRleData: frame.rawRleData,
            }).returning();
            // Copy layers from original frame
            const originalLayers = await connection_1.db
                .select()
                .from(schema_1.layers)
                .where((0, drizzle_orm_1.eq)(schema_1.layers.frameId, frame.id))
                .orderBy(schema_1.layers.index);
            for (const layer of originalLayers) {
                await connection_1.db.insert(schema_1.layers).values({
                    frameId: duplicateFrame.id,
                    index: layer.index,
                    name: layer.name,
                    visible: layer.visible,
                    opacity: layer.opacity,
                    blendMode: layer.blendMode,
                    layerData: layer.layerData,
                });
            }
            logger.info('Frame duplicated', {
                originalFrameId: id,
                duplicateFrameId: duplicateFrame.id,
                projectId: frame.projectId,
                userId,
            });
            // Get layer IDs for the duplicated frame
            const duplicatedLayers = await connection_1.db
                .select({ id: schema_1.layers.id })
                .from(schema_1.layers)
                .where((0, drizzle_orm_1.eq)(schema_1.layers.frameId, duplicateFrame.id))
                .orderBy(schema_1.layers.index);
            return reply.code(201).send({
                id: duplicateFrame.id,
                projectId: duplicateFrame.projectId,
                index: duplicateFrame.index,
                delayMs: duplicateFrame.delayMs,
                included: duplicateFrame.included,
                layers: duplicatedLayers.map(l => l.id),
                flattenedPngUrl: duplicateFrame.flattenedPngUrl,
                createdAt: duplicateFrame.createdAt.toISOString(),
                updatedAt: duplicateFrame.updatedAt.toISOString(),
            });
        }
        catch (error) {
            logger.error('Failed to duplicate frame', {
                error: error instanceof Error ? error.message : 'Unknown error',
                originalFrameId: id,
                userId,
            });
            return reply.code(500).send({
                error: 'FRAME_DUPLICATE_FAILED',
                message: 'Failed to duplicate frame',
            });
        }
    });
    /**
     * PUT /api/frames/reorder - Reorder frames within a project
     */
    fastify.put('/reorder', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    projectId: { type: 'string', format: 'uuid' },
                    frameIds: {
                        type: 'array',
                        items: { type: 'string', format: 'uuid' },
                        minItems: 1,
                    },
                },
                required: ['projectId', 'frameIds'],
            },
            response: {
                200: {
                    type: 'array',
                    items: api_1.FrameResponseSchema,
                },
            },
        },
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        const userId = request.user?.id;
        const { projectId, frameIds } = request.body;
        try {
            // Check if project exists and user has access
            const [project] = await connection_1.db
                .select()
                .from(schema_1.projects)
                .where((0, drizzle_orm_1.eq)(schema_1.projects.id, projectId))
                .limit(1);
            if (!project) {
                return reply.code(404).send({
                    error: 'PROJECT_NOT_FOUND',
                    message: 'Project not found',
                });
            }
            if (project.userId !== userId && userId !== 'anonymous') {
                return reply.code(403).send({
                    error: 'ACCESS_DENIED',
                    message: 'You do not have permission to reorder frames in this project',
                });
            }
            // Update frame indices
            const updatedFrames = [];
            for (let i = 0; i < frameIds.length; i++) {
                const [updatedFrame] = await connection_1.db
                    .update(schema_1.frames)
                    .set({
                    index: i,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.frames.id, frameIds[i]), (0, drizzle_orm_1.eq)(schema_1.frames.projectId, projectId)))
                    .returning();
                if (updatedFrame) {
                    // Get layer IDs for this frame
                    const frameLayers = await connection_1.db
                        .select({ id: schema_1.layers.id })
                        .from(schema_1.layers)
                        .where((0, drizzle_orm_1.eq)(schema_1.layers.frameId, updatedFrame.id))
                        .orderBy(schema_1.layers.index);
                    updatedFrames.push({
                        id: updatedFrame.id,
                        projectId: updatedFrame.projectId,
                        index: updatedFrame.index,
                        delayMs: updatedFrame.delayMs,
                        included: updatedFrame.included,
                        layers: frameLayers.map(l => l.id),
                        flattenedPngUrl: updatedFrame.flattenedPngUrl,
                        createdAt: updatedFrame.createdAt.toISOString(),
                        updatedAt: updatedFrame.updatedAt.toISOString(),
                    });
                }
            }
            logger.info('Frames reordered', {
                projectId,
                userId,
                frameCount: updatedFrames.length,
            });
            return reply.send(updatedFrames);
        }
        catch (error) {
            logger.error('Failed to reorder frames', {
                error: error instanceof Error ? error.message : 'Unknown error',
                projectId,
                userId,
            });
            return reply.code(500).send({
                error: 'FRAME_REORDER_FAILED',
                message: 'Failed to reorder frames',
            });
        }
    });
    done();
};
exports.frameRoutes = frameRoutes;
//# sourceMappingURL=frames.js.map