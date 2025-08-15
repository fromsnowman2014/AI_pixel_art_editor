import axios, { AxiosInstance, AxiosResponse } from 'axios'
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectsResponse,
  Frame,
  CreateFrameRequest,
  UpdateFrameRequest,
  AIGenerateRequest,
  AIGenerationResponse,
  AIVariationsRequest,
  GifExportRequest,
  GifExportResponse,
  Asset,
  HealthCheckResponse,
} from '@/lib/types/api'

// API Configuration - Using Railway Backend in Production
const getApiBaseUrl = () => {
  // Use Railway backend URL if configured, otherwise fallback to local API
  const railwayUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // Force Railway backend in production environments
  if (typeof window !== 'undefined') {
    // Client-side: Check if we're in a production environment
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const isVercelDeployment = window.location.hostname.includes('.vercel.app');
    
    if (isProduction && (railwayUrl || isVercelDeployment)) {
      // Production: Always use Railway backend
      const backendUrl = railwayUrl || 'https://aipixelarteditor-production.up.railway.app';
      console.log(`🚀 Production API Client using Railway backend: ${backendUrl}`);
      return backendUrl + '/api';
    }
    
    // Development: use relative URLs
    console.log('🔧 Development API Client using local API');
    return '/api';
  } else {
    // Server-side: use configured URL or fallback
    const backendUrl = railwayUrl || 'https://aipixelarteditor-production.up.railway.app';
    return backendUrl + '/api';
  }
}

const API_BASE_URL = getApiBaseUrl()

class ApiClient {
  private client: AxiosInstance

  constructor() {
    console.log(`🔧 API Client initialized with baseURL: ${API_BASE_URL}`);
    
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 seconds for AI operations
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor for auth
    this.client.interceptors.request.use((config) => {
      // Add auth token if available; guard against non-browser environments
      const token = typeof window !== 'undefined'
        ? window.localStorage.getItem('auth_token')
        : null
      if (token) {
        // Ensure headers object exists before assignment
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        const method = error.config?.method?.toUpperCase() || 'REQUEST';
        const url = error.config?.url || 'unknown';
        
        console.error(`❌ API Error: ${method} ${url}`, error);

        // Handle network and CORS errors
        if (error.code === 'ERR_NETWORK') {
          // Check if it's a CORS error by examining the error message
          const errorMsg = error.message?.toLowerCase() || '';
          if (errorMsg.includes('cors') || errorMsg.includes('access-control')) {
            console.error('🚫 CORS Error - cross-origin request blocked:', error);
            console.error('🔧 Debug info:', {
              currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
              targetURL: API_BASE_URL,
              errorMessage: error.message
            });
            throw new ApiError('CORS_ERROR', 'Cross-origin request blocked. Check CORS configuration.', 0);
          } else {
            console.error('🚫 Network Error - check if development server is running');
            console.error('🔧 Debug info:', {
              baseURL: API_BASE_URL,
              requestURL: error.config?.url,
              method: error.config?.method,
              errorCode: error.code
            });
            throw new ApiError('NETWORK_ERROR', 'Unable to connect to API. Check if the server is running.', 0);
          }
        }
        
        if (error.response?.data) {
          throw new ApiError(
            error.response.data.error || 'API_ERROR',
            error.response.data.message || error.message,
            error.response.status
          )
        }
        
        throw new ApiError('NETWORK_ERROR', 'Failed to connect to server')
      }
    )
  }

  // Health Check
  async healthCheck(): Promise<HealthCheckResponse> {
    console.log('🏥 Health check starting:', {
      baseURL: API_BASE_URL,
      fullURL: `${API_BASE_URL}/health`,
      origin: typeof window !== 'undefined' ? window.location.origin : 'server-side'
    });
    
    try {
      const response = await this.client.get<HealthCheckResponse>('/health')
      console.log('✅ Health check successful:', response.data);
      return response.data
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }

  // Projects API
  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await this.client.post<Project>('/api/projects', data)
    return response.data
  }

  async getProjects(params?: {
    limit?: number
    offset?: number
    template?: boolean
  }): Promise<ProjectsResponse> {
    const response = await this.client.get<ProjectsResponse>('/api/projects', { params })
    return response.data
  }

  async getProject(id: string): Promise<Project> {
    const response = await this.client.get<Project>(`/api/projects/${id}`)
    return response.data
  }

  async updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
    const response = await this.client.patch<Project>(`/api/projects/${id}`, data)
    return response.data
  }

  async deleteProject(id: string): Promise<void> {
    await this.client.delete(`/api/projects/${id}`)
  }

  async duplicateProject(id: string, name?: string): Promise<Project> {
    const response = await this.client.post<Project>(`/api/projects/${id}/duplicate`, { name })
    return response.data
  }

  // Frames API
  async createFrame(data: CreateFrameRequest): Promise<Frame> {
    const response = await this.client.post<Frame>('/api/frames', data)
    return response.data
  }

  async getFrame(id: string): Promise<Frame> {
    const response = await this.client.get<Frame>(`/api/frames/${id}`)
    return response.data
  }

  async getProjectFrames(projectId: string): Promise<Frame[]> {
    const response = await this.client.get<Frame[]>(`/api/frames/project/${projectId}`)
    return response.data
  }

  async updateFrame(id: string, data: UpdateFrameRequest): Promise<Frame> {
    const response = await this.client.patch<Frame>(`/api/frames/${id}`, data)
    return response.data
  }

  async deleteFrame(id: string): Promise<void> {
    await this.client.delete(`/api/frames/${id}`)
  }

  async duplicateFrame(id: string, index?: number): Promise<Frame> {
    const response = await this.client.post<Frame>(`/api/frames/${id}/duplicate`, { index })
    return response.data
  }

  async reorderFrames(projectId: string, frameIds: string[]): Promise<Frame[]> {
    const response = await this.client.put<Frame[]>('/api/frames/reorder', {
      projectId,
      frameIds,
    })
    return response.data
  }

  // AI Generation API
  async generateAI(data: AIGenerateRequest): Promise<AIGenerationResponse> {
    console.log('🔧 API Client: Sending AI generation request:', data);
    
    const response = await this.client.post<{success: boolean, data: AIGenerationResponse}>('/ai/generate', data, {
      timeout: 600000, // 10 minutes for AI generation to match backend processing time
    })
    
    console.log('📥 API Client: Raw response received:', {
      status: response.status,
      success: response.data?.success,
      dataKeys: response.data?.data ? Object.keys(response.data.data) : 'no data',
      responseStructure: response.data
    });
    
    // Backend returns {success: true, data: AIGenerationResponse}
    // Extract the actual data from the wrapper
    if (response.data.success && response.data.data) {
      console.log('✅ API Client: Extracted data:', response.data.data);
      return response.data.data
    } else {
      console.error('❌ API Client: Invalid response format:', response.data);
      throw new Error('AI generation failed - invalid response format')
    }
  }

  async generateVariations(data: AIVariationsRequest): Promise<AIGenerationResponse[]> {
    const response = await this.client.post<AIGenerationResponse[]>('/api/ai/variations', data, {
      timeout: 60000, // 60 seconds for variations
    })
    return response.data
  }

  // GIF Export API
  async exportGif(data: GifExportRequest): Promise<GifExportResponse> {
    const response = await this.client.post<GifExportResponse>('/api/export/gif', data, {
      timeout: 90000, // 90 seconds for GIF export
    })
    return response.data
  }

  // File Upload API
  async uploadFile(file: File): Promise<Asset> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await this.client.post<Asset>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for upload
    })
    return response.data
  }
}

// Custom ApiError class
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Singleton instance
export const apiClient = new ApiClient()

// Helper functions for common operations
export const api = {
  // Projects
  projects: {
    create: (data: CreateProjectRequest) => apiClient.createProject(data),
    list: (params?: { limit?: number; offset?: number; template?: boolean }) => 
      apiClient.getProjects(params),
    get: (id: string) => apiClient.getProject(id),
    update: (id: string, data: UpdateProjectRequest) => apiClient.updateProject(id, data),
    delete: (id: string) => apiClient.deleteProject(id),
    duplicate: (id: string, name?: string) => apiClient.duplicateProject(id, name),
  },

  // Frames
  frames: {
    create: (data: CreateFrameRequest) => apiClient.createFrame(data),
    get: (id: string) => apiClient.getFrame(id),
    listByProject: (projectId: string) => apiClient.getProjectFrames(projectId),
    update: (id: string, data: UpdateFrameRequest) => apiClient.updateFrame(id, data),
    delete: (id: string) => apiClient.deleteFrame(id),
    duplicate: (id: string, index?: number) => apiClient.duplicateFrame(id, index),
    reorder: (projectId: string, frameIds: string[]) => 
      apiClient.reorderFrames(projectId, frameIds),
  },

  // AI
  ai: {
    generate: (data: AIGenerateRequest) => apiClient.generateAI(data),
    variations: (data: AIVariationsRequest) => apiClient.generateVariations(data),
  },

  // Export
  export: {
    gif: (data: GifExportRequest) => apiClient.exportGif(data),
  },

  // Upload
  upload: {
    file: (file: File) => apiClient.uploadFile(file),
  },

  // System
  health: () => apiClient.healthCheck(),
}