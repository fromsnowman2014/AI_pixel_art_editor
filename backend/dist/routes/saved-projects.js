"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
const schema_js_1 = require("../db/schema.js");
const connection_js_1 = require("../db/connection.js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const lz_string_1 = __importDefault(require("lz-string"));
const SaveProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(50),
    projectData: zod_1.z.object({
        frames: zod_1.z.array(zod_1.z.any()),
        canvasSettings: zod_1.z.object({
            width: zod_1.z.number(),
            height: zod_1.z.number(),
            zoom: zod_1.z.number(),
            colorLimit: zod_1.z.number(),
            palette: zod_1.z.array(zod_1.z.string()),
        }),
        activeFrameId: zod_1.z.string(),
    }),
    thumbnailData: zod_1.z.string().optional(),
});
const LoadProjectParamsSchema = zod_1.z.object({
    projectId: zod_1.z.string().uuid(),
});
const savedProjectsRoutes = async function (fastify) {
    // Authentication middleware
    async function authenticate(request, reply) {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                reply.code(401).send({ error: 'No authentication token provided' });
                return null;
            }
            const token = authHeader.substring(7);
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const user = await connection_js_1.db.select().from(schema_js_1.users).where((0, drizzle_orm_1.eq)(schema_js_1.users.id, decoded.userId)).limit(1);
            if (user.length === 0) {
                reply.code(401).send({ error: 'Invalid user' });
                return null;
            }
            return user[0];
        }
        catch (error) {
            reply.code(401).send({ error: 'Invalid authentication token' });
            return null;
        }
    }
    // Save project endpoint
    fastify.post('/save', async (request, reply) => {
        const user = await authenticate(request, reply);
        if (!user)
            return;
        try {
            const data = SaveProjectSchema.parse(request.body);
            const userId = user.id;
            // Check project limit (max 3 projects per user)
            const result = await connection_js_1.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_js_1.savedProjects)
                .where((0, drizzle_orm_1.eq)(schema_js_1.savedProjects.userId, userId));
            const projectCount = result[0]?.count || 0;
            if (projectCount >= 3) {
                return reply.code(400).send({
                    error: 'Project limit reached. You can save up to 3 projects. Please delete a project first.'
                });
            }
            // Compress project data
            const compressedData = lz_string_1.default.compress(JSON.stringify(data.projectData));
            if (!compressedData) {
                return reply.code(400).send({ error: 'Failed to compress project data' });
            }
            // Save to database
            const [savedProject] = await connection_js_1.db.insert(schema_js_1.savedProjects).values({
                userId,
                name: data.name,
                projectData: { compressed: compressedData },
                thumbnailData: data.thumbnailData,
            }).returning();
            reply.send({
                success: true,
                projectId: savedProject.id,
                message: `Project "${data.name}" saved successfully!`
            });
        }
        catch (error) {
            fastify.log.error('Error saving project:', error);
            reply.code(500).send({ error: 'Failed to save project' });
        }
    });
    // List user's saved projects
    fastify.get('/list', async (request, reply) => {
        const user = await authenticate(request, reply);
        if (!user)
            return;
        try {
            const userId = user.id;
            const projects = await connection_js_1.db
                .select({
                id: schema_js_1.savedProjects.id,
                name: schema_js_1.savedProjects.name,
                thumbnailData: schema_js_1.savedProjects.thumbnailData,
                createdAt: schema_js_1.savedProjects.createdAt,
                updatedAt: schema_js_1.savedProjects.updatedAt,
            })
                .from(schema_js_1.savedProjects)
                .where((0, drizzle_orm_1.eq)(schema_js_1.savedProjects.userId, userId))
                .orderBy((0, drizzle_orm_1.desc)(schema_js_1.savedProjects.updatedAt));
            reply.send({ projects });
        }
        catch (error) {
            fastify.log.error('Error fetching projects:', error);
            reply.code(500).send({ error: 'Failed to fetch projects' });
        }
    });
    // Load specific project
    fastify.get('/:projectId', async (request, reply) => {
        const user = await authenticate(request, reply);
        if (!user)
            return;
        try {
            const { projectId } = LoadProjectParamsSchema.parse(request.params);
            const userId = user.id;
            const [project] = await connection_js_1.db
                .select()
                .from(schema_js_1.savedProjects)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.savedProjects.id, projectId), (0, drizzle_orm_1.eq)(schema_js_1.savedProjects.userId, userId)))
                .limit(1);
            if (!project) {
                return reply.code(404).send({ error: 'Project not found' });
            }
            // Decompress project data
            let projectData;
            try {
                const compressedData = project.projectData.compressed;
                const decompressed = lz_string_1.default.decompress(compressedData);
                projectData = JSON.parse(decompressed);
            }
            catch (error) {
                fastify.log.error('Error decompressing project data:', error);
                return reply.code(500).send({ error: 'Failed to load project data' });
            }
            reply.send({
                id: project.id,
                name: project.name,
                projectData,
                thumbnailData: project.thumbnailData,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
            });
        }
        catch (error) {
            fastify.log.error('Error loading project:', error);
            reply.code(500).send({ error: 'Failed to load project' });
        }
    });
    // Delete project
    fastify.delete('/:projectId', async (request, reply) => {
        const user = await authenticate(request, reply);
        if (!user)
            return;
        try {
            const { projectId } = LoadProjectParamsSchema.parse(request.params);
            const userId = user.id;
            const result = await connection_js_1.db
                .delete(schema_js_1.savedProjects)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.savedProjects.id, projectId), (0, drizzle_orm_1.eq)(schema_js_1.savedProjects.userId, userId)))
                .returning();
            if (result.length === 0) {
                return reply.code(404).send({ error: 'Project not found' });
            }
            reply.send({
                success: true,
                message: `Project "${result[0].name}" deleted successfully`
            });
        }
        catch (error) {
            fastify.log.error('Error deleting project:', error);
            reply.code(500).send({ error: 'Failed to delete project' });
        }
    });
};
exports.default = savedProjectsRoutes;
//# sourceMappingURL=saved-projects.js.map