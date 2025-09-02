import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { eq, and, desc, count } from 'drizzle-orm'
import { savedProjects, users, User } from '../db/schema.js'
import { db } from '../db/connection.js'
import jwt from 'jsonwebtoken'
import LZString from 'lz-string'

interface AuthenticatedRequest extends FastifyRequest {
  user: User
}

const SaveProjectSchema = z.object({
  name: z.string().min(1).max(50),
  projectData: z.object({
    frames: z.array(z.any()),
    canvasSettings: z.object({
      width: z.number(),
      height: z.number(),
      zoom: z.number(),
      colorLimit: z.number(),
      palette: z.array(z.string()),
    }),
    activeFrameId: z.string(),
  }),
  thumbnailData: z.string().optional(),
})

const LoadProjectParamsSchema = z.object({
  projectId: z.string().uuid(),
})

const savedProjectsRoutes: FastifyPluginAsync = async function (fastify) {
  // Authentication middleware
  async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<User | null> {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'No authentication token provided' })
        return null
      }

      const token = authHeader.substring(7)
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      const user = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1)
      if (user.length === 0) {
        reply.code(401).send({ error: 'Invalid user' })
        return null
      }

      return user[0]
    } catch (error) {
      reply.code(401).send({ error: 'Invalid authentication token' })
      return null
    }
  }

  // Save project endpoint
  fastify.post('/save', async (request, reply) => {
    const user = await authenticate(request, reply)
    if (!user) return

    try {
      const data = SaveProjectSchema.parse(request.body)
      const userId = user.id

      // Check project limit (max 3 projects per user)
      const result = await db
        .select({ count: count() })
        .from(savedProjects)
        .where(eq(savedProjects.userId, userId))
      
      const projectCount = result[0]?.count || 0

      if (projectCount >= 3) {
        return reply.code(400).send({ 
          error: 'Project limit reached. You can save up to 3 projects. Please delete a project first.' 
        })
      }

      // Compress project data
      const compressedData = LZString.compress(JSON.stringify(data.projectData))
      
      if (!compressedData) {
        return reply.code(400).send({ error: 'Failed to compress project data' })
      }

      // Save to database
      const [savedProject] = await db.insert(savedProjects).values({
        userId,
        name: data.name,
        projectData: { compressed: compressedData },
        thumbnailData: data.thumbnailData,
      }).returning()

      reply.send({ 
        success: true, 
        projectId: savedProject.id,
        message: `Project "${data.name}" saved successfully!`
      })
    } catch (error) {
      fastify.log.error('Error saving project:', error)
      reply.code(500).send({ error: 'Failed to save project' })
    }
  })

  // List user's saved projects
  fastify.get('/list', async (request, reply) => {
    const user = await authenticate(request, reply)
    if (!user) return

    try {
      const userId = user.id

      const projects = await db
        .select({
          id: savedProjects.id,
          name: savedProjects.name,
          thumbnailData: savedProjects.thumbnailData,
          createdAt: savedProjects.createdAt,
          updatedAt: savedProjects.updatedAt,
        })
        .from(savedProjects)
        .where(eq(savedProjects.userId, userId))
        .orderBy(desc(savedProjects.updatedAt))

      reply.send({ projects })
    } catch (error) {
      fastify.log.error('Error fetching projects:', error)
      reply.code(500).send({ error: 'Failed to fetch projects' })
    }
  })

  // Load specific project
  fastify.get('/:projectId', async (request, reply) => {
    const user = await authenticate(request, reply)
    if (!user) return

    try {
      const { projectId } = LoadProjectParamsSchema.parse(request.params)
      const userId = user.id

      const [project] = await db
        .select()
        .from(savedProjects)
        .where(and(
          eq(savedProjects.id, projectId),
          eq(savedProjects.userId, userId)
        ))
        .limit(1)

      if (!project) {
        return reply.code(404).send({ error: 'Project not found' })
      }

      // Decompress project data
      let projectData
      try {
        const compressedData = (project.projectData as any).compressed
        const decompressed = LZString.decompress(compressedData)
        projectData = JSON.parse(decompressed!)
      } catch (error) {
        fastify.log.error('Error decompressing project data:', error)
        return reply.code(500).send({ error: 'Failed to load project data' })
      }

      reply.send({
        id: project.id,
        name: project.name,
        projectData,
        thumbnailData: project.thumbnailData,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })
    } catch (error) {
      fastify.log.error('Error loading project:', error)
      reply.code(500).send({ error: 'Failed to load project' })
    }
  })

  // Delete project
  fastify.delete('/:projectId', async (request, reply) => {
    const user = await authenticate(request, reply)
    if (!user) return

    try {
      const { projectId } = LoadProjectParamsSchema.parse(request.params)
      const userId = user.id

      const result = await db
        .delete(savedProjects)
        .where(and(
          eq(savedProjects.id, projectId),
          eq(savedProjects.userId, userId)
        ))
        .returning()

      if (result.length === 0) {
        return reply.code(404).send({ error: 'Project not found' })
      }

      reply.send({ 
        success: true, 
        message: `Project "${result[0].name}" deleted successfully` 
      })
    } catch (error) {
      fastify.log.error('Error deleting project:', error)
      reply.code(500).send({ error: 'Failed to delete project' })
    }
  })
}

export default savedProjectsRoutes