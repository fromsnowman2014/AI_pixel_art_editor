import { FastifyPluginCallback } from 'fastify';
import { 
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  ProjectResponseSchema,
  CreateProjectRequest,
  UpdateProjectRequest
} from '../types/api';
import '../types/fastify';
import { db } from '../db/connection';
import { projects, frames, layers } from '../db/schema';
import { eq, and, desc, count, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';

const logger = createLogger('project-routes');

export const projectRoutes: FastifyPluginCallback = (fastify, options, done) => {

  /**
   * POST /api/projects - Create a new project
   */
  fastify.post('/', {
    schema: {
      body: CreateProjectRequestSchema,
      response: {
        201: ProjectResponseSchema,
      },
    },
  }, async (request, reply) => {
    const userId = request.user?.id;
    const body = request.body as CreateProjectRequest;
    
    logger.info('Creating new project', {
      userId,
      name: body.name,
      dimensions: `${body.width}x${body.height}`,
      colorLimit: body.colorLimit,
    });

    try {
      // Create project
      const [newProject] = await db.insert(projects).values({
        userId: userId === 'anonymous' ? null : userId,
        name: body.name,
        width: body.width,
        height: body.height,
        colorLimit: body.colorLimit,
        palette: body.palette,
        mode: body.mode,
      }).returning();

      // Create initial frame
      const [initialFrame] = await db.insert(frames).values({
        projectId: newProject.id,
        index: 0,
        delayMs: 500,
        included: true,
      }).returning();

      // Update project with active frame ID
      const [updatedProject] = await db
        .update(projects)
        .set({ 
          activeFrameId: initialFrame.id,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, newProject.id))
        .returning();

      logger.info('Project created successfully', {
        projectId: updatedProject.id,
        userId,
        frameId: initialFrame.id,
      });

      return reply.code(201).send({
        id: updatedProject.id,
        userId: updatedProject.userId,
        name: updatedProject.name,
        width: updatedProject.width,
        height: updatedProject.height,
        colorLimit: updatedProject.colorLimit,
        palette: updatedProject.palette as string[],
        mode: updatedProject.mode,
        frames: [initialFrame.id],
        activeFrameId: updatedProject.activeFrameId,
        createdAt: updatedProject.createdAt.toISOString(),
        updatedAt: updatedProject.updatedAt.toISOString(),
      });

    } catch (error) {
      logger.error('Failed to create project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        name: body.name,
      });

      return reply.code(500).send({
        error: 'PROJECT_CREATION_FAILED',
        message: 'Failed to create project',
      });
    }
  });

  /**
   * GET /api/projects - List user's projects
   */
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'number', minimum: 0, default: 0 },
          template: { type: 'boolean' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            projects: {
              type: 'array',
              items: ProjectResponseSchema,
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user?.id;
    const query = request.query as {
      limit?: number;
      offset?: number;
      template?: boolean;
    };

    const limit = query.limit || 20;
    const offset = query.offset || 0;

    try {
      // Build where conditions
      let whereConditions = [];
      
      if (userId === 'anonymous') {
        // For anonymous users, show templates only
        whereConditions.push(eq(projects.isTemplate, true));
      } else {
        if (query.template === true) {
          // Show only templates
          whereConditions.push(eq(projects.isTemplate, true));
        } else if (query.template === false) {
          // Show only user's projects (not templates)
          if (userId && userId !== 'anonymous') {
            whereConditions.push(
              and(
                eq(projects.userId, userId),
                eq(projects.isTemplate, false)
              )
            );
          } else {
            // Anonymous users have no personal projects
            whereConditions.push(eq(projects.isTemplate, true)); // This will return empty
          }
        } else {
          // Show user's projects and templates
          if (userId && userId !== 'anonymous') {
            whereConditions.push(
              and(
                eq(projects.userId, userId),
                eq(projects.isTemplate, false)
              )
            );
          } else {
            // Anonymous users can only see templates
            whereConditions.push(eq(projects.isTemplate, true));
          }
        }
      }

      // Get projects with frame count
      const userProjects = await db
        .select({
          id: projects.id,
          userId: projects.userId,
          name: projects.name,
          width: projects.width,
          height: projects.height,
          colorLimit: projects.colorLimit,
          palette: projects.palette,
          mode: projects.mode,
          activeFrameId: projects.activeFrameId,
          isTemplate: projects.isTemplate,
          templateCategory: projects.templateCategory,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(projects.updatedAt))
        .limit(limit)
        .offset(offset);

      // Get frame IDs for each project
      const projectsWithFrames = await Promise.all(
        userProjects.map(async (project) => {
          const projectFrames = await db
            .select({ id: frames.id })
            .from(frames)
            .where(eq(frames.projectId, project.id))
            .orderBy(frames.index);

          return {
            id: project.id,
            userId: project.userId,
            name: project.name,
            width: project.width,
            height: project.height,
            colorLimit: project.colorLimit,
            palette: project.palette as string[],
            mode: project.mode,
            frames: projectFrames.map(f => f.id),
            activeFrameId: project.activeFrameId,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
          };
        })
      );

      // Get total count
      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(projects)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      logger.info('Projects retrieved', {
        userId,
        count: projectsWithFrames.length,
        total: count,
        template: query.template,
      });

      return reply.send({
        projects: projectsWithFrames,
        total: totalCount || 0,
        limit,
        offset,
      });

    } catch (error) {
      logger.error('Failed to get projects', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });

      return reply.code(500).send({
        error: 'PROJECTS_FETCH_FAILED',
        message: 'Failed to retrieve projects',
      });
    }
  });

  /**
   * GET /api/projects/:id - Get a specific project
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
        200: ProjectResponseSchema,
      },
    },
  }, async (request, reply) => {
    const userId = request.user?.id;
    const { id } = request.params as { id: string };

    try {
      // Get project
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

      if (!project) {
        return reply.code(404).send({
          error: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Check access permissions
      if (!project.isTemplate && project.userId !== userId && userId !== 'anonymous') {
        return reply.code(403).send({
          error: 'ACCESS_DENIED',
          message: 'You do not have access to this project',
        });
      }

      // Get project frames
      const projectFrames = await db
        .select({ id: frames.id })
        .from(frames)
        .where(eq(frames.projectId, project.id))
        .orderBy(frames.index);

      logger.info('Project retrieved', {
        projectId: id,
        userId,
        frameCount: projectFrames.length,
      });

      return reply.send({
        id: project.id,
        userId: project.userId,
        name: project.name,
        width: project.width,
        height: project.height,
        colorLimit: project.colorLimit,
        palette: project.palette as string[],
        mode: project.mode,
        frames: projectFrames.map(f => f.id),
        activeFrameId: project.activeFrameId,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      });

    } catch (error) {
      logger.error('Failed to get project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId: id,
        userId,
      });

      return reply.code(500).send({
        error: 'PROJECT_FETCH_FAILED',
        message: 'Failed to retrieve project',
      });
    }
  });

  /**
   * PATCH /api/projects/:id - Update a project
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
      body: UpdateProjectRequestSchema,
      response: {
        200: ProjectResponseSchema,
      },
    },
  }, async (request, reply) => {
    const userId = request.user?.id;
    const { id } = request.params as { id: string };
    const body = request.body as UpdateProjectRequest;

    try {
      // Check if project exists and user has access
      const [existingProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

      if (!existingProject) {
        return reply.code(404).send({
          error: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }

      if (existingProject.userId !== userId && userId !== 'anonymous') {
        return reply.code(403).send({
          error: 'ACCESS_DENIED',
          message: 'You do not have permission to update this project',
        });
      }

      // Update project
      const updateData: Partial<typeof existingProject> = {
        updatedAt: new Date(),
      };

      if (body.name) updateData.name = body.name;
      if (body.palette) updateData.palette = body.palette;
      if (body.mode) updateData.mode = body.mode;
      if (body.activeFrameId) updateData.activeFrameId = body.activeFrameId;

      const [updatedProject] = await db
        .update(projects)
        .set(updateData)
        .where(eq(projects.id, id))
        .returning();

      // Get project frames
      const projectFrames = await db
        .select({ id: frames.id })
        .from(frames)
        .where(eq(frames.projectId, updatedProject.id))
        .orderBy(frames.index);

      logger.info('Project updated', {
        projectId: id,
        userId,
        changes: Object.keys(body),
      });

      return reply.send({
        id: updatedProject.id,
        userId: updatedProject.userId,
        name: updatedProject.name,
        width: updatedProject.width,
        height: updatedProject.height,
        colorLimit: updatedProject.colorLimit,
        palette: updatedProject.palette as string[],
        mode: updatedProject.mode,
        frames: projectFrames.map(f => f.id),
        activeFrameId: updatedProject.activeFrameId,
        createdAt: updatedProject.createdAt.toISOString(),
        updatedAt: updatedProject.updatedAt.toISOString(),
      });

    } catch (error) {
      logger.error('Failed to update project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId: id,
        userId,
      });

      return reply.code(500).send({
        error: 'PROJECT_UPDATE_FAILED',
        message: 'Failed to update project',
      });
    }
  });

  /**
   * DELETE /api/projects/:id - Delete a project
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
  }, async (request, reply) => {
    const userId = request.user?.id;
    const { id } = request.params as { id: string };

    try {
      // Check if project exists and user has access
      const [existingProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

      if (!existingProject) {
        return reply.code(404).send({
          error: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }

      if (existingProject.userId !== userId && userId !== 'anonymous') {
        return reply.code(403).send({
          error: 'ACCESS_DENIED',
          message: 'You do not have permission to delete this project',
        });
      }

      // Delete project (frames will be deleted via cascade)
      await db.delete(projects).where(eq(projects.id, id));

      logger.info('Project deleted', {
        projectId: id,
        userId,
        name: existingProject.name,
      });

      return reply.code(204).send();

    } catch (error) {
      logger.error('Failed to delete project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId: id,
        userId,
      });

      return reply.code(500).send({
        error: 'PROJECT_DELETE_FAILED',
        message: 'Failed to delete project',
      });
    }
  });

  /**
   * POST /api/projects/:id/duplicate - Duplicate a project
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
          name: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
      response: {
        201: ProjectResponseSchema,
      },
    },
  }, async (request, reply) => {
    const userId = request.user?.id;
    const { id } = request.params as { id: string };
    const { name } = request.body as { name?: string };

    try {
      // Get original project
      const [originalProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

      if (!originalProject) {
        return reply.code(404).send({
          error: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Check access permissions (allow templates to be duplicated by anyone)
      if (!originalProject.isTemplate && originalProject.userId !== userId && userId !== 'anonymous') {
        return reply.code(403).send({
          error: 'ACCESS_DENIED',
          message: 'You do not have access to this project',
        });
      }

      // Create duplicate project
      const duplicateName = name || `${originalProject.name} (Copy)`;
      
      const [duplicateProject] = await db.insert(projects).values({
        userId: userId === 'anonymous' ? null : userId,
        name: duplicateName,
        width: originalProject.width,
        height: originalProject.height,
        colorLimit: originalProject.colorLimit,
        palette: originalProject.palette,
        mode: originalProject.mode,
        isTemplate: false, // Duplicates are never templates
      }).returning();

      // Get original frames
      const originalFrames = await db
        .select()
        .from(frames)
        .where(eq(frames.projectId, originalProject.id))
        .orderBy(frames.index);

      // Duplicate frames
      let activeFrameId: string | null = null;
      const duplicatedFrameIds: string[] = [];

      for (const originalFrame of originalFrames) {
        const [duplicateFrame] = await db.insert(frames).values({
          projectId: duplicateProject.id,
          index: originalFrame.index,
          delayMs: originalFrame.delayMs,
          included: originalFrame.included,
          rawRleData: originalFrame.rawRleData,
        }).returning();

        // Copy layers for this frame
        const originalLayers = await db
          .select()
          .from(layers)
          .where(eq(layers.frameId, originalFrame.id))
          .orderBy(layers.index);

        for (const layer of originalLayers) {
          await db.insert(layers).values({
            frameId: duplicateFrame.id,
            index: layer.index,
            name: layer.name,
            visible: layer.visible,
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            layerData: layer.layerData,
          });
        }

        duplicatedFrameIds.push(duplicateFrame.id);

        // Set active frame to first frame
        if (originalFrame.id === originalProject.activeFrameId) {
          activeFrameId = duplicateFrame.id;
        }
      }

      // Update project with active frame ID
      if (activeFrameId) {
        await db
          .update(projects)
          .set({ activeFrameId })
          .where(eq(projects.id, duplicateProject.id));
      }

      logger.info('Project duplicated', {
        originalProjectId: id,
        duplicateProjectId: duplicateProject.id,
        userId,
        frameCount: duplicatedFrameIds.length,
      });

      return reply.code(201).send({
        id: duplicateProject.id,
        userId: duplicateProject.userId,
        name: duplicateProject.name,
        width: duplicateProject.width,
        height: duplicateProject.height,
        colorLimit: duplicateProject.colorLimit,
        palette: duplicateProject.palette as string[],
        mode: duplicateProject.mode,
        frames: duplicatedFrameIds,
        activeFrameId: activeFrameId,
        createdAt: duplicateProject.createdAt.toISOString(),
        updatedAt: duplicateProject.updatedAt.toISOString(),
      });

    } catch (error) {
      logger.error('Failed to duplicate project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        originalProjectId: id,
        userId,
      });

      return reply.code(500).send({
        error: 'PROJECT_DUPLICATE_FAILED',
        message: 'Failed to duplicate project',
      });
    }
  });

  done();
};