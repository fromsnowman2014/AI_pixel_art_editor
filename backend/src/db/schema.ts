import { relations } from 'drizzle-orm';
import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  integer, 
  boolean, 
  timestamp, 
  jsonb, 
  pgEnum,
  real,
  bigint
} from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['parent', 'teacher']);
export const assetTypeEnum = pgEnum('asset_type', ['upload', 'ai', 'generated']);

// Users table (NextAuth.js compatible schema - minimal required fields only)
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
});

// Extended user profile table for additional app-specific fields  
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  role: userRoleEnum('role').default('parent'),
  locale: varchar('locale', { length: 10 }).default('en'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// OAuth accounts table (for NextAuth.js integration)
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  idToken: text('id_token'),
  sessionState: varchar('session_state', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sessions table (for NextAuth.js integration)
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expires: timestamp('expires').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Verification tokens table (for NextAuth.js integration)
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Saved projects table (for cloud save functionality)
export const savedProjects = pgTable('saved_projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  projectData: jsonb('project_data').notNull(), // Full project state
  thumbnailData: text('thumbnail_data'), // Base64 thumbnail
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }), // null for anonymous users
  name: varchar('name', { length: 100 }).notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  colorLimit: integer('color_limit').notNull(),
  palette: jsonb('palette').$type<string[]>().notNull(), // array of hex colors
  activeFrameId: uuid('active_frame_id'),
  isTemplate: boolean('is_template').notNull().default(false),
  templateCategory: varchar('template_category', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Frames table (for animation/GIF support)
export const frames = pgTable('frames', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  index: integer('index').notNull(),
  delayMs: integer('delay_ms').notNull().default(500),
  included: boolean('included').notNull().default(true),
  flattenedPngUrl: varchar('flattened_png_url', { length: 512 }), // stored image URL
  rawRleData: text('raw_rle_data'), // compressed pixel data (RLE encoded)
  checksumMd5: varchar('checksum_md5', { length: 32 }), // for integrity checking
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Layers table (optional feature for advanced mode)
export const layers = pgTable('layers', {
  id: uuid('id').defaultRandom().primaryKey(),
  frameId: uuid('frame_id').references(() => frames.id, { onDelete: 'cascade' }).notNull(),
  index: integer('index').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  visible: boolean('visible').notNull().default(true),
  opacity: real('opacity').notNull().default(1.0),
  blendMode: varchar('blend_mode', { length: 20 }).notNull().default('normal'),
  layerData: text('layer_data'), // compressed layer pixel data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Assets table (for storing generated images, uploads, etc.)
export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: assetTypeEnum('type').notNull(),
  originalUrl: varchar('original_url', { length: 512 }).notNull(),
  processedUrl: varchar('processed_url', { length: 512 }),
  thumbUrl: varchar('thumb_url', { length: 512 }),
  filename: varchar('filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  palette: jsonb('palette').$type<string[]>(), // extracted color palette
  metadata: jsonb('metadata').$type<{
    prompt?: string;
    seed?: number;
    colorLimit?: number;
    quantizationMethod?: string;
    processingTimeMs?: number;
    aiModel?: string;
  }>(),
  checksumMd5: varchar('checksum_md5', { length: 32 }),
  expiresAt: timestamp('expires_at'), // for temporary files
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Rate limiting table (for Redis fallback)
export const rateLimits = pgTable('rate_limits', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(), // IP or user ID
  type: varchar('type', { length: 50 }).notNull(), // 'ai_generation', 'api_calls', etc.
  count: integer('count').notNull().default(0),
  windowStart: timestamp('window_start').notNull(),
  windowEnd: timestamp('window_end').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Analytics table (opt-in, COPPA compliant)
export const analytics = pgTable('analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 255 }),
  event: varchar('event', { length: 100 }).notNull(),
  properties: jsonb('properties').$type<Record<string, any>>(),
  userAgent: varchar('user_agent', { length: 512 }),
  ipHash: varchar('ip_hash', { length: 64 }), // hashed IP for privacy
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// System logs table
export const systemLogs = pgTable('system_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  level: varchar('level', { length: 20 }).notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  service: varchar('service', { length: 100 }).notNull(),
  requestId: uuid('request_id'),
  userId: text('user_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  projects: many(projects),
  assets: many(assets),
  analytics: many(analytics),
  accounts: many(accounts),
  sessions: many(sessions),
  savedProjects: many(savedProjects),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const savedProjectsRelations = relations(savedProjects, ({ one }) => ({
  user: one(users, {
    fields: [savedProjects.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  frames: many(frames),
  activeFrame: one(frames, {
    fields: [projects.activeFrameId],
    references: [frames.id],
  }),
}));

export const framesRelations = relations(frames, ({ one, many }) => ({
  project: one(projects, {
    fields: [frames.projectId],
    references: [projects.id],
  }),
  layers: many(layers),
}));

export const layersRelations = relations(layers, ({ one }) => ({
  frame: one(frames, {
    fields: [layers.frameId],
    references: [frames.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  user: one(users, {
    fields: [assets.userId],
    references: [users.id],
  }),
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
  user: one(users, {
    fields: [analytics.userId],
    references: [users.id],
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type SavedProject = typeof savedProjects.$inferSelect;
export type NewSavedProject = typeof savedProjects.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Frame = typeof frames.$inferSelect;
export type NewFrame = typeof frames.$inferInsert;
export type Layer = typeof layers.$inferSelect;
export type NewLayer = typeof layers.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;
export type Analytics = typeof analytics.$inferSelect;
export type NewAnalytics = typeof analytics.$inferInsert;
export type SystemLog = typeof systemLogs.$inferSelect;
export type NewSystemLog = typeof systemLogs.$inferInsert;