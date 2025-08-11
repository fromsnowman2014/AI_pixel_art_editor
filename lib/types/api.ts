// API Types matching backend schema
export type ProjectMode = 'beginner' | 'advanced'
export type AssetType = 'upload' | 'ai' | 'generated'

// Project Types
export interface Project {
  id: string
  userId: string | null
  name: string
  width: number
  height: number
  colorLimit: number
  palette: string[]
  mode: ProjectMode
  frames: string[]
  activeFrameId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRequest {
  name: string
  width: number
  height: number
  colorLimit: number
  palette: string[]
  mode?: ProjectMode
}

export interface UpdateProjectRequest {
  name?: string
  palette?: string[]
  mode?: ProjectMode
  activeFrameId?: string
}

// Frame Types
export interface Frame {
  id: string
  projectId: string
  index: number
  delayMs: number
  included: boolean
  layers: string[]
  flattenedPngUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateFrameRequest {
  projectId: string
  index: number
  delayMs?: number
  included?: boolean
  layerIds?: string[]
  rawImageData?: string // base64 RLE data
}

export interface UpdateFrameRequest {
  index?: number
  delayMs?: number
  included?: boolean
  rawImageData?: string
}

// AI Generation Types
export interface AIGenerateRequest {
  prompt: string
  mode: 'new' | 'img2img'
  width: number
  height: number
  colorLimit: number
  referenceImageId?: string
  referenceImageData?: string // base64
  seed?: number
  enableDithering?: boolean
  quantizationMethod?: 'median-cut' | 'wu'
}

export interface AIGenerationResponse {
  assetId: string
  pngUrl: string
  palette: string[]
  width: number
  height: number
  colorCount: number
  processingTimeMs: number
}

export interface AIVariationsRequest {
  assetId?: string
  imageData?: string // base64
  count: number
  colorLimit: number
  width: number
  height: number
}

// GIF Export Types
export interface GifExportRequest {
  frameIds: string[]
  delays?: number[]
  globalDelayMs?: number
  loop?: boolean
  width?: number
  height?: number
  quality?: number
}

export interface GifExportResponse {
  gifUrl: string
  sizeBytes: number
  frameCount: number
  durationMs: number
  processingTimeMs: number
}

// Asset Types
export interface Asset {
  id: string
  userId: string | null
  type: AssetType
  originalUrl: string
  processedUrl?: string
  thumbUrl?: string
  width: number
  height: number
  sizeBytes: number
  mimeType: string
  palette?: string[]
  createdAt: string
  updatedAt: string
}

// Error Types
export interface ApiError {
  error: string
  message: string
  statusCode?: number
  timestamp?: string
  path?: string
  requestId?: string
}

// Response wrappers
export interface ProjectsResponse {
  projects: Project[]
  total: number
  limit: number
  offset: number
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  services: {
    database: 'healthy' | 'unhealthy'
    redis: 'healthy' | 'unhealthy'
    storage: 'healthy' | 'unhealthy'
    openai: 'healthy' | 'unhealthy'
  }
  metrics: {
    uptime: number
    memoryUsage: {
      used: number
      total: number
      percentage: number
    }
    requestCount: number
    averageResponseTime: number
  }
}

// Canvas/Drawing Types (frontend only)
export interface DrawingTool {
  id: string
  name: string
  icon: string
  cursor?: string
  shortcut?: string
}

export interface ColorPalette {
  id: string
  name: string
  colors: string[]
  isDefault: boolean
}

export interface PixelData {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface CanvasState {
  tool: string
  color: string
  brushSize: number
  zoom: number
  panX: number
  panY: number
}

export interface HistoryEntry {
  id: string
  action: string
  data: PixelData
  timestamp: number
}