"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRelations = exports.assetsRelations = exports.layersRelations = exports.framesRelations = exports.projectsRelations = exports.usersRelations = exports.systemLogs = exports.analytics = exports.rateLimits = exports.assets = exports.layers = exports.frames = exports.projects = exports.users = exports.assetTypeEnum = exports.projectModeEnum = exports.userRoleEnum = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
// Enums
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', ['parent', 'teacher']);
exports.projectModeEnum = (0, pg_core_1.pgEnum)('project_mode', ['beginner', 'advanced']);
exports.assetTypeEnum = (0, pg_core_1.pgEnum)('asset_type', ['upload', 'ai', 'generated']);
// Users table (for parent/teacher accounts - COPPA compliant)
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    role: (0, exports.userRoleEnum)('role').notNull().default('parent'),
    locale: (0, pg_core_1.varchar)('locale', { length: 10 }).notNull().default('en'),
    isVerified: (0, pg_core_1.boolean)('is_verified').notNull().default(false),
    emailVerificationToken: (0, pg_core_1.varchar)('email_verification_token', { length: 255 }),
    emailVerificationExpires: (0, pg_core_1.timestamp)('email_verification_expires'),
    lastLoginAt: (0, pg_core_1.timestamp)('last_login_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Projects table
exports.projects = (0, pg_core_1.pgTable)('projects', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id, { onDelete: 'set null' }), // null for anonymous users
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    width: (0, pg_core_1.integer)('width').notNull(),
    height: (0, pg_core_1.integer)('height').notNull(),
    colorLimit: (0, pg_core_1.integer)('color_limit').notNull(),
    palette: (0, pg_core_1.jsonb)('palette').$type().notNull(), // array of hex colors
    mode: (0, exports.projectModeEnum)('mode').notNull().default('beginner'),
    activeFrameId: (0, pg_core_1.uuid)('active_frame_id'),
    isTemplate: (0, pg_core_1.boolean)('is_template').notNull().default(false),
    templateCategory: (0, pg_core_1.varchar)('template_category', { length: 50 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Frames table (for animation/GIF support)
exports.frames = (0, pg_core_1.pgTable)('frames', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    projectId: (0, pg_core_1.uuid)('project_id').references(() => exports.projects.id, { onDelete: 'cascade' }).notNull(),
    index: (0, pg_core_1.integer)('index').notNull(),
    delayMs: (0, pg_core_1.integer)('delay_ms').notNull().default(500),
    included: (0, pg_core_1.boolean)('included').notNull().default(true),
    flattenedPngUrl: (0, pg_core_1.varchar)('flattened_png_url', { length: 512 }), // stored image URL
    rawRleData: (0, pg_core_1.text)('raw_rle_data'), // compressed pixel data (RLE encoded)
    checksumMd5: (0, pg_core_1.varchar)('checksum_md5', { length: 32 }), // for integrity checking
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Layers table (optional feature for advanced mode)
exports.layers = (0, pg_core_1.pgTable)('layers', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    frameId: (0, pg_core_1.uuid)('frame_id').references(() => exports.frames.id, { onDelete: 'cascade' }).notNull(),
    index: (0, pg_core_1.integer)('index').notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    visible: (0, pg_core_1.boolean)('visible').notNull().default(true),
    opacity: (0, pg_core_1.real)('opacity').notNull().default(1.0),
    blendMode: (0, pg_core_1.varchar)('blend_mode', { length: 20 }).notNull().default('normal'),
    layerData: (0, pg_core_1.text)('layer_data'), // compressed layer pixel data
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Assets table (for storing generated images, uploads, etc.)
exports.assets = (0, pg_core_1.pgTable)('assets', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id, { onDelete: 'set null' }),
    type: (0, exports.assetTypeEnum)('type').notNull(),
    originalUrl: (0, pg_core_1.varchar)('original_url', { length: 512 }).notNull(),
    processedUrl: (0, pg_core_1.varchar)('processed_url', { length: 512 }),
    thumbUrl: (0, pg_core_1.varchar)('thumb_url', { length: 512 }),
    filename: (0, pg_core_1.varchar)('filename', { length: 255 }).notNull(),
    mimeType: (0, pg_core_1.varchar)('mime_type', { length: 100 }).notNull(),
    width: (0, pg_core_1.integer)('width').notNull(),
    height: (0, pg_core_1.integer)('height').notNull(),
    sizeBytes: (0, pg_core_1.bigint)('size_bytes', { mode: 'number' }).notNull(),
    palette: (0, pg_core_1.jsonb)('palette').$type(), // extracted color palette
    metadata: (0, pg_core_1.jsonb)('metadata').$type(),
    checksumMd5: (0, pg_core_1.varchar)('checksum_md5', { length: 32 }),
    expiresAt: (0, pg_core_1.timestamp)('expires_at'), // for temporary files
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Rate limiting table (for Redis fallback)
exports.rateLimits = (0, pg_core_1.pgTable)('rate_limits', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    identifier: (0, pg_core_1.varchar)('identifier', { length: 255 }).notNull(), // IP or user ID
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(), // 'ai_generation', 'api_calls', etc.
    count: (0, pg_core_1.integer)('count').notNull().default(0),
    windowStart: (0, pg_core_1.timestamp)('window_start').notNull(),
    windowEnd: (0, pg_core_1.timestamp)('window_end').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Analytics table (opt-in, COPPA compliant)
exports.analytics = (0, pg_core_1.pgTable)('analytics', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id, { onDelete: 'set null' }),
    sessionId: (0, pg_core_1.varchar)('session_id', { length: 255 }),
    event: (0, pg_core_1.varchar)('event', { length: 100 }).notNull(),
    properties: (0, pg_core_1.jsonb)('properties').$type(),
    userAgent: (0, pg_core_1.varchar)('user_agent', { length: 512 }),
    ipHash: (0, pg_core_1.varchar)('ip_hash', { length: 64 }), // hashed IP for privacy
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// System logs table
exports.systemLogs = (0, pg_core_1.pgTable)('system_logs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    level: (0, pg_core_1.varchar)('level', { length: 20 }).notNull(),
    message: (0, pg_core_1.text)('message').notNull(),
    metadata: (0, pg_core_1.jsonb)('metadata').$type(),
    service: (0, pg_core_1.varchar)('service', { length: 100 }).notNull(),
    requestId: (0, pg_core_1.uuid)('request_id'),
    userId: (0, pg_core_1.uuid)('user_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Relations
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    projects: many(exports.projects),
    assets: many(exports.assets),
    analytics: many(exports.analytics),
}));
exports.projectsRelations = (0, drizzle_orm_1.relations)(exports.projects, ({ one, many }) => ({
    user: one(exports.users, {
        fields: [exports.projects.userId],
        references: [exports.users.id],
    }),
    frames: many(exports.frames),
    activeFrame: one(exports.frames, {
        fields: [exports.projects.activeFrameId],
        references: [exports.frames.id],
    }),
}));
exports.framesRelations = (0, drizzle_orm_1.relations)(exports.frames, ({ one, many }) => ({
    project: one(exports.projects, {
        fields: [exports.frames.projectId],
        references: [exports.projects.id],
    }),
    layers: many(exports.layers),
}));
exports.layersRelations = (0, drizzle_orm_1.relations)(exports.layers, ({ one }) => ({
    frame: one(exports.frames, {
        fields: [exports.layers.frameId],
        references: [exports.frames.id],
    }),
}));
exports.assetsRelations = (0, drizzle_orm_1.relations)(exports.assets, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.assets.userId],
        references: [exports.users.id],
    }),
}));
exports.analyticsRelations = (0, drizzle_orm_1.relations)(exports.analytics, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.analytics.userId],
        references: [exports.users.id],
    }),
}));
//# sourceMappingURL=schema.js.map