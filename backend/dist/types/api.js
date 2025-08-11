"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheckResponseSchema = exports.ApiErrorSchema = exports.AuthResponseSchema = exports.VerifyTokenRequestSchema = exports.LoginRequestSchema = exports.UserResponseSchema = exports.CreateUserRequestSchema = exports.FileUploadResponseSchema = exports.GifExportResponseSchema = exports.GifExportRequestSchema = exports.FrameResponseSchema = exports.UpdateFrameRequestSchema = exports.CreateFrameRequestSchema = exports.ProjectResponseSchema = exports.UpdateProjectRequestSchema = exports.CreateProjectRequestSchema = exports.ProjectModeSchema = exports.AIGenerationResponseSchema = exports.AIVariationsRequestSchema = exports.AIGenerateRequestSchema = exports.ColorQuantizationMethodSchema = exports.AIGenerationModeSchema = exports.TimestampSchema = exports.IdSchema = void 0;
const zod_1 = require("zod");
// Common types
exports.IdSchema = zod_1.z.string().uuid();
exports.TimestampSchema = zod_1.z.string().datetime();
// AI Generation Types
exports.AIGenerationModeSchema = zod_1.z.enum(['new', 'img2img']);
exports.ColorQuantizationMethodSchema = zod_1.z.enum(['median-cut', 'wu']);
exports.AIGenerateRequestSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(1).max(1000),
    mode: exports.AIGenerationModeSchema,
    width: zod_1.z.number().min(8).max(1024),
    height: zod_1.z.number().min(8).max(1024),
    colorLimit: zod_1.z.number().min(2).max(256),
    referenceImageId: zod_1.z.string().uuid().optional(),
    referenceImageData: zod_1.z.string().optional(), // base64 encoded
    seed: zod_1.z.number().optional(),
    enableDithering: zod_1.z.boolean().default(false),
    quantizationMethod: exports.ColorQuantizationMethodSchema.default('median-cut'),
});
exports.AIVariationsRequestSchema = zod_1.z.object({
    assetId: zod_1.z.string().uuid().optional(),
    imageData: zod_1.z.string().optional(), // base64 encoded
    count: zod_1.z.number().min(1).max(4).default(4),
    colorLimit: zod_1.z.number().min(2).max(256),
    width: zod_1.z.number().min(8).max(1024),
    height: zod_1.z.number().min(8).max(1024),
});
exports.AIGenerationResponseSchema = zod_1.z.object({
    assetId: zod_1.z.string().uuid(),
    pngUrl: zod_1.z.string().url(),
    palette: zod_1.z.array(zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/)),
    width: zod_1.z.number(),
    height: zod_1.z.number(),
    colorCount: zod_1.z.number(),
    processingTimeMs: zod_1.z.number(),
});
// Project Types
exports.ProjectModeSchema = zod_1.z.enum(['beginner', 'advanced']);
exports.CreateProjectRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    width: zod_1.z.number().min(8).max(1024),
    height: zod_1.z.number().min(8).max(1024),
    colorLimit: zod_1.z.number().min(2).max(256),
    palette: zod_1.z.array(zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(256),
    mode: exports.ProjectModeSchema.default('beginner'),
});
exports.UpdateProjectRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    palette: zod_1.z.array(zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(256).optional(),
    mode: exports.ProjectModeSchema.optional(),
    activeFrameId: zod_1.z.string().uuid().optional(),
});
exports.ProjectResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid().nullable(),
    name: zod_1.z.string(),
    width: zod_1.z.number(),
    height: zod_1.z.number(),
    colorLimit: zod_1.z.number(),
    palette: zod_1.z.array(zod_1.z.string()),
    mode: exports.ProjectModeSchema,
    frames: zod_1.z.array(zod_1.z.string().uuid()),
    activeFrameId: zod_1.z.string().uuid().nullable(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// Frame Types
exports.CreateFrameRequestSchema = zod_1.z.object({
    projectId: zod_1.z.string().uuid(),
    index: zod_1.z.number().min(0),
    delayMs: zod_1.z.number().min(50).max(10000).default(500),
    included: zod_1.z.boolean().default(true),
    layerIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    rawImageData: zod_1.z.string().optional(), // base64 encoded RLE or PNG data
});
exports.UpdateFrameRequestSchema = zod_1.z.object({
    index: zod_1.z.number().min(0).optional(),
    delayMs: zod_1.z.number().min(50).max(10000).optional(),
    included: zod_1.z.boolean().optional(),
    rawImageData: zod_1.z.string().optional(),
});
exports.FrameResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    projectId: zod_1.z.string().uuid(),
    index: zod_1.z.number(),
    delayMs: zod_1.z.number(),
    included: zod_1.z.boolean(),
    layers: zod_1.z.array(zod_1.z.string().uuid()),
    flattenedPngUrl: zod_1.z.string().url().nullable(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// GIF Export Types
exports.GifExportRequestSchema = zod_1.z.object({
    frameIds: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(100),
    delays: zod_1.z.array(zod_1.z.number().min(50).max(10000)).optional(), // per-frame delays
    globalDelayMs: zod_1.z.number().min(50).max(10000).default(500),
    loop: zod_1.z.boolean().default(true),
    width: zod_1.z.number().min(8).max(1024).optional(),
    height: zod_1.z.number().min(8).max(1024).optional(),
    quality: zod_1.z.number().min(1).max(100).default(80),
});
exports.GifExportResponseSchema = zod_1.z.object({
    gifUrl: zod_1.z.string().url(),
    sizeBytes: zod_1.z.number(),
    frameCount: zod_1.z.number(),
    durationMs: zod_1.z.number(),
    processingTimeMs: zod_1.z.number(),
});
// Upload Types
exports.FileUploadResponseSchema = zod_1.z.object({
    assetId: zod_1.z.string().uuid(),
    originalUrl: zod_1.z.string().url(),
    processedUrl: zod_1.z.string().url().optional(),
    thumbUrl: zod_1.z.string().url().optional(),
    width: zod_1.z.number(),
    height: zod_1.z.number(),
    sizeBytes: zod_1.z.number(),
    mimeType: zod_1.z.string(),
    palette: zod_1.z.array(zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/)).optional(),
});
// User Types (for parent/teacher accounts)
exports.CreateUserRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(['parent', 'teacher']).default('parent'),
    locale: zod_1.z.string().default('en'),
});
exports.UserResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(['parent', 'teacher']),
    locale: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    isVerified: zod_1.z.boolean(),
});
// Auth Types
exports.LoginRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.VerifyTokenRequestSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
});
exports.AuthResponseSchema = zod_1.z.object({
    accessToken: zod_1.z.string(),
    refreshToken: zod_1.z.string(),
    user: exports.UserResponseSchema,
    expiresAt: zod_1.z.string().datetime(),
});
// Error Response Types
exports.ApiErrorSchema = zod_1.z.object({
    error: zod_1.z.string(),
    message: zod_1.z.string(),
    statusCode: zod_1.z.number(),
    timestamp: zod_1.z.string().datetime(),
    path: zod_1.z.string(),
    requestId: zod_1.z.string().uuid(),
});
// Health Check Types
exports.HealthCheckResponseSchema = zod_1.z.object({
    status: zod_1.z.enum(['healthy', 'degraded', 'unhealthy']),
    timestamp: zod_1.z.string().datetime(),
    version: zod_1.z.string(),
    services: zod_1.z.object({
        database: zod_1.z.enum(['healthy', 'unhealthy']),
        redis: zod_1.z.enum(['healthy', 'unhealthy']),
        storage: zod_1.z.enum(['healthy', 'unhealthy']),
        openai: zod_1.z.enum(['healthy', 'unhealthy']),
    }),
    metrics: zod_1.z.object({
        uptime: zod_1.z.number(),
        memoryUsage: zod_1.z.object({
            used: zod_1.z.number(),
            total: zod_1.z.number(),
            percentage: zod_1.z.number(),
        }),
        requestCount: zod_1.z.number(),
        averageResponseTime: zod_1.z.number(),
    }),
});
//# sourceMappingURL=api.js.map