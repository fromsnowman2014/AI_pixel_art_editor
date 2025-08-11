import { z } from 'zod';
export declare const IdSchema: z.ZodString;
export declare const TimestampSchema: z.ZodString;
export declare const AIGenerationModeSchema: z.ZodEnum<["new", "img2img"]>;
export declare const ColorQuantizationMethodSchema: z.ZodEnum<["median-cut", "wu"]>;
export declare const AIGenerateRequestSchema: z.ZodObject<{
    prompt: z.ZodString;
    mode: z.ZodEnum<["new", "img2img"]>;
    width: z.ZodNumber;
    height: z.ZodNumber;
    colorLimit: z.ZodNumber;
    referenceImageId: z.ZodOptional<z.ZodString>;
    referenceImageData: z.ZodOptional<z.ZodString>;
    seed: z.ZodOptional<z.ZodNumber>;
    enableDithering: z.ZodDefault<z.ZodBoolean>;
    quantizationMethod: z.ZodDefault<z.ZodEnum<["median-cut", "wu"]>>;
}, "strip", z.ZodTypeAny, {
    mode: "new" | "img2img";
    width: number;
    height: number;
    colorLimit: number;
    prompt: string;
    enableDithering: boolean;
    quantizationMethod: "median-cut" | "wu";
    referenceImageId?: string | undefined;
    referenceImageData?: string | undefined;
    seed?: number | undefined;
}, {
    mode: "new" | "img2img";
    width: number;
    height: number;
    colorLimit: number;
    prompt: string;
    referenceImageId?: string | undefined;
    referenceImageData?: string | undefined;
    seed?: number | undefined;
    enableDithering?: boolean | undefined;
    quantizationMethod?: "median-cut" | "wu" | undefined;
}>;
export declare const AIVariationsRequestSchema: z.ZodObject<{
    assetId: z.ZodOptional<z.ZodString>;
    imageData: z.ZodOptional<z.ZodString>;
    count: z.ZodDefault<z.ZodNumber>;
    colorLimit: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    colorLimit: number;
    count: number;
    assetId?: string | undefined;
    imageData?: string | undefined;
}, {
    width: number;
    height: number;
    colorLimit: number;
    count?: number | undefined;
    assetId?: string | undefined;
    imageData?: string | undefined;
}>;
export declare const AIGenerationResponseSchema: z.ZodObject<{
    assetId: z.ZodString;
    pngUrl: z.ZodString;
    palette: z.ZodArray<z.ZodString, "many">;
    width: z.ZodNumber;
    height: z.ZodNumber;
    colorCount: z.ZodNumber;
    processingTimeMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    palette: string[];
    assetId: string;
    pngUrl: string;
    colorCount: number;
    processingTimeMs: number;
}, {
    width: number;
    height: number;
    palette: string[];
    assetId: string;
    pngUrl: string;
    colorCount: number;
    processingTimeMs: number;
}>;
export declare const ProjectModeSchema: z.ZodEnum<["beginner", "advanced"]>;
export declare const CreateProjectRequestSchema: z.ZodObject<{
    name: z.ZodString;
    width: z.ZodNumber;
    height: z.ZodNumber;
    colorLimit: z.ZodNumber;
    palette: z.ZodArray<z.ZodString, "many">;
    mode: z.ZodDefault<z.ZodEnum<["beginner", "advanced"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    mode: "beginner" | "advanced";
    width: number;
    height: number;
    colorLimit: number;
    palette: string[];
}, {
    name: string;
    width: number;
    height: number;
    colorLimit: number;
    palette: string[];
    mode?: "beginner" | "advanced" | undefined;
}>;
export declare const UpdateProjectRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    palette: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    mode: z.ZodOptional<z.ZodEnum<["beginner", "advanced"]>>;
    activeFrameId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    mode?: "beginner" | "advanced" | undefined;
    palette?: string[] | undefined;
    activeFrameId?: string | undefined;
}, {
    name?: string | undefined;
    mode?: "beginner" | "advanced" | undefined;
    palette?: string[] | undefined;
    activeFrameId?: string | undefined;
}>;
export declare const ProjectResponseSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodNullable<z.ZodString>;
    name: z.ZodString;
    width: z.ZodNumber;
    height: z.ZodNumber;
    colorLimit: z.ZodNumber;
    palette: z.ZodArray<z.ZodString, "many">;
    mode: z.ZodEnum<["beginner", "advanced"]>;
    frames: z.ZodArray<z.ZodString, "many">;
    activeFrameId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    mode: "beginner" | "advanced";
    createdAt: string;
    updatedAt: string;
    userId: string | null;
    width: number;
    height: number;
    colorLimit: number;
    palette: string[];
    activeFrameId: string | null;
    frames: string[];
}, {
    id: string;
    name: string;
    mode: "beginner" | "advanced";
    createdAt: string;
    updatedAt: string;
    userId: string | null;
    width: number;
    height: number;
    colorLimit: number;
    palette: string[];
    activeFrameId: string | null;
    frames: string[];
}>;
export declare const CreateFrameRequestSchema: z.ZodObject<{
    projectId: z.ZodString;
    index: z.ZodNumber;
    delayMs: z.ZodDefault<z.ZodNumber>;
    included: z.ZodDefault<z.ZodBoolean>;
    layerIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    rawImageData: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectId: string;
    index: number;
    delayMs: number;
    included: boolean;
    layerIds?: string[] | undefined;
    rawImageData?: string | undefined;
}, {
    projectId: string;
    index: number;
    delayMs?: number | undefined;
    included?: boolean | undefined;
    layerIds?: string[] | undefined;
    rawImageData?: string | undefined;
}>;
export declare const UpdateFrameRequestSchema: z.ZodObject<{
    index: z.ZodOptional<z.ZodNumber>;
    delayMs: z.ZodOptional<z.ZodNumber>;
    included: z.ZodOptional<z.ZodBoolean>;
    rawImageData: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    index?: number | undefined;
    delayMs?: number | undefined;
    included?: boolean | undefined;
    rawImageData?: string | undefined;
}, {
    index?: number | undefined;
    delayMs?: number | undefined;
    included?: boolean | undefined;
    rawImageData?: string | undefined;
}>;
export declare const FrameResponseSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    index: z.ZodNumber;
    delayMs: z.ZodNumber;
    included: z.ZodBoolean;
    layers: z.ZodArray<z.ZodString, "many">;
    flattenedPngUrl: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    projectId: string;
    index: number;
    delayMs: number;
    included: boolean;
    flattenedPngUrl: string | null;
    layers: string[];
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    projectId: string;
    index: number;
    delayMs: number;
    included: boolean;
    flattenedPngUrl: string | null;
    layers: string[];
}>;
export declare const GifExportRequestSchema: z.ZodObject<{
    frameIds: z.ZodArray<z.ZodString, "many">;
    delays: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    globalDelayMs: z.ZodDefault<z.ZodNumber>;
    loop: z.ZodDefault<z.ZodBoolean>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    quality: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    frameIds: string[];
    globalDelayMs: number;
    loop: boolean;
    quality: number;
    width?: number | undefined;
    height?: number | undefined;
    delays?: number[] | undefined;
}, {
    frameIds: string[];
    width?: number | undefined;
    height?: number | undefined;
    delays?: number[] | undefined;
    globalDelayMs?: number | undefined;
    loop?: boolean | undefined;
    quality?: number | undefined;
}>;
export declare const GifExportResponseSchema: z.ZodObject<{
    gifUrl: z.ZodString;
    sizeBytes: z.ZodNumber;
    frameCount: z.ZodNumber;
    durationMs: z.ZodNumber;
    processingTimeMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    sizeBytes: number;
    processingTimeMs: number;
    gifUrl: string;
    frameCount: number;
    durationMs: number;
}, {
    sizeBytes: number;
    processingTimeMs: number;
    gifUrl: string;
    frameCount: number;
    durationMs: number;
}>;
export declare const FileUploadResponseSchema: z.ZodObject<{
    assetId: z.ZodString;
    originalUrl: z.ZodString;
    processedUrl: z.ZodOptional<z.ZodString>;
    thumbUrl: z.ZodOptional<z.ZodString>;
    width: z.ZodNumber;
    height: z.ZodNumber;
    sizeBytes: z.ZodNumber;
    mimeType: z.ZodString;
    palette: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    originalUrl: string;
    mimeType: string;
    sizeBytes: number;
    assetId: string;
    palette?: string[] | undefined;
    processedUrl?: string | undefined;
    thumbUrl?: string | undefined;
}, {
    width: number;
    height: number;
    originalUrl: string;
    mimeType: string;
    sizeBytes: number;
    assetId: string;
    palette?: string[] | undefined;
    processedUrl?: string | undefined;
    thumbUrl?: string | undefined;
}>;
export declare const CreateUserRequestSchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["parent", "teacher"]>>;
    locale: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    role: "parent" | "teacher";
    locale: string;
}, {
    email: string;
    role?: "parent" | "teacher" | undefined;
    locale?: string | undefined;
}>;
export declare const UserResponseSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<["parent", "teacher"]>;
    locale: z.ZodString;
    createdAt: z.ZodString;
    isVerified: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    role: "parent" | "teacher";
    locale: string;
    isVerified: boolean;
    createdAt: string;
}, {
    id: string;
    email: string;
    role: "parent" | "teacher";
    locale: string;
    isVerified: boolean;
    createdAt: string;
}>;
export declare const LoginRequestSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const VerifyTokenRequestSchema: z.ZodObject<{
    token: z.ZodString;
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    token: string;
}, {
    email: string;
    token: string;
}>;
export declare const AuthResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        role: z.ZodEnum<["parent", "teacher"]>;
        locale: z.ZodString;
        createdAt: z.ZodString;
        isVerified: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        email: string;
        role: "parent" | "teacher";
        locale: string;
        isVerified: boolean;
        createdAt: string;
    }, {
        id: string;
        email: string;
        role: "parent" | "teacher";
        locale: string;
        isVerified: boolean;
        createdAt: string;
    }>;
    expiresAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    expiresAt: string;
    user: {
        id: string;
        email: string;
        role: "parent" | "teacher";
        locale: string;
        isVerified: boolean;
        createdAt: string;
    };
    accessToken: string;
    refreshToken: string;
}, {
    expiresAt: string;
    user: {
        id: string;
        email: string;
        role: "parent" | "teacher";
        locale: string;
        isVerified: boolean;
        createdAt: string;
    };
    accessToken: string;
    refreshToken: string;
}>;
export declare const ApiErrorSchema: z.ZodObject<{
    error: z.ZodString;
    message: z.ZodString;
    statusCode: z.ZodNumber;
    timestamp: z.ZodString;
    path: z.ZodString;
    requestId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    path: string;
    message: string;
    error: string;
    timestamp: string;
    requestId: string;
    statusCode: number;
}, {
    path: string;
    message: string;
    error: string;
    timestamp: string;
    requestId: string;
    statusCode: number;
}>;
export declare const HealthCheckResponseSchema: z.ZodObject<{
    status: z.ZodEnum<["healthy", "degraded", "unhealthy"]>;
    timestamp: z.ZodString;
    version: z.ZodString;
    services: z.ZodObject<{
        database: z.ZodEnum<["healthy", "unhealthy"]>;
        redis: z.ZodEnum<["healthy", "unhealthy"]>;
        storage: z.ZodEnum<["healthy", "unhealthy"]>;
        openai: z.ZodEnum<["healthy", "unhealthy"]>;
    }, "strip", z.ZodTypeAny, {
        database: "healthy" | "unhealthy";
        redis: "healthy" | "unhealthy";
        storage: "healthy" | "unhealthy";
        openai: "healthy" | "unhealthy";
    }, {
        database: "healthy" | "unhealthy";
        redis: "healthy" | "unhealthy";
        storage: "healthy" | "unhealthy";
        openai: "healthy" | "unhealthy";
    }>;
    metrics: z.ZodObject<{
        uptime: z.ZodNumber;
        memoryUsage: z.ZodObject<{
            used: z.ZodNumber;
            total: z.ZodNumber;
            percentage: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            used: number;
            total: number;
            percentage: number;
        }, {
            used: number;
            total: number;
            percentage: number;
        }>;
        requestCount: z.ZodNumber;
        averageResponseTime: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        memoryUsage: {
            used: number;
            total: number;
            percentage: number;
        };
        uptime: number;
        requestCount: number;
        averageResponseTime: number;
    }, {
        memoryUsage: {
            used: number;
            total: number;
            percentage: number;
        };
        uptime: number;
        requestCount: number;
        averageResponseTime: number;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    version: string;
    services: {
        database: "healthy" | "unhealthy";
        redis: "healthy" | "unhealthy";
        storage: "healthy" | "unhealthy";
        openai: "healthy" | "unhealthy";
    };
    metrics: {
        memoryUsage: {
            used: number;
            total: number;
            percentage: number;
        };
        uptime: number;
        requestCount: number;
        averageResponseTime: number;
    };
}, {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    version: string;
    services: {
        database: "healthy" | "unhealthy";
        redis: "healthy" | "unhealthy";
        storage: "healthy" | "unhealthy";
        openai: "healthy" | "unhealthy";
    };
    metrics: {
        memoryUsage: {
            used: number;
            total: number;
            percentage: number;
        };
        uptime: number;
        requestCount: number;
        averageResponseTime: number;
    };
}>;
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
//# sourceMappingURL=api.d.ts.map