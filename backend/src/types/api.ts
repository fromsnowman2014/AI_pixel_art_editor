import { z } from 'zod';

// Common types
export const IdSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();

// AI Generation Types
export const AIGenerationModeSchema = z.enum(['new', 'img2img']);
export const ColorQuantizationMethodSchema = z.enum(['median-cut', 'wu']);

export const AIGenerateRequestSchema = z.object({
  prompt: z.string().min(1).max(1000),
  mode: AIGenerationModeSchema,
  width: z.number().min(8).max(1024),
  height: z.number().min(8).max(1024),
  colorLimit: z.number().min(2).max(256),
  referenceImageId: z.string().uuid().optional(),
  referenceImageData: z.string().optional(), // base64 encoded
  seed: z.number().optional(),
  enableDithering: z.boolean().default(false),
  quantizationMethod: ColorQuantizationMethodSchema.default('median-cut'),
});

export const AIVariationsRequestSchema = z.object({
  assetId: z.string().uuid().optional(),
  imageData: z.string().optional(), // base64 encoded
  count: z.number().min(1).max(4).default(4),
  colorLimit: z.number().min(2).max(256),
  width: z.number().min(8).max(1024),
  height: z.number().min(8).max(1024),
});

export const AIGenerationResponseSchema = z.object({
  assetId: z.string().uuid(),
  pngUrl: z.string().url(),
  palette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)),
  width: z.number(),
  height: z.number(),
  colorCount: z.number(),
  processingTimeMs: z.number(),
});

// Project Types
export const ProjectModeSchema = z.enum(['beginner', 'advanced']);

export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1).max(100),
  width: z.number().min(8).max(1024),
  height: z.number().min(8).max(1024),
  colorLimit: z.number().min(2).max(256),
  palette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(256),
  mode: ProjectModeSchema.default('beginner'),
});

export const UpdateProjectRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  palette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(256).optional(),
  mode: ProjectModeSchema.optional(),
  activeFrameId: z.string().uuid().optional(),
});

export const ProjectResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  name: z.string(),
  width: z.number(),
  height: z.number(),
  colorLimit: z.number(),
  palette: z.array(z.string()),
  mode: ProjectModeSchema,
  frames: z.array(z.string().uuid()),
  activeFrameId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Frame Types
export const CreateFrameRequestSchema = z.object({
  projectId: z.string().uuid(),
  index: z.number().min(0),
  delayMs: z.number().min(50).max(10000).default(500),
  included: z.boolean().default(true),
  layerIds: z.array(z.string().uuid()).optional(),
  rawImageData: z.string().optional(), // base64 encoded RLE or PNG data
});

export const UpdateFrameRequestSchema = z.object({
  index: z.number().min(0).optional(),
  delayMs: z.number().min(50).max(10000).optional(),
  included: z.boolean().optional(),
  rawImageData: z.string().optional(),
});

export const FrameResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  index: z.number(),
  delayMs: z.number(),
  included: z.boolean(),
  layers: z.array(z.string().uuid()),
  flattenedPngUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// GIF Export Types
export const GifExportRequestSchema = z.object({
  frameIds: z.array(z.string().uuid()).min(1).max(100),
  delays: z.array(z.number().min(50).max(10000)).optional(), // per-frame delays
  globalDelayMs: z.number().min(50).max(10000).default(500),
  loop: z.boolean().default(true),
  width: z.number().min(8).max(1024).optional(),
  height: z.number().min(8).max(1024).optional(),
  quality: z.number().min(1).max(100).default(80),
});

export const GifExportResponseSchema = z.object({
  gifUrl: z.string().url(),
  sizeBytes: z.number(),
  frameCount: z.number(),
  durationMs: z.number(),
  processingTimeMs: z.number(),
});

// Upload Types
export const FileUploadResponseSchema = z.object({
  assetId: z.string().uuid(),
  originalUrl: z.string().url(),
  processedUrl: z.string().url().optional(),
  thumbUrl: z.string().url().optional(),
  width: z.number(),
  height: z.number(),
  sizeBytes: z.number(),
  mimeType: z.string(),
  palette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).optional(),
});

// User Types (for parent/teacher accounts)
export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  role: z.enum(['parent', 'teacher']).default('parent'),
  locale: z.string().default('en'),
});

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['parent', 'teacher']),
  locale: z.string(),
  createdAt: z.string().datetime(),
  isVerified: z.boolean(),
});

// Auth Types
export const LoginRequestSchema = z.object({
  email: z.string().email(),
});

export const VerifyTokenRequestSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
});

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserResponseSchema,
  expiresAt: z.string().datetime(),
});

// Error Response Types
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
  timestamp: z.string().datetime(),
  path: z.string(),
  requestId: z.string().uuid(),
});

// Health Check Types
export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  version: z.string(),
  services: z.object({
    database: z.enum(['healthy', 'unhealthy']),
    redis: z.enum(['healthy', 'unhealthy']),
    storage: z.enum(['healthy', 'unhealthy']),
    openai: z.enum(['healthy', 'unhealthy']),
  }),
  metrics: z.object({
    uptime: z.number(),
    memoryUsage: z.object({
      used: z.number(),
      total: z.number(),
      percentage: z.number(),
    }),
    requestCount: z.number(),
    averageResponseTime: z.number(),
  }),
});

// Export all schemas as types
export type AIGenerateRequest = z.infer<typeof AIGenerateRequestSchema>;
export type AIVariationsRequest = z.infer<typeof AIVariationsRequestSchema>;
export type AIGenerationResponse = z.infer<typeof AIGenerationResponseSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;
export type CreateFrameRequest = z.infer<typeof CreateFrameRequestSchema>;
export type UpdateFrameRequest = z.infer<typeof UpdateFrameRequestSchema>;
export type FrameResponse = z.infer<typeof FrameResponseSchema>;
export type GifExportRequest = z.infer<typeof GifExportRequestSchema>;
export type GifExportResponse = z.infer<typeof GifExportResponseSchema>;
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type VerifyTokenRequest = z.infer<typeof VerifyTokenRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;